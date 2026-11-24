import { site } from "@/lib/site";

// Prepended when "Copy with preamble" is used, so a prompt pasted into a
// fresh agent session also carries the steps needed to turn its output into
// an actual Physlib contribution, not just the task itself.
export const PREAMBLE = `Before starting, set yourself up to contribute to Physlib:
1. Fork ${site.github} and clone the fork, with the original repository as the \`upstream\` remote (the GitHub Guide, ${site.url}/gh-guide, has the commands).
2. Read README.md, AGENTS.md and AI-POLICY.md in the repository root, and the Getting Started guide (${site.url}/getting-started) for how to install Lean, build the project, and the naming/docstring/style conventions we expect.
3. Create a new branch off the latest \`upstream/master\` for this change.
4. Run \`lake exe get_cache\`, then confirm \`lake build\` succeeds before you start.
5. Once done, confirm \`lake build\` still succeeds and \`lake exe lint_all\` passes, then show me the diff. After I review the diff, commit the work. I will write the pull request description. Once I give it to you, open the pull request against ${site.github} using my text. I will handle all communication with reviewers.

With that in mind:

`;
