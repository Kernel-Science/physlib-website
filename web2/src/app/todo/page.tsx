import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/lib/site";
import { getTodo } from "@/lib/yaml";
import { TodoClient } from "./todo-client";

export const metadata: Metadata = {
  title: "TODO List",
  description:
    "Search Physlib’s Lean TODOs and open GitHub issues labeled TODO by subject and item type.",
};

export default async function TodoPage() {
  const data = await getTodo();
  const lastUpdated = data.generatedAt
    ? new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(new Date(data.generatedAt))
    : null;

  return (
    <div className="page-frame-tracker">
      <h1 className="page-title-tracker">TODO List</h1>
      <p className="page-intro-tracker mb-6">
        This list includes entries from Lean files and open Physlib issues labeled <code>TODO</code> on GitHub.
      </p>
      <p className="page-intro-tracker mb-1 text-sm">
        These entries are also listed under{" "}
        <Link href={`${site.tasks}?type=todo`} className="text-accent hover:underline underline-offset-2">
          Find a Task
        </Link>
        .
      </p>
      <p className="text-xs text-muted mb-6">
        {lastUpdated ? `Last updated: ${lastUpdated} UTC` : "Last updated: unknown"}
      </p>

      <TodoClient data={data} />
    </div>
  );
}
