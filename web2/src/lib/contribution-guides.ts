import { site } from "./site";

export const contributionGuides = [
  {
    id: "getting-started",
    title: "Getting started with Physlib",
    description: "Choose a first task, set up Lean, and find examples of code and documentation contributions.",
    url: site.url + "/getting-started#first-contribution",
    text: [
      "For a first issue, use `find_tasks` with `kind: issue`, `label: good first issue`, and `unassigned: true`. Follow the issue link, check the assignees and recent comments, and tell the maintainer what you would like to work on. The task’s `nextStep` includes a brief you can share with an assistant.",
      "Choose an item on [Find a Task](" + site.url + "/tasks) and open its source to read the issue or the surrounding Lean file. For a first contribution, the [API map walkthrough](" + site.github + "/blob/master/docs/GettingStarted/FirstAPIMap.md) shows how to document a physics topic with references to existing Lean declarations.",
      "For a code change, follow [Getting Started](" + site.url + "/getting-started#installing) to install Lean and build your fork. The [worked Alpha example](" + site.url + "/getting-started#making-a-new-file) shows where to place and how to build a new module. For module descriptions and docstrings, use the [Documentation Guide](" + site.url + "/documentation-guide).",
    ].join("\n\n"),
  },
  {
    id: "ai-guidelines",
    title: "AI-assisted contributions",
    description: "Check which library contributions can use AI and what the human author must verify.",
    url: site.url + "/ai-resources#ai-guidelines",
    text: [
      "In `Physlib`, humans do most of the work and make the main decisions. `PhyslibAlpha` accepts AI-generated drafts. Read the [AI guidelines](" + site.url + "/ai-resources#ai-guidelines) before choosing where a result belongs.",
      "For AI-assisted library work, the human author vouches for every line, checks bibliographic references personally, writes the PR description, and handles reviewer communication. Independently verify any revisions before requesting another review. Follow the library’s [AI policy](" + site.github + "/blob/master/AI-POLICY.md), [agent instructions](" + site.github + "/blob/master/AGENTS.md), and [review guidelines](" + site.github + "/blob/master/docs/ReviewGuidelines.md).",
      "The [Physlib AI tools](" + site.url + "/ai-resources#physlib-ai-tools) and [prompt library](" + site.url + "/ai-resources#useful-prompts) have examples for working with Lean.",
    ].join("\n\n"),
  },
  {
    id: "github-guide",
    title: "Opening a Physlib pull request",
    description: "Work from a fork, check your change, and submit it for review.",
    url: site.url + "/gh-guide#make-a-pull-request",
    text: [
      "Start from the [library issue](" + site.github + "/issues) or discuss a larger proposal on [Physlib Zulip](" + site.zulip + "). Fork the library and [create a branch](" + site.url + "/gh-guide#work-on-the-problem) from upstream `master`. Keep the change focused and run the [library review checks](" + site.github + "/blob/master/docs/ReviewGuidelines.md).",
      "Push the branch to your fork and target `leanprover-community/physlib` on `master`. The human author describes the change and checks in their own words and responds to reviewers. See [Open a Pull Request](" + site.url + "/gh-guide#make-a-pull-request) and [Managing the PR](" + site.url + "/gh-guide#managing-the-pr).",
    ].join("\n\n"),
  },
  {
    id: "website",
    title: "Contributing to the Physlib website",
    description: "Run the website locally and send a website change to the right repository.",
    url: site.websiteRepo + "/tree/main/web2",
    text: [
      "Use [website issues](" + site.websiteRepo + "/issues) for site navigation, page presentation, search, and the task service. Use [library issues](" + site.github + "/issues) for physics definitions, Lean proofs, and documentation drawn from Lean modules. The [Documentation Guide](" + site.url + "/documentation-guide) shows how to improve a module’s documentation at its source.",
      "Fork the [website repository](" + site.websiteRepo + "), clone your fork, then run `cd web2`, `npm install`, and `npm run dev`. Open the local URL printed by Next.js. Edit routes in `src/app` and shared UI in `src/components`. Check the affected pages and open a pull request against `Kernel-Science/physlib-website` on `main`.",
      "For agent-assisted website changes, the [website instructions](" + site.websiteRepo + "/blob/main/web2/AGENTS.md) require reading the relevant installed Next.js guide. For changes submitted to the Lean library, follow its [AI policy](" + site.github + "/blob/master/AI-POLICY.md).",
    ].join("\n\n"),
  },
];
