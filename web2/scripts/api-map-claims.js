// Physlib counts each adjacent run of [n]/[TODO] citations in a Content
// section as one claim. A run containing [TODO] is still unfinished even
// when it also has a citation. {n} denotes literature, not a Lean reference.
function paragraphsOf(text) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.split("\n").filter((line) => !/^#/.test(line)).join(" ").trim())
    .filter(Boolean);
}

function citedClaims(paragraph) {
  const text = paragraph.replace(/\{\s*\d+\s*\}/g, "");
  const claims = [];
  let lastEnd = 0;
  let run;
  for (const mark of text.matchAll(/\[(TODO|\d+(?:\s*,\s*\d+)*)\]/g)) {
    const prose = text.slice(lastEnd, mark.index).trim();
    if (!run || prose) {
      run = { done: true, citations: [], statement: prose.replace(/\s+/g, " ") };
      claims.push(run);
    }
    if (mark[1] === "TODO") run.done = false;
    else run.citations.push(...mark[1].split(",").map(Number));
    lastEnd = mark.index + mark[0].length;
  }
  return claims;
}

module.exports = { paragraphsOf, citedClaims };
