export const site = {
  name: "Physlib",
  title: "Physlib: Digitalizing Physics in Lean 4",
  description:
    "An open-source community project to digitalize results from physics into Lean 4. Formerly PhysLean & Lean-QuantumInfo.",
  url: "https://physlib.io",
  github: "https://github.com/leanprover-community/physlib",
  websiteRepo: "https://github.com/Kernel-Science/physlib-website",
  zulip: "https://leanprover.zulipchat.com/#narrow/channel/479953-physlib",
  search: "/search",
  semanticSearch: "https://physlibsearch.net",
  // Signed Open Badges 3.0 reports for contributions to Physlib.
  contributions: "https://contributions.physlib.io",
  docs: "/docs/index.html",
  sponsor: "/sponsor",
  sponsors: "/sponsors",
  team: "/team",
  tasks: "/tasks",
  feedback: "/feedback",
  documentationGuide: "/documentation-guide",
  aiResources: "/ai-resources",
  // Same report the "/reviews" Zulip bot command sends - see
  // https://github.com/Alex-Zughaid/PhyslibBots (zulip-dm-bots/src/index.js)
  reportApi: "https://zulip-dm-relay.alexzughaid.workers.dev/report",
};

export function todoTaskHref(tag: string) {
  const encoded = encodeURIComponent(tag);
  return `${site.tasks}?type=todo&q=${encoded}#${encoded}`;
}

export type NavItem = {
  label: string;
  href: string;
  external?: boolean;
};

export type NavSection = {
  label: string;
  items: NavItem[];
  plainHover?: boolean;
};

export const navSections: NavSection[] = [
  {
    label: "Explore",
    items: [
      { label: "Physlib Atlas", href: "/roadmap" },
      { label: "API Maps", href: "/api-maps" },
      { label: "Documentation", href: site.docs },
      { label: "Dependency Graphs", href: "/dependencies" },
      { label: "References", href: "/references" },
    ],
  },
  {
    label: "Learn",
    items: [
      { label: "Ways to Contribute", href: "/get-involved" },
      { label: "Getting Started", href: "/getting-started" },
      { label: "GitHub Guide", href: "/gh-guide" },
      { label: "AI Resources", href: site.aiResources },
    ],
  },
  {
    label: "Contribute",
    items: [
      { label: "Project Ideas", href: "/project-ideas" },
      { label: "Find a Task", href: site.tasks },
      { label: "PR Queue", href: "/pr-tracker" },
      { label: "Discussion", href: site.zulip, external: true },
    ],
  },
  {
    label: "About",
    items: [
      { label: "Overview", href: "/about" },
      { label: "Our Team", href: site.team },
      { label: "Monthly Updates", href: "/monthly-updates" },
    ],
  },
  {
    label: "Support",
    plainHover: true,
    items: [
      { label: "Project Priorities", href: site.sponsor },
      { label: "Sponsors", href: site.sponsors },
    ],
  },
];
