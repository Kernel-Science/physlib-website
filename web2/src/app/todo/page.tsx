import type { Metadata } from "next";
import { getTodo } from "@/lib/yaml";
import { TodoClient } from "./todo-client";

export const metadata: Metadata = {
  title: "TODO List | Physlib",
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
    <div className="mx-auto w-full max-w-5xl px-4 py-10 md:py-14">
      <h1 className="mb-2 text-4xl font-bold tracking-tight">TODO List</h1>
      <p className="mb-1 leading-relaxed text-muted">
        This list includes entries from Lean files and open Physlib issues labeled <code>TODO</code> on GitHub.
      </p>
      <p className="text-xs text-muted mb-6">
        {lastUpdated ? `Last updated: ${lastUpdated} UTC` : "Last updated: unknown"}
      </p>

      <TodoClient data={data} />
    </div>
  );
}
