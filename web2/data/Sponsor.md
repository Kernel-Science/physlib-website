# Project Priorities

Physlib is the standard library for physics in Lean, a language in which a computer checks every mathematical statement for correctness and consistency. Today it holds over 7,900 theorems and lemmas, covering physics from Maxwell's equations to the Standard Model Lagrangian. Its long-term goal is to be the trusted corpus of knowledge for physics: readable, reviewed by people, and containing the best results possible in a connected and reusable way. Physlib is open source and its contributors guide its development. The priorities below describe where contributors can put their time and [what larger research projects could cost](#priorities).

## Why a standard library matters

As AI makes formalization easier, a solid foundation for those formalizations to be built on becomes more important. Results are already arriving quickly: in 2026, OpenAI announced AI-generated results on two of the most famous open problems in physics, [Yang-Mills](https://openai.com/index/building-scientific-understanding-with-academic-communities/) and [Navier-Stokes](https://openai.com/index/navier-stokes-solution/), each accompanied by a proof written in Lean. But formalizations like these are written to reach one result. They are not built to be reused, they have not been through open community review, and nobody knows whether their definitions are the best available.

There are three reasons why a shared foundation matters more as this continues.

**The first is trust.** A result in Lean can only be trusted as much as the foundations it is built on. Lean confirms that a proof follows from its definitions. It cannot tell you whether those definitions are the right ones. If an AI produces a physics result using the wrong definition of a fermion, the computer will still accept it, even though the result is meaningless. Checking that the definitions are right needs people who have read and understood them.

**The second is reuse.** Without a shared foundation, anyone formalizing physics has to start from scratch, reproducing work that others have already done, often with definitions that are clumsy or inefficient rather than the best available. This wastes time and effort, and leads to results that are incompatible with one another.

**The third is readability.** As more is formalized, it matters more that there is one place holding the best-quality results, which is easy for a person to read and easy to learn from. Code written quickly to reach one result, whether by a person or an AI, is rarely written to be read. A library written for people is somewhere a student or researcher can learn from, check for themselves, and find out what already exists.

Mathematics already has a library like this. Mathlib is shared, built by its community and reviewed by people, and formal mathematics, including AI-driven work, is now built on it. Physlib aims to be the same for physics. It builds on Mathlib, but physics needs a library of its own. A result in physics carries physical meaning as well as mathematics: which definitions describe what in the world, and under which assumptions. The questions physicists ask are also different from those mathematicians ask, and the library has to be built around them.

## How Physlib is built

Physlib is guided by a few principles:

- **It is reviewed by people.** Every contribution is peer reviewed, and its details are discussed until they are as good as we can make them.
- **It changes when a better way is found.** Our first treatment of index notation was built on category theory. It was correct, but too complicated for people to read and use, so we replaced it with a much nicer framework.
- **It covers physics the way physicists do it.** Rather than restricting itself to a single rigid framework such as axiomatic quantum field theory, Physlib works from the starting points physicists use. In time, this will let it reach physics that matters in the real world, such as semiconductors and particle collisions at CERN.

Alongside Physlib sits PhyslibAlpha, a place for fast, reusable formalization in physics, with a lighter "one-look" review policy: a contribution is reviewed once, rather than discussed until it is as good as we can make it. This gives fast-moving work somewhere shared to land straight away, where others can already reuse it, and from where it can later be brought up to Physlib's standard.

## Where Physlib is today

Physlib started in 2024. It now has [over 120 contributors and 7 maintainers](https://github.com/leanprover-community/physlib), about 150,000 lines of reviewed Lean, 390 people in its community chat, and over 1,800 contributions (pull requests) proposed so far, with about five new ones every day. It lives under the Lean community's own organisation, the same home as Mathlib.

Physlib is already being built on. Large AI-driven formalization projects, including [ATLAS-Lean](https://github.com/facebookresearch/atlas-lean) from Meta's research group and [EpsilonEridani](https://github.com/eic/EpsilonEridani) from the Electron-Ion Collider, use Physlib as one of their foundations. Physlib has also been used as training data for AI theorem provers, such as [PhysProver](https://arxiv.org/abs/2601.15737).

## Where this leads

If we succeed, Physlib will be the standard corpus of knowledge for physics. People will add to it and get credit for what they contribute, new results will be built on top of it, and it will be a trusted place to read and learn physics. The more results AI produces, the more useful it is to have a library that people have read, reviewed and shaped. Physlib will cover all areas of physics, and it will stay open for anyone to use and build on, instead of sitting in a closed library or behind proprietary software.

A corpus like this also leads to discovery: covering an area comprehensively reveals new connections, reductions and methods. For example, [formalizing a class of particle-physics models from string theory](https://arxiv.org/abs/2603.28406) inside Physlib replaced an ad hoc computer scan with a formally verified classification.

## What holds Physlib back

Contributors work on Physlib in their own time or alongside other research and teaching responsibilities. Four areas in particular would benefit from more of their time.

- **Foundations.** Working out the best way to bring an area of physics into Physlib, and covering it comprehensively. The aim is a base of results that other people can build on, more than any single headline result. Thermodynamics and statistical mechanics, among many other areas, do not yet have foundations that are reusable and easy to build on.
- **Onboarding.** Helping new contributors learn the library's conventions and start making good contributions. A library like this only grows as fast as the community around it, yet getting each newcomer up to speed depends on maintainers who cannot give them as much time as they should, which slows progress in every other area.
- **Maintenance.** Keeping the library correct and current: reviewing contributions, keeping pace with Mathlib, and building automated checks and tests. Review gets done, but our capacity for it is limited, and the rest is often not done as well as it could be, because contributors come for the physics.
- **Infrastructure.** Everything people use to find, explore and learn from the library: dedicated search engines, the website, and its maps of the library. With more time we would link formal results to the published literature and build better systems for people to explore and read the project.

## Projects and estimated costs

These estimates describe the staff time, equipment and travel that six projects would require. A research group preparing a grant proposal could use them as a starting point and confirm costs and overheads with its own institution. All figures are in US dollars and exclude institutional overheads.

| Project | Estimated cost |
|---|---:|
| A browser-based Physlib editor | $10,000 |
| Two or three summer students | $20,000–30,000 |
| A Physlib hackathon | $90,000 |
| A dedicated research or engineering post | $100,000–450,000 |
| A PhD studentship | $200,000 |
| A three-year Physlib Initiative | $1.9M–2.8M |

### A browser-based Physlib editor

An editor modelled on [Lean’s live editor](https://live.lean-lang.org) would let newcomers write and check Lean against Physlib in their browser without installing it. The $10,000 estimate covers servers for the expected traffic and the one-time work of setting them up.

### Summer students

Two or three students in physics, mathematics or computer science could each spend a summer on a project supervised by someone who knows the relevant physics or infrastructure. Each project would aim to produce a contribution the community could review and use.

### A Physlib hackathon

The estimate covers a two-day, in-person event for 50 undergraduates, PhD students and early-career postdocs working in ten teams. Travel and accommodation account for most of the cost. Participants would learn Lean on the first day, then work on a concrete problem with their team and leave with a plan for future contributions.

### A dedicated research or engineering post

A postdoctoral researcher or research software engineer could focus on one of the core activities. The estimate depends on the length of the appointment.

| | Cost |
|---|---|
| Full-time for one year | about US$100,000–150,000 |
| Part-time over three years | about US$150,000–225,000 |
| Full-time for three years | about US$300,000–450,000 |

The post can be directed at any of the core activities:

- **Physics foundations:** building the foundations of an area such as thermodynamics or statistical mechanics. Afterwards, Physlib would have that area in place for others to build on.
- **Maintenance and infrastructure:** taking an active part in reviewing contributions, which lifts that burden from the maintainers, and improving the maps that guide people through the library. Afterwards, contributions would be reviewed faster, and the library would be easier to find your way around.
- **Onboarding:** giving newcomers the time and guidance that maintainers currently cannot. Afterwards, Physlib would have good documentation to guide newcomers into the project, and possibly an interactive game for learning it.

### A PhD studentship

A three-and-a-half-year PhD project could train a researcher in both physics and Lean while developing reusable foundations in an area that Physlib does not yet cover.

### A three-year Physlib Initiative

The largest proposal combines six full-time equivalent posts for three years with a Physlib hackathon. The estimate uses the appointment costs above. Some team members could work part-time alongside university roles. The team would divide the work across four roles.

- a team leader, responsible for the overall vision;
- two Lean software engineers, working on infrastructure and maintenance;
- two physics experts, building foundations and reviewing contributions;
- one person dedicated to onboarding.

The team would work toward three goals over those three years.

- twice as many contributors (over 120 today) and twice as much reviewed code (about 150,000 lines today);
- review that scales: as many automated checks as possible, and systems that show reviewers the information they need to perform a fast but effective review;
- the foundations in place to reach more areas of physics directly relevant to physicists' research, so that physicists can build their own work on Physlib: for example, particle collisions at the LHC, the physics of semiconductors, gravitational waves as detected by LIGO, and the Yang-Mills theory that the recent AI-generated result concerns.

## Community and review

More than 120 contributors from universities, research institutes and industry have helped build Physlib. Its seven maintainers coordinate review within the Lean community, alongside Mathlib. The Physlib community sets the library’s direction and reviews contributions, including work developed through a research collaboration.
