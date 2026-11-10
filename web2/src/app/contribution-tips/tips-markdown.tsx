import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/code-block";

/** Render tips using the site's existing code blocks without a global code theme. */
export function TipsMarkdown({ children }: { children: string }) {
  return (
    <div className="prose-physlib text-sm" style={{ letterSpacing: "-0.01em", color: "color-mix(in srgb, var(--foreground) 70%, var(--accent))" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ children }) => <>{children}</>,
          code: ({ className, children }) => {
            const code = String(children);
            const language = /language-(\w+)/.exec(className ?? "")?.[1];
            if (language === "lean" || language === "bash") {
              return <CodeBlock code={code} language={language} />;
            }
            if (language || code.includes("\n")) {
              return <pre><code className={className}>{children}</code></pre>;
            }
            return <code>{children}</code>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
