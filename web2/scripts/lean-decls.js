/*
 * Extracts declarations (theorem/lemma/def/abbrev/instance/structure/
 * inductive/class/opaque/axiom) from Lean 4 source files, along with each
 * one's docstring and type signature.
 *
 * This parses *complete files*, never diff fragments. That distinction is the
 * whole design: to find what a month added, callers parse the full file at the
 * month's first commit and at its last commit and set-difference the two
 * results by fully-qualified name (see findAddedDeclarations). Parsing diff
 * hunks instead is what earlier versions of this tooling did, and it is
 * unreliable by construction - a hunk is an arbitrary window into the file, so
 * docstrings and signatures are routinely truncated mid-token, and an edit to
 * an existing proof looks identical to a brand-new declaration. It also can't
 * see past GitHub's compare API, which caps at 300 files and omits patches on
 * large diffs.
 *
 * The same whole-file-then-diff approach is what leanprover-community's own
 * mathlib-changelog crawler uses, and for the same stated reason: actually
 * elaborating Lean to get this information is far too slow to run over history.
 *
 * This is still a lexer, not a Lean parser - it does not resolve `open`,
 * macros, or elaboration. It is deliberately conservative.
 */

const crypto = require("node:crypto");

const DECL_KEYWORDS = [
  "theorem",
  "lemma",
  "def",
  "abbrev",
  "instance",
  "structure",
  "inductive",
  "class",
  "opaque",
  "axiom",
  // Physlib-specific declaration commands. These are genuine named results and
  // belong in the changelog. Note `TODO` is deliberately NOT here: its syntax
  // is `TODO "some free text"`, with no name at all, so treating it as a
  // declaration yields garbage names like `"Split` or `"Define`.
  "informal_definition",
  "informal_lemma",
  "semiformal_result",
];

// Bodies of these are field lists rather than a proof/term, so they have no
// `:=` to stop at - they run until the block dedents. The two `informal_*`
// commands take the same `name where` + indented-fields shape.
const BLOCK_BODY_KEYWORDS = new Set([
  "structure",
  "inductive",
  "class",
  "informal_definition",
  "informal_lemma",
]);

// `semiformal_result` puts a quoted tag before the name:
//   semiformal_result "FXNL5" restricted_isConnected {d : ℕ} : ...
// so the generic "first token after the keyword" rule would capture the tag.
const SEMIFORMAL_NAME_RE =
  /^semiformal_result\s+"(?:[^"\\]|\\.)*"\s*([^\s:({[⦃⟨]*)/;

const MOD =
  "(?:(?:private|protected|noncomputable|scoped|local|unsafe|partial|nonrec)\\s+)*";
const DECL_RE = new RegExp(
  `^${MOD}(${DECL_KEYWORDS.join("|")})\\b[ \\t]*([^\\s:({\\[⦃⟨]*)`,
);
const NAMESPACE_RE = /^(namespace|section)\b[ \t]*(\S*)/;
const END_RE = /^end\b[ \t]*(\S*)/;
const ATTR_RE = /^\s*@\[/;
// A line carrying nothing but declaration modifiers, as in
//   /-- doc -/
//   noncomputable
//   def foo ...
// `MOD` already covers modifiers sitting on the declaration's own line; this
// covers the same words when the author breaks them onto their own line, which
// otherwise hides the docstring above from the walk-back and truncates the
// signature below.
const MODIFIER_ONLY_RE =
  /^\s*(?:private|protected|noncomputable|scoped|local|unsafe|partial|nonrec)(?:\s+(?:private|protected|noncomputable|scoped|local|unsafe|partial|nonrec))*\s*$/;

const OPENERS = "([{⟨⦃";
const CLOSERS = ")]}⟩⦄";

// How far a single declaration's signature may reasonably run before we give
// up. Real signatures are a few lines; a large structure body can be longer.
const MAX_SIG_LINES = 40;
const MAX_BLOCK_LINES = 60;

/**
 * Blanks out `--` line comments and `/- -/` block comments while keeping line
 * numbering intact, and captures `/-- -/` docstrings separately.
 *
 * Returns { lines, docs } where `docs` maps the line index on which a
 * docstring *ended* to that docstring's text. Line numbering is preserved so
 * the caller can correlate the two.
 */
function stripComments(text) {
  const n = text.length;
  let i = 0;
  let line = 0;
  const out = [[]];
  const docs = new Map();

  function newline() {
    line += 1;
    out.push([]);
  }

  while (i < n) {
    const c = text[i];
    if (c === "\n") {
      newline();
      i += 1;
    } else if (c === '"') {
      // Copy string literals verbatim - a `--` or `/-` inside one is data,
      // not a comment.
      out[line].push(c);
      i += 1;
      while (i < n) {
        if (text[i] === "\\" && i + 1 < n) {
          out[line].push(text[i], text[i + 1]);
          i += 2;
        } else if (text[i] === "\n") {
          newline();
          i += 1;
        } else if (text[i] === '"') {
          out[line].push('"');
          i += 1;
          break;
        } else {
          out[line].push(text[i]);
          i += 1;
        }
      }
    } else if (text.startsWith("--", i)) {
      while (i < n && text[i] !== "\n") i += 1;
    } else if (text.startsWith("/--", i)) {
      i += 3;
      let depth = 1;
      const buf = [];
      while (i < n && depth > 0) {
        if (text.startsWith("/-", i)) {
          depth += 1;
          buf.push(text[i], text[i + 1]);
          i += 2;
        } else if (text.startsWith("-/", i)) {
          depth -= 1;
          if (depth === 0) {
            i += 2;
            break;
          }
          buf.push(text[i], text[i + 1]);
          i += 2;
        } else if (text[i] === "\n") {
          buf.push("\n");
          newline();
          i += 1;
        } else {
          buf.push(text[i]);
          i += 1;
        }
      }
      docs.set(line, buf.join("").trim());
    } else if (text.startsWith("/-", i)) {
      i += 2;
      let depth = 1;
      while (i < n && depth > 0) {
        if (text.startsWith("/-", i)) {
          depth += 1;
          i += 2;
        } else if (text.startsWith("-/", i)) {
          depth -= 1;
          i += 2;
        } else {
          if (text[i] === "\n") newline();
          i += 1;
        }
      }
    } else {
      out[line].push(c);
      i += 1;
    }
  }

  return { lines: out.map((chars) => chars.join("")), docs };
}

/**
 * Scans `line` for `needle` at bracket depth 0, tracking nesting and skipping
 * string literals. Returns { index, depth } with index -1 when not found.
 */
function findTopLevel(line, needle, depth) {
  let i = 0;
  const n = line.length;
  let found = -1;
  while (i < n) {
    const c = line[i];
    if (c === '"') {
      i += 1;
      while (i < n) {
        if (line[i] === "\\") {
          i += 2;
          continue;
        }
        if (line[i] === '"') {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    if (OPENERS.includes(c)) {
      depth += 1;
    } else if (CLOSERS.includes(c)) {
      depth = Math.max(0, depth - 1);
    } else if (found < 0 && depth === 0 && line.startsWith(needle, i)) {
      found = i;
    }
    i += 1;
  }
  return { index: found, depth };
}

/**
 * Collects the declaration's signature starting at `lines[start]`.
 *
 * For value declarations that is everything up to a top-level `:=` (or a
 * trailing `where`). For structure/inductive/class it is the header plus the
 * indented field block. Returns { text, next }.
 */
function signatureAt(lines, start, kind) {
  if (BLOCK_BODY_KEYWORDS.has(kind)) {
    const collected = [lines[start]];
    let j = start + 1;
    while (j < lines.length && j - start < MAX_BLOCK_LINES) {
      const nxt = lines[j];
      // Dedented back to top level: the block is over.
      if (nxt.trim() && !/\s/.test(nxt[0])) break;
      // Field docstrings were blanked out by stripComments, which would
      // otherwise leave the field list full of gaps.
      if (nxt.trim()) collected.push(nxt);
      j += 1;
    }
    while (collected.length && !collected[collected.length - 1].trim()) {
      collected.pop();
    }
    return { text: collected.join("\n"), next: j };
  }

  const collected = [];
  let depth = 0;
  let j = start;
  while (j < lines.length && j - start < MAX_SIG_LINES) {
    const line = lines[j];
    const res = findTopLevel(line, ":=", depth);
    depth = res.depth;
    if (res.index >= 0) {
      collected.push(line.slice(0, res.index).replace(/\s+$/, ""));
      j += 1;
      break;
    }
    collected.push(line);
    j += 1;
    if (/\bwhere\s*$/.test(line)) break;
    // A blank line at depth 0 means the signature ended without a `:=` (e.g.
    // `axiom`/`opaque`, or a declaration whose body follows a blank line) -
    // don't run on into whatever comes next.
    if (!line.trim() && depth === 0) break;
  }
  while (collected.length && !collected[collected.length - 1].trim()) {
    collected.pop();
  }
  return { text: collected.join("\n"), next: j };
}

/**
 * Parses a complete Lean source file into a Map of fully-qualified name →
 * { kind, name, doc, signature, line }. `line` is 1-based, for source links.
 */
function parseLean(contents) {
  const { lines, docs } = stripComments(contents);
  const scopes = []; // { kind, name } for namespace/section
  const result = new Map();

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || /\s/.test(line[0])) {
      i += 1;
      continue;
    }

    const scopeMatch = NAMESPACE_RE.exec(line);
    if (scopeMatch) {
      scopes.push({ kind: scopeMatch[1], name: scopeMatch[2] });
      i += 1;
      continue;
    }

    const endMatch = END_RE.exec(line);
    if (endMatch) {
      const name = endMatch[1];
      let matched = false;
      for (let k = scopes.length - 1; k >= 0; k--) {
        if (scopes[k].name === name) {
          scopes.length = k;
          matched = true;
          break;
        }
      }
      if (!matched && scopes.length && !name) scopes.pop();
      i += 1;
      continue;
    }

    const declMatch = DECL_RE.exec(line);
    if (!declMatch) {
      i += 1;
      continue;
    }

    const kind = declMatch[1];
    let rawName = declMatch[2];
    if (kind === "semiformal_result") {
      const m = SEMIFORMAL_NAME_RE.exec(line);
      rawName = m ? m[1] : "";
    }
    const sig = signatureAt(lines, i, kind);
    let signature = sig.text;

    // Walk back over attribute lines to find this declaration's docstring.
    // `docs` must be consulted at every step, not just at the end: extracting
    // a docstring blanks the lines it occupied, so a walk-back that skips
    // blank lines would step straight over it.
    let doc = null;
    let k = i - 1;
    while (k >= 0) {
      if (docs.has(k)) {
        doc = docs.get(k);
        break;
      }
      if (
        !lines[k].trim() ||
        ATTR_RE.test(lines[k]) ||
        MODIFIER_ONLY_RE.test(lines[k])
      ) {
        k -= 1;
        continue;
      }
      break;
    }

    const namespaces = scopes
      .filter((s) => s.kind === "namespace" && s.name)
      .map((s) => s.name);
    let full;
    if (rawName.startsWith("_root_.")) {
      full = rawName.slice("_root_.".length);
    } else if (rawName) {
      full = [...namespaces, rawName].join(".");
    } else {
      // Anonymous instance - synthesise a key from its signature so two
      // different anonymous instances don't collide. Must be a stable digest,
      // not a per-process hash: a key that varies between the "old commit"
      // and "new commit" parses would make every anonymous instance look
      // newly added every month.
      const digest = crypto
        .createHash("md5")
        .update(signature)
        .digest("hex")
        .slice(0, 8);
      full = [...namespaces, `«${kind}@${digest}»`].join(".");
    }

    // Re-attach any attribute or modifier lines directly above; they're part
    // of how the declaration reads, and dropping a lone `noncomputable` would
    // print a signature that isn't the one in the file.
    const attrs = [];
    let a = i - 1;
    while (a >= 0 && (ATTR_RE.test(lines[a]) || MODIFIER_ONLY_RE.test(lines[a]))) {
      attrs.unshift(lines[a].replace(/\s+$/, ""));
      a -= 1;
    }
    if (attrs.length) signature = [...attrs, signature].join("\n");

    result.set(full, {
      kind,
      name: full,
      doc,
      signature: signature.trim(),
      line: i + 1,
    });

    i = Math.max(sig.next, i + 1);
  }

  return result;
}

/**
 * Declarations present in `newContents` but absent from `oldContents`,
 * compared by fully-qualified name. Pass null/undefined for `oldContents`
 * when the file is new.
 */
function findAddedDeclarations(oldContents, newContents) {
  const oldDecls = oldContents ? parseLean(oldContents) : new Map();
  const newDecls = parseLean(newContents);
  const added = [];
  for (const [name, decl] of newDecls) {
    if (!oldDecls.has(name)) added.push(decl);
  }
  return added;
}

module.exports = { parseLean, findAddedDeclarations, DECL_KEYWORDS };
