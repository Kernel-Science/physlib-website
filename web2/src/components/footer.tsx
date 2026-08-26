import Link from "next/link";
import { site } from "@/lib/site";
import { GitHubIcon } from "@/components/monthly-updates/icons";

const footerLinks = {
  About: [
    { label: "Overview", href: "/about" },
    { label: "Mission", href: "/about/mission" },
    { label: "Values", href: "/about/values" },
    { label: "Impact", href: "/about/impact" },
    { label: "Maintainers", href: "/maintainers" },
  ],
  Learn: [
    { label: "Getting Started", href: "/getting-started" },
    { label: "Project Ideas", href: "/project-ideas" },
  ],
  Community: [
    { label: "Get Involved", href: "/get-involved" },
    { label: "Todo list", href: "/todo" },
    { label: "Discussion", href: site.zulip, external: true },
  ],
  Explore: [
    { label: "Dependency Graphs", href: "/dependencies" },
    { label: "Search Physlib", href: site.search, external: true },
    { label: "GitHub", href: site.github, external: true },
    { label: "Website Source", href: site.websiteRepo, external: true },
  ],
  Support: [
    { label: "Sponsor", href: "/sponsor" },
    { label: "API Tracker", href: "/api-tracker" },
    { label: "PR Triage", href: "/pr-tracker" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-surface-secondary border-t border-border">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 py-16">

        {/* Large watermark wordmark */}
        <p
          className="text-5xl sm:text-7xl font-medium md:text-8xl mb-14 text-foreground/[0.07] select-none"
          style={{ letterSpacing: "-0.06em" }}
        >
          Physlib
        </p>

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-6">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link
              href="/"
              className="text-sm font-medium text-foreground transition-opacity hover:opacity-70"
              style={{ letterSpacing: "-0.01em" }}
            >
              {site.name}
            </Link>
            <p
              className="mt-3 text-xs text-muted leading-relaxed"
              style={{ letterSpacing: "-0.01em" }}
            >
              The definitive library for formalized physics in Lean 4.
            </p>
            <div className="mt-5 flex gap-3">
              <a
                href={site.github}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="text-muted transition-opacity hover:text-foreground"
              >
                <GitHubIcon className="size-5" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([group, items]) => (
            <div key={group}>
              <p className="label-mono text-muted mb-4">{group}</p>
              <ul className="space-y-2.5">
                {items.map((item) =>
                  "external" in item && item.external ? (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted transition-colors hover:text-foreground"
                        style={{ letterSpacing: "-0.01em" }}
                      >
                        {item.label} ↗
                      </a>
                    </li>
                  ) : (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-sm text-muted transition-colors hover:text-foreground"
                        style={{ letterSpacing: "-0.01em" }}
                      >
                        {item.label}
                      </Link>
                    </li>
                  )
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-border flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs text-foreground/30" style={{ letterSpacing: "-0.01em" }}>
          <p>
            Maintained by the{" "}
            <a
              href={site.github}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground/60 transition-colors"
            >
              leanprover-community
            </a>
            . Open-source, Apache 2.0.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <p>Physics in Lean 4</p>
            <div className="hidden sm:block w-px h-3 bg-foreground/20" />
            <div className="flex items-center gap-2">
              <span>Website by</span>
              <a href="https://kernel-science.com" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
                <img src="/images/kernel_science_logo.png" alt="Kernel Science" className="h-4 w-auto" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

