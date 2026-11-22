import { site } from "@/lib/site";

/** The Physlib text wordmark: used by the header and footer so they always match.
 *  The ħ bar lives only in the large hero logo; at this size it hurts legibility. */
export function Wordmark() {
  return (
    <>
      <span className="sr-only">{site.name}</span>
      <span aria-hidden="true">
        Phys<span className="font-mono text-accent/60">lib</span>
      </span>
    </>
  );
}
