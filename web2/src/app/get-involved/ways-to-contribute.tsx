"use client";

import { useState } from "react";
import { ButtonLink } from "@/components/button-link";
import { site } from "@/lib/site";

type Audience = "new" | "lean" | "ai";

const audiences: { key: Audience | "all"; label: string }[] = [
  { key: "all", label: "Show everything" },
  { key: "new", label: "New to Lean" },
  { key: "lean", label: "I know Lean" },
  { key: "ai", label: "I use AI tools" },
];

type Step = {
  id: string;
  title: string;
  body: string;
  links: { label: string; href: string }[];
  /** Which "Which describes you?" choices this entry is shown for. */
  fits: Audience[];
};

type Group = { id: string; label: string; steps: Step[] };

// What a share link pre-fills. Each service takes the text and the address
// in its own way, so they are built per link below.
const shareText = "Physlib: an open-source community project to formalize physics in Lean 4";
const shareLinks = [
  {
    label: "Share on X",
    href: `https://x.com/intent/post?${new URLSearchParams({ text: shareText, url: site.url })}`,
  },
  {
    label: "Share on Bluesky",
    href: `https://bsky.app/intent/compose?${new URLSearchParams({ text: `${shareText} ${site.url}` })}`,
  },
  {
    label: "Share on LinkedIn",
    href: `https://www.linkedin.com/sharing/share-offsite/?${new URLSearchParams({ url: site.url })}`,
  },
];

// Ordered from easiest to most involved, top to bottom, in three groups.
// The ids are link targets (#steps-to-help-with-documentation is linked from
// outside this page), so keep them when rewording a title.
const groups: Group[] = [
  {
    id: "no-setup-needed",
    label: "No setup needed",
    steps: [
      {
        id: "promotion",
        fits: ["new", "lean", "ai"],
        title: "Spread the Word",
        body: "The easiest way to contribute is to promote the project, either by word of mouth or by sharing it on social media.",
        links: shareLinks,
      },
      {
        id: "discuss",
        fits: ["new", "lean", "ai"],
        title: "Join the Discussion",
        body: "There are a number of discussions on the Physlib Zulip, some of which contain questions you may be able to help with.",
        links: [{ label: "See Physlib Zulip", href: site.zulip }],
      },
    ],
  },
  {
    id: "if-you-know-the-physics",
    label: "If you know the physics",
    steps: [
      {
        id: "write-an-api-map",
        fits: ["new", "lean"],
        title: "Write an API Map",
        body: "API maps are Markdown guides that explain a topic and link to the relevant Lean declarations. If you know the physics and are new to Lean, you can start with one.",
        links: [
          { label: "Browse API Maps", href: "/api-maps" },
          { label: "Start an API Map", href: "/api-maps/new" },
        ],
      },
      {
        id: "informal-results",
        fits: ["new"],
        title: "Add Informal Results",
        body: "If you have a background in physics and don't have the time or skills to formalize results into Lean, you can contribute by adding informal results — definitions and theorems — written in English, placed within the project.",
        links: [{ label: "How to Write One", href: "/getting-started#writing-results" }],
      },
      {
        id: "review-a-pull-request",
        fits: ["new", "lean"],
        title: "Review a Pull Request",
        body: "Anyone can review a pull request. If you know the physics, read an open one and check that the physics is right.",
        links: [{ label: "See the PR Queue", href: "/pr-tracker" }],
      },
    ],
  },
  {
    id: "if-you-write-lean",
    label: "If you write Lean",
    steps: [
      {
        id: "steps-to-help-with-documentation",
        fits: ["lean"],
        title: "Document or Golf a File",
        body: "Golfing is the process of making the code more concise and readable, whilst documentation is the process of adding comments and explanations to the code.",
        links: [
          { label: "How to Document a File", href: site.documentationGuide },
          { label: "Files Needing Documentation", href: `${site.tasks}?type=documentation` },
        ],
      },
      {
        id: "todo-list",
        fits: ["lean"],
        title: "Pick Up a TODO",
        body: "The TODO list contains unfinished work marked in the Lean files. This includes informal lemmas and definitions waiting to be formalized, and relatively small tasks like renaming lemmas.",
        links: [{ label: "See TODOs", href: `${site.tasks}?type=todo` }],
      },
      {
        id: "help-with-issues",
        fits: ["lean"],
        title: "Help with an Issue",
        body: "You can contribute by helping with open issues. These range from suggested formalizations, to infrastructure changes needed, to Lean metaprogramming tasks.",
        links: [{ label: "Browse Open Issues", href: site.tasks }],
      },
      {
        id: "start-a-mini-project",
        fits: ["lean"],
        title: "Start a Mini-Project",
        body: "There is a list of mini-projects on the Project Ideas page. If you want to get your teeth really stuck into formalizing physics, these are a great place for ideas.",
        links: [{ label: "See Project Ideas", href: "/project-ideas" }],
      },
    ],
  },
  {
    id: "if-you-work-with-ai-tools",
    label: "If you work with AI tools",
    steps: [
      {
        id: "physlib-alpha",
        fits: ["ai"],
        title: "Draft in PhyslibAlpha",
        body: "PhyslibAlpha is a downstream staging ground for formalizations, where AI-generated code is allowed and the review process is less strict. First drafts of theorems can go there, and a human can then use them as inspiration to produce higher quality code in Physlib.",
        links: [
          { label: "Read the AI Guidelines", href: "/ai-resources#ai-guidelines" },
          { label: "Useful Prompts", href: "/ai-resources#useful-prompts" },
          { label: "Try a PhyslibAlpha Module", href: "/getting-started#first-contribution" },
        ],
      },
    ],
  },
];

const chipClass =
  "rounded-(--radius) border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-pressed:border-accent aria-pressed:bg-(--accent-tint) aria-pressed:text-accent";

/** The list of ways to contribute, with a filter for who is reading. */
export function WaysToContribute() {
  const [audience, setAudience] = useState<Audience | "all">("all");
  const shown = groups
    .map((group) => ({
      ...group,
      steps: group.steps.filter((step) => audience === "all" || step.fits.includes(audience)),
    }))
    .filter((group) => group.steps.length > 0);

  return (
    <>
      <div role="group" aria-label="Which describes you?" className="mb-10 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm text-muted">Which describes you?</span>
        {audiences.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            aria-pressed={audience === key}
            onClick={() => setAudience(key)}
            className={chipClass}
          >
            {label}
          </button>
        ))}
      </div>

      {shown.map((group, g) => {
        const offset = shown.slice(0, g).reduce((count, earlier) => count + earlier.steps.length, 0);
        return (
          <section key={group.id} aria-labelledby={group.id} className="mt-12 first-of-type:mt-0">
            <h2 id={group.id} className="label-mono scroll-mt-24 border-b border-border pb-3 text-muted">{group.label}</h2>
            <div className="divide-y divide-border">
              {group.steps.map((step, i) => (
                <div key={step.id} id={step.id} className="grid grid-cols-[2.5rem_1fr] gap-x-8 py-8 items-start scroll-mt-24">
                  <span className="label-mono text-accent pt-0.5">
                    {String(offset + i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3
                      className="text-lg font-medium text-foreground mb-2"
                      style={{ letterSpacing: "-0.025em" }}
                    >
                      {step.title}
                    </h3>
                    <p
                      className="text-sm text-muted leading-relaxed mb-3"
                      style={{ letterSpacing: "-0.01em" }}
                    >
                      {step.body}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {step.links.map((link) => (
                        <ButtonLink key={link.href} href={link.href} size="sm" variant="secondary">
                          {link.label}
                        </ButtonLink>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
