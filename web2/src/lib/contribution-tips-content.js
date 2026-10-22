/** Parse the numbered tips and stable anchors shared by GitHub and the website. */
function parseContributionTips(markdown) {
  if (typeof markdown !== "string" || Buffer.byteLength(markdown, "utf8") > 1024 * 1024) {
    throw new Error("Contribution tips must be a Markdown document smaller than 1 MiB.");
  }
  const text = markdown.replace(/\r\n/g, "\n");
  if (!text.startsWith("# Contribution tips\n")) {
    throw new Error("Contribution tips must start with '# Contribution tips'.");
  }
  let fence = null;
  const outside = [];
  for (const line of text.split("\n")) {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      if (marker && marker[1][0] === fence[0] &&
          marker[1].length >= fence.length && !marker[2].trim()) fence = null;
    } else if (marker) {
      fence = marker[1];
    } else {
      outside.push(line);
    }
  }
  if (fence) throw new Error("Contribution tips contain an unclosed code block.");

  const sections = text.split(/\n(?=<a id=")/).slice(1);
  const headings = outside.filter((line) => /^## \d+\./.test(line));
  if (!sections.length || headings.length !== sections.length) {
    throw new Error("Every numbered tip needs a stable anchor and a heading.");
  }
  const ids = new Set();
  return sections.map((section, index) => {
    const match = /^<a id="([a-z0-9]+(?:-[a-z0-9]+)*)"><\/a>\s+## (\d+)\. ([^\n]+)\n([\s\S]*)$/.exec(section);
    if (!match || Number(match[2]) !== index + 1 || !match[4].trim()) {
      throw new Error("Tips need consecutive numbers, a title, and a nonempty body.");
    }
    if (ids.has(match[1])) throw new Error("Contribution tip anchors must be unique.");
    ids.add(match[1]);
    return { id: match[1], number: match[2], title: match[3], body: match[4].trim() };
  });
}

module.exports = { parseContributionTips };
