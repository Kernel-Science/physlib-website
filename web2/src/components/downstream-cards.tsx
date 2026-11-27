import type { DownstreamGroup, DownstreamProject } from "@/lib/yaml";
import { ScrollRow } from "./scroll-row";

/*
 * Projects that build on Physlib, one horizontally scrolling row of cards per
 * group. Each card is one link to the project; any further evidence links sit
 * above that link so they stay clickable on their own.
 */

function ProjectCard({ item }: { item: DownstreamProject }) {
  return (
    <li className="group relative flex w-64 shrink-0 snap-start flex-col rounded-xl border border-border bg-surface p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-md sm:w-72">
      <p className="label-mono text-accent/70">{item.org}</p>
      <a
        href={item.url}
        className="mt-2 text-lg font-medium leading-snug text-foreground after:absolute after:inset-0 after:rounded-xl group-hover:text-accent focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-accent"
        style={{ letterSpacing: "-0.02em" }}
      >
        {item.name}
        <span
          aria-hidden="true"
          className="ml-1 inline-block text-sm text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
        >
          ↗
        </span>
      </a>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-foreground/75">
        {item.summary}
      </p>
      {item.uses && item.uses.length > 0 && (
        <p className="mt-4 text-xs leading-relaxed text-muted">
          <span className="font-medium text-foreground/70">Uses: </span>
          {item.uses.join(" · ")}
        </p>
      )}
      {item.links && item.links.length > 0 && (
        <p className="relative z-10 mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-border pt-3 text-xs">
          {item.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              className="text-accent hover:underline underline-offset-2"
            >
              {link.label} ↗
            </a>
          ))}
        </p>
      )}
    </li>
  );
}

export function DownstreamCards({ groups }: { groups: DownstreamGroup[] }) {
  return (
    <div className="not-prose my-8 flex flex-col gap-10">
      {groups.map((group) => (
        <ScrollRow key={group.title} label={group.title}>
          {group.items.map((item) => (
            <ProjectCard key={item.url} item={item} />
          ))}
        </ScrollRow>
      ))}
    </div>
  );
}
