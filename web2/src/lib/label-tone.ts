/**
 * The site's tag tones (see `.site-tag-*` in globals.css). Every label, chip
 * and status tag on the site uses one of these five, so the same kind of
 * thing looks the same on every page.
 */
export type TagTone = "neutral" | "accent" | "warning" | "success" | "danger";

/** The tone for a GitHub label, from what the label says. */
export function labelTone(name: string): TagTone {
  if (/^t-/.test(name)) return "accent"; // a physics topic
  if (/^(awaiting|blocked|wip$|rfc$)/i.test(name)) return "warning"; // held up
  if (/^(ready|reviewer-approved$)/i.test(name)) return "success"; // cleared to merge
  return "neutral";
}

export const tagClass = (tone: TagTone) => `site-tag site-tag-${tone}`;
