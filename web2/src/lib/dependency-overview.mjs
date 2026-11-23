// The build and browser use the exact displayed DOT (including labels and styles).
// This non-cryptographic cache key also works on plain HTTP development servers.
/** @param {string} dot */
export function overviewFilename(dot) {
  let hash = 2166136261;
  for (let i = 0; i < dot.length; i++) {
    hash = Math.imul(hash ^ dot.charCodeAt(i), 16777619);
  }
  return `overview-dag-${dot.length.toString(36)}-${(hash >>> 0).toString(16)}.svg`;
}
