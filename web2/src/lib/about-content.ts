/**
 * Content for the About section. These strings were originally inline on the
 * home page; they live here so the section pages and the About index share a
 * single source of truth.
 */

export const missionStatement =
  "Create a library of digitalized physics results in Lean 4, useful to the broad physics community.";

export const visionPoints = [
  "Comprehensive repository of fundamental physics definitions, theorems, and calculations.",
  "Interface between experimental data, simulations, and formal theoretical frameworks.",
  "Extensive, physics-focused documentation to support adoption.",
  "Accessible to physicists at all levels — especially those new to formal methods.",
  "An intuitive setup that aligns with how physicists think and work.",
  "A large, active team with the potential for high-energy-physics-style collaborations.",
];

export const values = [
  {
    title: "Welcoming",
    body: "Contributors of all academic backgrounds and experience levels are valued, supported, and empowered to make meaningful contributions.",
  },
  {
    title: "Open & Transparent",
    body: "Physlib is openly accessible, freely available, and developed with full transparency for the benefit of both communities.",
  },
  {
    title: "Accessible & Practical",
    body: "Designed to be intuitive and well-documented, directly useful to physicists regardless of their familiarity with formal methods.",
  },
];

export const audiences = [
  {
    tag: "Academic",
    title: "Researchers & Students",
    items: [
      "Students in physics, mathematics, or computer science",
      "Research physicists formalizing theoretical results",
      "AI researchers verifying mathematical theorems",
      "Educators creating novel teaching approaches",
    ],
  },
  {
    tag: "Industrial",
    title: "Companies & Labs",
    items: [
      "Companies leveraging AI for formal reasoning at scale",
      "Organizations proving correctness of physical processes",
      "Teams building verified simulation frameworks",
      "Enterprises ensuring theoretical soundness of models",
    ],
  },
];

export const impacts = [
  "Make it easier to find and reference existing results across physics.",
  "Enable AI and machine learning to automate discovery of new results.",
  "Check papers and results for mathematical correctness automatically.",
  "Create new avenues through which physics can be taught and explored.",
  "Open new ways to interface between theory and computer programs.",
  "Build a shared, standardized foundation for the whole physics community.",
];

export const paper = {
  label: "arXiv:2405.08863",
  href: "https://inspirehep.net/literature/2787050",
};

/** Pages in the About section — drives the index cards and the section nav. */
export const aboutSections = [
  {
    href: "/about/mission",
    label: "Mission",
    tagline: missionStatement,
  },
  {
    href: "/about/values",
    label: "Values",
    tagline: "Built on principles.",
  },
  {
    href: "/about/beneficiaries",
    label: "Beneficiaries",
    tagline: "For physicists and formal-methods researchers.",
  },
  {
    href: "/about/impact",
    label: "Impact",
    tagline: "Why formalize physics?",
  },
  {
    href: "/maintainers",
    label: "Maintainers",
    tagline: "The people responsible for reviewing and merging pull requests.",
  },
];
