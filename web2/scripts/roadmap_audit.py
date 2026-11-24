"""Index explicit Lean declaration commands from source text.

The Atlas generator uses this parser for the native Physlib, PhyslibAlpha and
QuantumInfo files. No toolchain, elaboration, or proof check is performed.
"""
import re

# Mask non-code before recognizing commands, preserving every original line.
# Keep escaped Lean identifiers («…»), including unicode and punctuation.
SPECIAL = re.compile(r'/-|--[^\n]*|r(#+)?"|"(?:\\[\s\S]|[^"\\])*"|«[^»\n]*»|@\[|[^\w]\'(?:\\.|[^\\\'\n])\'')
NESTED = re.compile(r'/-|-/')
NAME = r"(?:«[^»\n]+»|[^\W\d][\w'!?₀-₉]*)"
QUALIFIED = re.compile(NAME + r"(?:\." + NAME + r")*")
MODS = r"(?:(?:private|public|protected|noncomputable|partial|unsafe|local|scoped|nonrec|meta)\s+)*"
KIND = r"class[ \t]+inductive|theorem|lemma|def|abbrev|instance|structure|class|inductive|coinductive|opaque|axiom|constant|example|informal_definition|informal_lemma|semiformal_result"
COMMAND = re.compile(r"^([ \t]*)(?:" + MODS + r")(?P<kind>" + KIND + r"|namespace|section|mutual|end)\b[ \t]*(?P<tail>.*)$")
MARK = re.compile(r"(?<![\w.'])\b(sorry|admit)\b(?![\w'])")
ANON = re.compile(r"^(?:\([^()\n]*\)\s*)+")

def blank(text):
    return re.sub(r'[^\n]+', lambda m: ' ' * len(m[0]), text)

def strip_noncode(text):
    out, pos, start = [], 0, 0
    while (m := SPECIAL.search(text, pos)):
        token = m[0]
        end = m.end()
        if token.startswith("«"):
            pos = end
            continue
        if token == "/-":
            depth = 1
            for boundary in NESTED.finditer(text, end):
                depth += 1 if boundary[0] == "/-" else -1
                if not depth:
                    end = boundary.end()
                    break
            else:
                end = len(text)
        elif token.startswith("r") and token.endswith('"'):
            # Prefix r"…" / r#"…"# is only special at a token boundary.
            if m.start() and (text[m.start()-1].isalnum() or text[m.start()-1] == "_"):
                pos = m.start()+1
                continue
            closing = '"' + (m[1] or "")
            idx = text.find(closing, end)
            end = len(text) if idx < 0 else idx + len(closing)
        elif token == "@[":
            # Keep other syntax masking correct when attribute names contain strings.
            pos = end
            continue
        out.append(text[start:m.start()])
        out.append(blank(text[m.start():end]))
        pos = start = end
    out.append(text[start:])
    text = ''.join(out)
    # Attributes can be inline, e.g. @[simp] public theorem … . Balanced
    # brackets also handle forms such as @[simp (config := {…})].
    idx, start, out = 0, 0, []
    while (idx := text.find("@[", idx)) != -1:
        depth = 1
        end = idx+2
        for bracket in re.finditer(r"[\[\]]",text[end:]):
            depth += 1 if bracket[0] == "[" else -1
            if not depth:
                end += bracket.end()
                break
        else:
            break
        out.extend((text[start:idx], blank(text[idx:end])))
        idx = start = end
    out.append(text[start:])
    return ''.join(out)

DOC = re.compile(r"(?m)^[ \t]*#doc\b")
QUOTE = re.compile(r"\x60\(")
COMMAND_BOUNDARY = re.compile(r"^[ \t]*(?:#|(?:end|namespace|section|open|set_option|variable|universe|import|export|attribute|macro_rules|syntax|notation)\b)")

def structural_source(cleaned):
    # A Verso #doc body is a document, including prose and example code.
    doc = DOC.search(cleaned)
    if doc:
        cleaned = cleaned[:doc.start()]
    # Command quotations in macro implementations contain syntax data.
    out, start = [], 0
    while q := QUOTE.search(cleaned, start):
        depth, end = 1, q.end()
        for paren in re.finditer(r"[()]", cleaned[end:]):
            depth += 1 if paren[0] == "(" else -1
            if depth == 0:
                end += paren.end()
                break
        else:
            break
        out.extend((cleaned[start:q.start()], blank(cleaned[q.start():end])))
        start = end
    return "".join(out) + cleaned[start:]

def declarations(text):
    cleaned = structural_source(strip_noncode(text))
    lines = cleaned.splitlines()
    scopes, records = [], []
    for i, line in enumerate(lines):
        cmd = COMMAND.match(line)
        if not cmd:
            continue
        kind, tail = cmd["kind"], cmd["tail"]
        name = QUALIFIED.match(tail)
        name = name[0] if name else ""
        if kind in {"namespace","section","mutual"}:
            scopes.append((kind,name))
            continue
        if kind == "end":
            if name:
                hit = next((j for j in range(len(scopes)-1,-1,-1) if scopes[j][1] == name), None)
                if hit is not None:
                    del scopes[hit:]
            elif scopes:
                scopes.pop()
            continue
        kind = re.sub(r"\s+", " ", kind)
        if kind == "instance":
            # Lean allows a priority annotation between instance and the name.
            if tail.startswith("(priority"):
                n = QUALIFIED.match(ANON.sub("",tail))
                name = n[0] if n else ""
        if not name and kind not in {"example","instance"} and not tail.strip():
            for seq in lines[i+1:i+4]:
                if seq.strip():
                    n = QUALIFIED.match(seq.strip())
                    if n:
                        name = n[0]
                    break
        if kind == "example" or (kind == "instance" and name in {"where","with"}):
            name = ""
        if not name and kind not in {"example","instance"}:
            continue
        if not name:
            name = f"«anonymous {kind}»"
        name = (name[7:] if name.startswith("_root_.") else
                ".".join([*(v for k,v in scopes if k == "namespace" and v),name]))
        records.append((i,kind,name))
    # Place proof markers only in the recognized declaration span, and never
    # in comments, strings or a subsequent example/declaration.
    out = []
    file_markers = {m[1] for m in MARK.finditer(cleaned)}
    for ix,(i,kind,name) in enumerate(records):
        stop = records[ix+1][0] if ix+1 < len(records) else len(lines)
        flags = set()
        if file_markers:
            indent = len(lines[i]) - len(lines[i].lstrip())
            for j in range(i, stop):
                line = lines[j]
                if j != i and len(line)-len(line.lstrip()) <= indent and COMMAND_BOUNDARY.match(line):
                    break
                flags.update(m[1] for m in MARK.finditer(line))
        out.append((i+1,name,kind,int("sorry" in flags),int("admit" in flags)))
    return out, file_markers
