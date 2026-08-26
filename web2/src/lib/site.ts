export const site = {
  name: "Physlib",
  title: "Physlib: Digitalizing Physics in Lean 4",
  description:
    "An open-source community project to digitalize results from physics into Lean 4. Formerly PhysLean & Lean-QuantumInfo.",
  url: "https://physlib.io",
  github: "https://github.com/leanprover-community/physlib",
  websiteRepo: "https://github.com/Kernel-Science/physlib-website",
  zulip: "https://leanprover.zulipchat.com/#narrow/channel/479953-physlib",
  search: "https://physlibsearch.net",
  docs: "/docs/index.html",
  // Same report the "/reviews" Zulip bot command sends - see
  // https://github.com/Alex-Zughaid/PhyslibBots (zulip-dm-bots/src/index.js)
  reportApi: "https://zulip-dm-relay.alexzughaid.workers.dev/report",
};

export type NavItem = {
  label: string;
  href: string;
  external?: boolean;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    label: "Basics",
    items: [
      { label: "Home", href: "/" },
      { label: "Getting Started", href: "/getting-started" },
      { label: "Discussion", href: site.zulip, external: true },
    ],
  },
  {
    label: "About",
    items: [
      { label: "Overview", href: "/about" },
      { label: "Mission", href: "/about/mission" },
      { label: "Values", href: "/about/values" },
      { label: "Beneficiaries", href: "/about/beneficiaries" },
      { label: "Impact", href: "/about/impact" },
      { label: "Maintainers", href: "/maintainers" },
    ],
  },
  {
    label: "Goal trackers",
    items: [
      { label: "API development", href: "/api-tracker" },
      { label: "PR triage", href: "/pr-tracker" },
      { label: "Documentation", href: "/documentation-tracker" },
      { label: "TODO list", href: "/todo" },
      { label: "Monthly updates", href: "/monthly-updates" },
    ],
  },
  {
    label: "Get involved",
    items: [
      { label: "Project ideas", href: "/project-ideas" },
      { label: "Ways to contribute", href: "/get-involved" },
      { label: "Guide to contributing via GitHub", href: "/gh-guide" },
    ],
  },
  {
    label: "Explore",
    items: [
      { label: "Dependency graphs", href: "/dependencies" },
      { label: "Search Physlib", href: site.search, external: true },
    ],
  },
  {
    label: "Support",
    items: [{ label: "Sponsor", href: "/sponsor" }],
  },
];

export const primaryNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Getting Started", href: "/getting-started" },
  { label: "Get Involved", href: "/get-involved" },
  { label: "Trackers", href: "/api-tracker" },
  { label: "Todo list", href: "/todo" },
  { label: "Sponsor", href: "/sponsor" },
];
