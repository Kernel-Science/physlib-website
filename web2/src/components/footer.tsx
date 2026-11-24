import { Wordmark } from "@/components/wordmark";
import Link from "next/link";
import { navSections, site, type NavItem } from "@/lib/site";

const footerBody = "text-[13px] leading-normal font-normal tracking-[-0.01em] text-muted";

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
              className={`${footerBody} transition-colors hover:text-foreground`}
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
      <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-16">

        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-3 lg:grid-cols-[1.2fr_repeat(5,minmax(0,1fr))]">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link
              href="/"
              className="inline-block text-[22px] leading-none font-semibold tracking-[-0.04em] text-foreground transition-opacity hover:opacity-75"
            >
              <Wordmark />
            </Link>
            <p className={`mt-3 ${footerBody}`}>
              The definitive library for formalized physics in Lean 4.
            </p>
            <div className="mt-5">
              <FooterLinks items={physlibLinks} />
            </div>
          </div>

          {/* Link columns */}
          {navSections.map(({ label, items }) => (
            <div key={label}>
              <p className="label-mono text-muted mb-2 sm:mb-4">{label}</p>
              <FooterLinks items={items} />
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col gap-4 sm:mt-14 lg:flex-row lg:items-center lg:justify-between text-xs text-muted" style={{ letterSpacing: "-0.01em" }}>
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
            . <span className="whitespace-nowrap">Open-source, Apache 2.0.</span>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
            <p className="whitespace-nowrap">Physics in Lean 4</p>
            <div className="hidden sm:block w-px h-3 bg-foreground/20" />
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                Website supported by
                <a href="https://kernel-science.com" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
                  <img src="/images/kernel_science_logo.png" alt="Kernel Science" width={2852} height={410} className="logo-mark relative -top-[0.5px] h-3.5 w-auto" />
                </a>
              </span>
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

