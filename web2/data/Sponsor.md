# Fund Physlib

Physlib is the standard library for physics in Lean, a language in which a computer checks every mathematical statement for correctness and consistency. Today it holds over 7,900 theorems and lemmas, covering physics from Maxwell's equations to the Standard Model Lagrangian. Its long-term goal is to be the trusted corpus of knowledge for physics: readable, reviewed by people, and containing the best results possible in a connected and reusable way. Physlib is open source, community run and built entirely by volunteers. Your support would change how fast it can grow, and [each level of support](#what-we-could-do-with-your-support), from US$10,000 upwards, would make something specific happen.

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

All of the work on Physlib is currently done voluntarily, in people's free time or alongside academic jobs with other responsibilities. Nobody is funded to work on Physlib as their main job. What holds the project back is people's time for the four core activities that make it succeed.

- **Foundations.** Working out the best way to bring an area of physics into Physlib, and covering it comprehensively. The aim is a base of results that other people can build on, more than any single headline result. Thermodynamics and statistical mechanics, among many other areas, do not yet have foundations that are reusable and easy to build on.
- **Onboarding.** Helping new contributors learn the library's conventions and start making good contributions. A library like this only grows as fast as the community around it, yet getting each newcomer up to speed depends on maintainers who cannot give them as much time as they should, which slows progress in every other area.
- **Maintenance.** Keeping the library correct and current: reviewing contributions, keeping pace with Mathlib, and building automated checks and tests. Review gets done, but our capacity for it is limited, and the rest is often not done as well as it could be, because contributors come for the physics.
- **Infrastructure.** Everything people use to find, explore and learn from the library: dedicated search engines, the website, and its maps of the library. With more time we would link formal results to the published literature and build better systems for people to explore and read the project.

## What we could do with your support

Each level below is something specific that a gift of that size would make happen. Everything funded becomes part of Physlib, is open source, and is kept up afterwards by Physlib's maintainers and community. Where a level funds a person, we would recruit from the Physlib and wider Lean communities, which already include many people with the right skills. *All costs are estimates and exclude any institutional overheads.*

| With about | We would |
|---|---|
| US$10,000 | Let anyone try Physlib in their browser |
| US$20,000–30,000 | Fund two or three summer students |
| US$90,000 | Run a Physlib hackathon |
| US$100,000–450,000 | Fund a dedicated post |
| US$200,000 | Fund a PhD studentship |
| US$1.9M–2.8M | Form a Physlib Initiative |

### An online Physlib: about US$10,000

With this, we would host an online version of Physlib, modelled on Lean's own live editor at [live.lean-lang.org](https://live.lean-lang.org), where anyone can write and check Lean against Physlib in their browser, without installing anything. This would lower the barrier to entry for newcomers. The cost covers buying servers able to handle the traffic we expect, and the one-off cost of paying someone to set them up.

### Summer students: about US$20,000–30,000

With this, two or three students in physics, mathematics or computer science would spend a summer working on Physlib's physics or its infrastructure, each on a well-defined project supervised by an expert. By the end, each project would be completed and part of the library.

### A Physlib hackathon: about US$90,000

With this, we would run a two-day, in-person event for 50 undergraduates, PhD students and early-career postdocs, working in ten teams, with travel and accommodation covered. Travel and accommodation make up most of the cost. The first day teaches Lean. On the second, each team builds something concrete and leaves with a plan for future contributions. By the end, 50 people would know how to contribute to Physlib, at a stage in their careers where this could shape what they work on and how.

### A dedicated post: about US$100,000–450,000

With this, we would fund one person to work on Physlib, as a postdoc or in another role where that suits the person better.

| | Cost |
|---|---|
| Full-time for one year | about US$100,000–150,000 |
| Part-time over three years | about US$150,000–225,000 |
| Full-time for three years | about US$300,000–450,000 |

The post can be directed at any of the core activities:

- **Physics foundations:** building the foundations of an area such as thermodynamics or statistical mechanics. Afterwards, Physlib would have that area in place for others to build on.
- **Maintenance and infrastructure:** taking an active part in reviewing contributions, which lifts that burden from the maintainers, and improving the maps that guide people through the library. Afterwards, contributions would be reviewed faster, and the library would be easier to find your way around.
- **Onboarding:** giving newcomers the time and guidance that maintainers currently cannot. Afterwards, Physlib would have good documentation to guide newcomers into the project, and possibly an interactive game for learning it.

### A PhD studentship: about US$200,000

With this, we would fund a PhD student for three and a half years, building the foundations of an area of physics where Physlib's are missing. By the end, Physlib would have the foundations of one more area of physics in place, and the field would have a new researcher trained in both physics and Lean.

### A Physlib Initiative: about US$1.9M–2.8M over three years

With this, we would form a Physlib Initiative: a dedicated team, equivalent to six full-time people, working on Physlib together for three years, which would also run a Physlib hackathon. The cost is that of six dedicated posts for three years, at the rates above, plus the hackathon. Some may work part-time alongside their university roles. The team would bring together people from different backgrounds who complement one another:

- a team leader, responsible for the overall vision;
- two Lean software engineers, working on infrastructure and maintenance;
- two physics experts, building foundations and reviewing contributions;
- one person dedicated to onboarding.

By the end of the three years, Physlib would have:

- twice as many contributors (over 120 today) and twice as much reviewed code (about 150,000 lines today);
- review that scales: as many automated checks as possible, and systems that show reviewers the information they need to perform a fast but effective review;
- the foundations in place to reach more areas of physics directly relevant to physicists' research, so that physicists can build their own work on Physlib: for example, particle collisions at the LHC, the physics of semiconductors, gravitational waves as detected by LIGO, and the Yang-Mills theory that the recent AI-generated result concerns.

## Who you would be supporting

Physlib belongs to its community, not to any one person or institution, and the community decides its direction. It has over 120 contributors from universities, research institutes and industry, and a team of 7 maintainers who review contributions. It sits within the Lean community's own organisation, alongside Mathlib.

Every sponsor will be acknowledged publicly, unless they prefer otherwise, and will receive a report on what their support has achieved. Sponsors can choose what their support funds, but what goes into Physlib is decided by community review alone.

If you would like to support Physlib, or to talk through which of these fits what you want to achieve, please get in touch using the [details at the top of this page](#contribute). Physlib is not itself an organisation, so gifts can be received through academic institutions, and we are open to other arrangements, such as a philanthropic host.
