import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import lean from "@/lib/lean-lang";

hljs.registerLanguage("lean", lean);
hljs.registerLanguage("bash", bash);

type Props = {
  code: string;
  language?: "lean" | "bash";
  /** Label shown in the editor title bar; defaults to "Lean" or "Terminal". */
  title?: string;
};

/** A code sample framed as an editor window, matching the Lean code card on
 * the Getting Started page. Token colours are set by `.code-editor` in
 * globals.css. */
export function CodeBlock({ code, language = "lean", title }: Props) {
  const highlighted = hljs.highlight(code.trim(), { language });
  const label = title ?? (language === "bash" ? "Terminal" : "Lean");
  return (
    <div className="rounded overflow-hidden bg-background border border-border shadow-together">
      <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-foreground/5">
        <span className="size-2.5 rounded-full bg-red-400/60" />
        <span className="size-2.5 rounded-full bg-yellow-400/60" />
        <span className="size-2.5 rounded-full bg-green-400/60" />
        <span className="ml-3 text-xs text-foreground/30 font-mono">{label}</span>
      </div>
      <pre className="code-editor bg-[#1e1e1e] p-4 md:p-5 overflow-x-auto text-[13px] font-mono text-[#d4d4d4] leading-relaxed">
        <code dangerouslySetInnerHTML={{ __html: highlighted.value }} />
      </pre>
    </div>
  );
}
