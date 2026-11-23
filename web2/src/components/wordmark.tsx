import { site } from "@/lib/site";

/** The Physlib text wordmark: used by the header and footer so they always match.
 *  The hbar and the diagram live only in the large hero logo; at this size they hurt legibility. */
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
