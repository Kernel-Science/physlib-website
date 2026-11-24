import type { Metadata } from "next";
import Link from "next/link";
import { getFindTasks } from "@/lib/find-tasks";
import { site } from "@/lib/site";
import { TaskList } from "./task-list";

export const metadata: Metadata = {
  title: "Find a Task",
  description: "Search open GitHub issues, Lean TODOs, documentation tasks, and API map tasks in Physlib.",
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string | string[];
    q?: string | string[];
    subfield?: string | string[];
    unassigned?: string | string[];
  }>;
}) {
  const [data, filters] = await Promise.all([getFindTasks(), searchParams]);

  return (
    <div className="page-frame-tracker max-w-4xl">
      <p className="label-mono text-muted mb-5">Contribute</p>
      <h1 className="page-title-tracker">Find a Task</h1>
      <p className="page-intro-tracker mb-3">
        Find GitHub issues, unfinished work marked in Lean files, and tasks for documentation and API maps.{" "}
        <Link href="/ai-resources#task-discovery" className="text-accent hover:underline underline-offset-2">
          Connect an AI assistant
        </Link>{" or "}
        <a href="/api/tasks" className="text-accent hover:underline underline-offset-2">get the task list as JSON</a>.
      </p>
      <p className="page-intro-tracker mb-7">
        If you are new, start with{" "}
        <Link href="/getting-started#installing" className="text-accent hover:underline underline-offset-2">Getting Started</Link>
        {" "}and the{" "}
        <Link href="/gh-guide#work-on-the-problem" className="text-accent hover:underline underline-offset-2">GitHub Guide</Link>
        , or{" "}
        <a href={site.zulip} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline underline-offset-2">ask on Zulip ↗</a>.
      </p>
      <h2 id="browse-tasks" className="mb-3 text-xl font-semibold scroll-mt-24">Browse tasks</h2>
      <TaskList
        {...data}
        initialType={typeof filters.type === "string" ? filters.type : undefined}
        initialQuery={typeof filters.q === "string" ? filters.q : undefined}
        initialSubfield={typeof filters.subfield === "string" ? filters.subfield : undefined}
        initialUnassigned={filters.unassigned === "1"}
      />

      <h2 id="next-steps" className="mt-10 mb-3 text-xl font-semibold scroll-mt-24">Next steps</h2>
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <li><Link href="/gh-guide#make-a-pull-request" className="text-accent hover:underline underline-offset-2">Open a pull request</Link></li>
        <li><Link href="/pr-tracker" className="text-accent hover:underline underline-offset-2">See the PR queue</Link></li>
        <li><Link href="/project-ideas" className="text-accent hover:underline underline-offset-2">Browse larger project ideas</Link></li>
        <li><a href={site.zulip} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline underline-offset-2">Discuss on Zulip ↗</a></li>
      </ul>

    </div>
  );
}
