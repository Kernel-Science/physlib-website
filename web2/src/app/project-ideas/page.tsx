import { Card, Chip } from "@heroui/react";
import type { Metadata } from "next";
import { ButtonLink } from "@/components/button-link";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Project Ideas | Physlib",
  description:
    "A list of project ideas for formalizing physics in Lean 4 with Physlib.",
};

type Project = {
  title: string;
  body: string;
  links?: { label: string; href: string }[];
};

const projects: Project[] = [
  {
    title: "Classical Mechanics of a Pendulum",
    body: "Similar to the current formalization of the classical harmonic oscillator, this project corresponds to the formalization of a pendulum.",
    links: [
      {
        label: "Wikipedia",
        href: "https://en.wikipedia.org/wiki/Pendulum_(mechanics)",
      },
    ],
  },
  {
    title: "Planck's Theory of Blackbody Radiation",
    body: "Formalize Planck's law for blackbody radiation, and derive Wien's displacement law.",
    links: [
      {
        label: "Planck's Law",
        href: "https://en.wikipedia.org/wiki/Planck%27s_law#The_law",
      },
      {
        label: "Wien's Displacement Law",
        href: "https://en.wikipedia.org/wiki/Wien%27s_displacement_law#Derivation_from_Planck%27s_law",
      },
    ],
  },
  {
    title: "Binary Star System",
    body: "Formalize the solution to a system of binary stars.",
    links: [
      {
        label: "Reference",
        href: "https://farside.ph.utexas.edu/teaching/celestial/Celestial/node38.html",
      },
    ],
  },
  {
    title: "Hydrodynamic Drag",
    body: "Write down Newton's second law for a particle with a hydrodynamic drag trapped in a harmonic spring, and derive from that a differential equation for the mean-squared displacement.",
    links: [
      {
        label: "Reference",
        href: "https://mmathphys.physics.ox.ac.uk/sites/default/files/mmathphys/documents/media/nonequilibrium_statistical_physics_2018.pdf",
      },
    ],
  },
  {
    title: "The Reflectionless Potential in Quantum Mechanics",
    body: "Formalize the properties of the reflectionless potential in quantum mechanics, following the formalization of the quantum harmonic oscillator.",
    links: [
      {
        label: "Reference",
        href: "https://arxiv.org/pdf/2411.14941",
      },
    ],
  },
  {
    title: "Tight-Binding Model for Graphene",
    body: "Physlib already contains the tight-binding model for a chain. This project would aim to generalize that to do the tight-binding model for graphene.",
    links: [
      {
        label: "Reference",
        href: "https://cpb-us-w2.wpmucdn.com/u.osu.edu/dist/3/67057/files/2018/09/graphene_tight-binding_model-1ny95f1.pdf",
      },
    ],
  },
  {
    title: "Definition of the Bosonic and Fermionic Hilbert Spaces",
    body: "Define the Hilbert space of a single bosonic and a single fermionic particle. Part of this will involve defining the Lorentz-invariant measure and the mass-shell manifold.",
    links: [
      {
        label: "Notes",
        href: "https://souravchatterjee.su.domains/qft-lectures-combined.pdf#page23",
      },
    ],
  },
  {
    title: "Basic Properties of Cosmology",
    body: "Within Physlib there are currently some informal results related to the FLRW metric. The aim of this project would be to formalize those results into Lean and expand upon them.",
    links: [
      {
        label: "physlib file",
        href: "https://github.com/leanprover-community/physlib/blob/master/PhysLean/Cosmology/FLRW/Basic.lean",
      },
      {
        label: "Zulip discussion",
        href: "https://leanprover.zulipchat.com/#narrow/channel/479953-physlib/topic/Cosmology.20Project.20and.20dependencies/with/512468525",
      },
    ],
  },
  {
    title: "Laplace's Tidal Equations",
    body: "Write down and prove the basic properties of Laplace's tidal equations. One could go further and provide a derivation of these equations.",
    links: [
      {
        label: "Reference",
        href: "https://www.whoi.edu/cms/files/lecture03_21374.pdf",
      },
    ],
  },
  {
    title: "Boltzmann Equation",
    body: "Write down the Boltzmann equation with the BGK collision operator and prove basic properties about solutions thereof.",
    links: [
      {
        label: "Reference",
        href: "https://mmathphys.physics.ox.ac.uk/sites/default/files/mmathphys/documents/media/kt_2019.pdf",
      },
    ],
  },
  {
    title: "Larmor Formula",
    body: "The Larmor formula gives the power radiated by a non-relativistic point particle as it accelerates. The idea of this project would be to derive this formula using the foundations of electromagnetism.",
    links: [
      {
        label: "Wikipedia",
        href: "https://en.wikipedia.org/wiki/Larmor_formula",
      },
    ],
  },
  {
    title: "Quantum Particle on a Ring",
    body: "Formalize the quantum mechanics of a particle on a ring.",
    links: [
      {
        label: "Wikipedia",
        href: "https://en.wikipedia.org/wiki/Particle_in_a_ring",
      },
      {
        label: "Zulip discussion",
        href: "https://leanprover.zulipchat.com/#narrow/channel/479953-physlib/topic/QM.20particle.20on.20a.20ring/with/523260615",
      },
    ],
  },
  {
    title: "The Two Higgs Doublet Model Potential",
    body: "Prove Theorem 1, 2 & 4 of arXiv(hep-ph):0605184. This is related to the two Higgs doublet model, which corresponds to a model of the universe with a proposed extra Higgs doublet.",
    links: [
      {
        label: "arXiv:hep-ph/0605184",
        href: "https://arxiv.org/pdf/hep-ph/0605184",
      },
    ],
  },
  {
    title: "Properties of Grand Unified Theory Groups",
    body: "Prove the group theoretic properties of the grand-unified theories: SU(5), Spin(10) and Pati-Salam.",
    links: [
      {
        label: "Reference",
        href: "https://math.ucr.edu/home/baez/guts.pdf",
      },
    ],
  },
];

export default function ProjectIdeasPage() {
  return (
    <div className="page-frame-tracker max-w-4xl">
      <h1 className="page-title-tracker">Project Ideas</h1>
      <p className="page-intro-tracker mb-6">
        Below are a list of project ideas. No matter who you are, you may
        attempt any of these. They are roughly ordered in complexity from
        easiest to hardest. If you would like to claim one of these projects or
        add projects, let{" "}
        <a
          href="https://josephtoobysmith.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline underline-offset-2"
        >
          Joseph Tooby-Smith
        </a>{" "}
        know, or make a pull-request to the{" "}
        <a
          href={site.github}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline underline-offset-2"
        >
          Physlib repo
        </a>
        .
      </p>

      <div className="flex flex-col gap-4">
        {projects.map((project) => (
          <Card key={project.title} variant="default">
            <Card.Header className="flex flex-row items-start justify-between gap-3">
              <Card.Title className="text-base">{project.title}</Card.Title>
              <Chip color="success" variant="soft" className="shrink-0 text-xs">
                Available
              </Chip>
            </Card.Header>
            <Card.Content className="flex flex-col gap-3">
              <p className="text-sm text-foreground/90">{project.body}</p>
              {project.links && project.links.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {project.links.map((link) => (
                    <ButtonLink
                      key={link.href}
                      href={link.href}
                      size="sm"
                      variant="tertiary"
                    >
                      {link.label} ↗
                    </ButtonLink>
                  ))}
                </div>
              )}
            </Card.Content>
          </Card>
        ))}
      </div>
    </div>
  );
}
