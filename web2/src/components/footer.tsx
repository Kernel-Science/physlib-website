import Link from "next/link";
import { site } from "@/lib/site";

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
    { label: "APIs", href: "/apis" },
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
                <GitHubIcon />
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

function GitHubIcon() {
  return (
    <svg className="size-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.27-.01-1.17-.02-2.13-3.2.7-3.88-1.36-3.88-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.45.11-3.02 0 0 .96-.31 3.15 1.18a10.93 10.93 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.57.23 2.73.11 3.02.74.8 1.18 1.83 1.18 3.09 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}
