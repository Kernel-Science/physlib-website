import type { EditOperation } from "@/lib/api-map-article";

/**
 * The GitHub issues the API map pages file, in a format a bot can apply as
 * well as a person can read: api-map-edit v1.
 *
 * - The body opens with a hidden comment holding a JSON header:
 *
 *     <!-- api-map-edit
 *     {"format":"api-map-edit","version":1,"file":"Physlib/…/API-map.md",
 *      "commit":"<sha>","op":"replace-subsection","section":"Content (Alpha)",
 *      "subsection":"Units of time","baseSha256":"<hex>","newReferences":1}
 *     -->
 *
 *   `op` and the fields beside it are an `EditOperation` (api-map-article.ts).
 *   `commit` is the Physlib commit the site read the map at, and
 *   `baseSha256` the SHA-256 of the text being replaced as it was there,
 *   normalized by `normalizeForHash` (trimmed, runs of blank lines
 *   collapsed to one, UTF-8) -
 *   so a bot can tell whether the file has moved on since. Both are absent
 *   when there is no prior text (a new section or a new file).
 * - The new text is the fenced block straight after the marker
 *   `<!-- api-map-edit:text -->`. For `replace-abstract` it is the body
 *   only; for the other replacements and `add-subsection` it starts at the
 *   heading; for `create-file` it is the whole file.
 * - New literature references, if any, are the numbered lines of the fenced
 *   block after `<!-- api-map-edit:references -->`, to be appended to
 *   `## References` in that order.
 * - Everything else - the summary, the diff - is for people, and may be
 *   left out when the issue would be too long to prefill.
 */

export const ISSUE_FORMAT = "api-map-edit";
export const ISSUE_FORMAT_VERSION = 1;

/** A literature reference added with the edit, cited in it as `{index}`. */
export type NewReference = { index: number; text: string };

/** What the editor knows when it files the issue. */
export type IssueContent = {
  text: string;
  summary: string;
  /** Unified diff for people; empty when there is no prior text. */
  diff: string;
  newReferences: NewReference[];
  /** False asks for the body without the diff, to fit in a URL. */
  withDiff: boolean;
};

export type IssueDraft = {
  title: string;
  body: (content: IssueContent) => string;
};

/** A fenced block, its fence longer than any run of backticks inside. */
export function fence(lang: string, text: string): string {
  const longest = Math.max(2, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
  const f = "`".repeat(longest + 1);
  return `${f}${lang}\n${text}\n${f}`;
}

/**
 * SHA-256 of a string's UTF-8 bytes, as hex. Synchronous on purpose: the
 * issue is opened with window.open straight from the click, and an `await`
 * before it (crypto.subtle is async-only) gets the tab blocked as a popup in
 * some browsers.
 */
export function sha256(text: string): string {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const bytes = new TextEncoder().encode(text);
  // Message, a 1 bit, zero padding, and the bit length as 64 bits.
  const blocks = Math.ceil((bytes.length + 9) / 64);
  const data = new Uint8Array(blocks * 64);
  data.set(bytes);
  data[bytes.length] = 0x80;
  const view = new DataView(data.buffer);
  view.setUint32(data.length - 8, Math.floor((bytes.length * 8) / 2 ** 32));
  view.setUint32(data.length - 4, (bytes.length * 8) >>> 0);
  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let b = 0; b < blocks; b++) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(b * 64 + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = w[i - 16] + s0 + w[i - 7] + s1;
    }
    let [a, bb, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = bb;
      bb = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] += a;
    h[1] += bb;
    h[2] += c;
    h[3] += d;
    h[4] += e;
    h[5] += f;
    h[6] += g;
    h[7] += hh;
  }
  return [...h].map((x) => x.toString(16).padStart(8, "0")).join("");
}

/** The form of a text `baseSha256` is taken of: trimmed, with runs of
 *  blank lines collapsed to one. The site rebuilds sections from their
 *  parsed parts, so this is what both it and a bot reading the file agree
 *  on. */
export function normalizeForHash(text: string): string {
  return text
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** The JSON header, safe inside an HTML comment. */
function header(fields: Record<string, unknown>): string {
  const json = JSON.stringify(fields).replace(/--/g, "-\\u002d");
  return `<!-- ${ISSUE_FORMAT}\n${json}\n-->`;
}

/**
 * An issue for one suggested change to an API map.
 *
 * `heading` and `facts` are the human-readable top of the issue; `base` is
 * the text being replaced, or null when there is none.
 */
export function apiMapIssue({
  title,
  heading,
  facts,
  file,
  commit,
  operation,
  base,
}: {
  title: string;
  heading: string;
  facts: string[];
  file: string;
  commit: string;
  operation: EditOperation;
  base: string | null;
}): IssueDraft {
  return {
    title,
    body: ({ text, summary, diff, newReferences, withDiff }) => {
      const baseSha256 = base === null ? null : sha256(normalizeForHash(base));
      return [
        header({
          format: ISSUE_FORMAT,
          version: ISSUE_FORMAT_VERSION,
          file,
          ...(base === null ? {} : { commit }),
          ...operation,
          ...(baseSha256 ? { baseSha256 } : {}),
          newReferences: newReferences.length,
        }),
        `### ${heading}`,
        "",
        ...facts,
        "",
        "### Summary",
        "",
        summary.trim() || "_Not given._",
        "",
        ...(withDiff && diff ? ["### Changes", "", fence("diff", diff), ""] : []),
        "### Suggested text",
        "",
        `<!-- ${ISSUE_FORMAT}:text -->`,
        fence("markdown", text.trim()),
        "",
        ...(newReferences.length > 0
          ? [
              "### New references",
              "",
              "To be added at the end of `## References`:",
              "",
              `<!-- ${ISSUE_FORMAT}:references -->`,
              fence("markdown", newReferences.map((r) => `${r.index}. ${r.text}`).join("\n")),
              "",
            ]
          : []),
        "---",
        "",
        "_If this suggestion is accepted, please credit the issue author as a " +
          "co-author of the change (`Co-authored-by:`)._",
        "",
        `*Suggested from the API map pages of the Physlib website, in the ` +
          `machine-readable ${ISSUE_FORMAT} v${ISSUE_FORMAT_VERSION} format.*`,
        "",
      ].join("\n");
    },
  };
}
