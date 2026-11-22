import type { Metadata } from "next";
import { Markdown } from "@/components/markdown";
import { getNews } from "@/lib/yaml";

export const metadata: Metadata = {
  title: "News | Physlib",
  description: "The latest news and updates from the Physlib project.",
};

export default async function NewsPage() {
  const items = await getNews();

  return (
    <div className="page-frame-editorial">
      <p className="label-mono text-muted mb-5">Updates</p>
      <h1 className="page-title-editorial">
        News
      </h1>
      <p className="page-intro-editorial mb-10">
        An attempt will be made to keep this feed up to date.
      </p>

      <div className="rounded border border-border overflow-hidden">
        <div className="grid grid-cols-[auto_1fr] bg-surface-secondary text-sm font-medium">
          <div className="px-4 py-3 border-b border-border w-28" style={{ letterSpacing: "-0.01em" }}>Date</div>
          <div className="px-4 py-3 border-b border-border border-l" style={{ letterSpacing: "-0.01em" }}>Content</div>
        </div>
        {items.map((item, i) => (
          <div
            key={i}
            className="grid grid-cols-[auto_1fr] text-sm border-b border-border last:border-0 hover:bg-surface-secondary/50 transition-colors"
          >
            <div className="px-4 py-3 text-muted font-mono text-xs w-28 flex items-start pt-3.5">
              {item.date}
            </div>
            <div className="px-4 py-2 border-l border-border prose-physlib text-xs leading-relaxed">
              <Markdown>{item.content}</Markdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
