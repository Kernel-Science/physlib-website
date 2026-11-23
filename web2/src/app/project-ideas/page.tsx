import type { Metadata } from "next";
import Link from "next/link";
import { getProjectIdeas, MIN_LEAN_FILES, type ProjectIdea } from "@/lib/project-ideas";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Project Ideas",
  description:
    "Physics topics in Physlib with claims still to formalize in Lean 4.",
};

const linkClass = "text-accent hover:underline underline-offset-2";

function IdeaCard({ idea }: { idea: ProjectIdea }) {
  const left = idea.claims - idea.formalized;
  const percent = Math.round((idea.formalized / idea.claims) * 100);
  return (
    <li className="flex flex-col rounded-(--radius) border border-border bg-surface px-5 py-4">
      <p className="label-mono text-muted">{idea.area}</p>
      <h3 className="mt-2 text-lg font-medium text-foreground" style={{ letterSpacing: "-0.025em" }}>
        <Link href={`/api-tracker#${idea.path}`} className="hover:text-accent">
          {idea.title}
        </Link>
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">{idea.summary}</p>

      <div className="mt-auto pt-4">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={idea.claims}
          aria-valuenow={idea.formalized}
          aria-label={`${idea.formalized} of ${idea.claims} claims formalized`}
          className="h-1.5 overflow-hidden rounded-full bg-surface-secondary"
        >
          <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-sm text-foreground">
          <span className="font-medium tabular-nums">{left}</span> of{" "}
          <span className="tabular-nums">{idea.claims}</span> claims left to formalize
        </p>
        <p className="mt-2 text-sm">
          <Link href={`/api-tracker#${idea.path}`} className={linkClass}>
            Read the map
          </Link>
        </p>
      </div>
    </li>
  );
}

export default async function ProjectIdeasPage() {
  const { groups, proposed, total, roadmapCount, unmapped, goodFirstIssues } = await getProjectIdeas();

  return (
    <div className="page-frame-tracker">
      <p className="label-mono text-muted mb-5">Contribute</p>
      <h1 className="page-title-tracker">Project Ideas</h1>
      <p className="page-intro-tracker mb-3">
        Physics topics with claims still to formalize. This page lists whole topics;{" "}
        <Link href={site.tasks} className={linkClass}>
          Find a Task
        </Link>{" "}
        lists individual tasks.
      </p>
      <p className="page-intro-tracker mb-10">
        {total} of {roadmapCount} API maps list claims still to formalize.{" "}
        {unmapped.length > 0 && <>This page also highlights {unmapped.length} areas for a new map.{" "}</>}
        <Link href="/api-tracker" className={linkClass}>
          See every topic
        </Link>
        .
        {goodFirstIssues > 0 && (
          <>
            {" "}
            For something smaller, see the{" "}
            <Link href={`${site.tasks}?q=${encodeURIComponent("good first issue")}`} className={linkClass}>
              good first issues
            </Link>
            .
          </>
        )}
      </p>

      {proposed.length > 0 && (
        <section className="mb-12">
          <h2 id="proposed" className="text-2xl font-medium text-foreground scroll-mt-24" style={{ letterSpacing: "-0.04em" }}>
            Labeled issues
          </h2>
          <p className="mt-1 mb-4 text-sm text-muted">Issues with the project-idea label.</p>
          <ul className="flex flex-col gap-2">
            {proposed.map((task) => (
              <li key={task.id} className="rounded-(--radius) border border-border bg-surface px-5 py-4">
                <a href={task.href} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-accent">
                  {task.title} ↗
                </a>
                {task.detail && <p className="mt-1 text-sm leading-relaxed text-muted">{task.detail}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {groups.map((group) => (
        <section key={group.key} className="mb-12">
          <h2 id={group.key} className="text-2xl font-medium text-foreground scroll-mt-24" style={{ letterSpacing: "-0.04em" }}>
            {group.label}
          </h2>
          <p className="mt-1 mb-4 text-sm text-muted">
            {group.total} topics
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {group.ideas.map((idea) => (
              <IdeaCard key={idea.path} idea={idea} />
            ))}
          </ul>
        </section>
      ))}

      {unmapped.length > 0 && (
        <section className="mb-12">
          <h2 id="no-roadmap" className="text-2xl font-medium text-foreground scroll-mt-24" style={{ letterSpacing: "-0.04em" }}>
            No roadmap yet
          </h2>
          <p className="mt-1 mb-4 text-sm text-muted">
            These {unmapped.length} areas each have at least {MIN_LEAN_FILES} Lean files and no API map in the directory, its parents, or its subdirectories.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unmapped.map((area) => (
              <li key={area.path} className="rounded-(--radius) border border-border bg-surface px-5 py-4">
                <p className="label-mono text-muted">{area.area}</p>
                <h3 className="mt-2 text-lg font-medium text-foreground" style={{ letterSpacing: "-0.025em" }}>
                  {area.title}
                </h3>
                <p className="mt-1 text-sm text-muted">
                  <span className="tabular-nums">{area.leanFiles}</span> Lean files
                </p>
                <p className="mt-2 text-sm">
                  <Link
                    href={`/api-tracker/new?path=${encodeURIComponent(area.path)}&title=${encodeURIComponent(area.title)}`}
                    className={linkClass}
                  >
                    Write the roadmap
                  </Link>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

    </div>
  );
}
