import { Wordmark } from "@/components/wordmark";
import Link from "next/link";
import { navSections, site, type NavItem } from "@/lib/site";

const physlibLinks: NavItem[] = [
  { label: "GitHub", href: site.github, external: true },
  { label: "PhyslibSearch", href: site.semanticSearch, external: true },
  { label: "Website Source", href: site.websiteRepo, external: true },
];

function FooterLinks({ items }: { items: NavItem[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const ItemLink = item.external || item.href.includes("#") ? "a" : Link;
        return (
          <li key={item.href}>
            <ItemLink
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              className="text-[13px] text-muted transition-colors hover:text-foreground"
              style={{ letterSpacing: "-0.01em" }}
            >
              {item.label}{item.external && " ↗"}
            </ItemLink>
          </li>
        );
      })}
    </ul>
  );
}

export function Footer() {
  return (
    <footer className="bg-surface-secondary border-t border-border">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 py-16">

        <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[1.2fr_repeat(5,minmax(0,1fr))]">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link
              href="/"
              className="inline-block text-[22px] leading-none font-semibold tracking-[-0.04em] text-foreground transition-opacity hover:opacity-75"
            >
              <Wordmark />
            </Link>
            <p
              className="mt-3 text-xs text-muted leading-relaxed"
              style={{ letterSpacing: "-0.01em" }}
            >
              The definitive library for formalized physics in Lean 4.
            </p>
            <div className="mt-5">
              <FooterLinks items={physlibLinks} />
            </div>
          </div>

          {/* Link columns */}
          {navSections.map(({ label, items }) => (
            <div key={label}>
              <p className="label-mono text-muted mb-4">{label}</p>
              <FooterLinks items={items} />
            </div>
          ))}
        </div>

        <div className="mt-14 pt-6 border-t border-border flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs text-muted" style={{ letterSpacing: "-0.01em" }}>
          <p>
            Maintained by the{" "}
            <a
              href={site.github}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
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
                <img src="/images/kernel_science_logo.png" alt="Kernel Science" className="logo-mark h-4 w-auto" />
              </a>
              <span>
                and{" "}
                <Link
                  href={site.team}
                  className="hover:text-foreground transition-colors"
                >
                  contributors like you
                </Link>
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

