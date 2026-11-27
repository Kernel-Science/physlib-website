# Project Priorities

Physlib is the standard library for physics in Lean, a language in which a computer checks every mathematical statement for correctness and consistency. Today it holds over 10,000 reviewed theorems and lemmas, covering physics from Maxwell's equations to the Standard Model Lagrangian. Its long-term goal is to be the trusted corpus of knowledge for physics: readable, reviewed by people, and containing the best results possible in a connected and reusable way. Physlib is open source and its contributors guide its development. The priorities below describe where contributors can put their time and [what its funding priorities would cost](#priorities).

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

Alongside Physlib sits PhyslibAlpha, a place for fast, reusable formalization in physics, with a lighter "one-look" review policy: a contribution is reviewed once, rather than discussed until it is as good as we can make it. Its aim is a connected corpus of physics formalizations that follows the practices learned from Physlib, and it is a place where AI-driven development can take a leading role. Unlike the one-off formalizations described above, AI-written work in PhyslibAlpha has to be integrated with the rest of the library making it reusable and connected. PhyslibAlpha acts as a guide to the new definitions and results that could be brought up to Physlib's standard and added to it. It also adds new lemmas around Physlib's existing, reviewed definitions, giving others a larger pool of results they can trust and use in their own formalizations.


## Where Physlib is today

Physlib started in April 2024. It lives under the Lean community's own organisation, the same home as Mathlib, is looked after by [seven maintainers](/team#maintainers), and is discussed openly in its own [channel on the Lean community chat](https://leanprover.zulipchat.com/#narrow/channel/479953-Physlib). It has grown quickly, and the growth is speeding up.

<!-- growth-charts -->

- **More people are contributing, more often.** In the last 30 days, [226 pull requests were proposed](https://github.com/leanprover-community/physlib/pulls?q=is%3Apr+created%3A2026-10-27..2026-11-26), about seven a day. In the same 30 days a year earlier [there were 28](https://github.com/leanprover-community/physlib/pulls?q=is%3Apr+created%3A2025-10-27..2025-11-26). The number of contributors has more than doubled since May 2026, [when there were 48](https://github.com/leanprover-community/physlib/pulls?q=is%3Apr+is%3Amerged+merged%3A%3C%3D2026-05-26).
- **The size has been measured independently.** [Lean Census](https://arxiv.org/abs/2611.28430), an analysis of Lean libraries by Project Numina, counted 207,000 lines and 13,915 declarations in Physlib's reviewed libraries in November 2026.
- **PhyslibAlpha adds a further corpus.** Since it [opened in June 2026](https://github.com/leanprover-community/physlib/pull/1159), it has grown to [228,000 lines](https://github.com/leanprover-community/physlib/tree/d6a3586eb33124da3d6740c9e609d8adbf87e651/PhyslibAlpha) and 10,800 theorems and lemmas. It is not counted in the charts.

The [monthly reports](/monthly-updates) give the changes month by month.

## Who is building on Physlib

Physlib is already being built on. About 80 public projects on GitHub declare it as a dependency, and it is used by industrial AI labs, national laboratories and universities.

<!-- downstream-cards -->

## Where this leads

If we succeed, Physlib will be the standard corpus of knowledge for physics. People will add to it and get credit for what they contribute, new results will be built on top of it, and it will be a trusted place to read and learn physics. The more results AI produces, the more useful it is to have a library that people have read, reviewed and shaped. Physlib will cover all areas of physics, and it will stay open for anyone to use and build on, instead of sitting in a closed library or behind proprietary software.

A corpus like this also leads to discovery: covering an area comprehensively reveals new connections, reductions and methods, and finds mistakes. This is already happening.

- Formalizing a widely cited 2006 paper on the two-Higgs-doublet model for Physlib [exposed an error in it](https://arxiv.org/abs/2603.08139). The paper's authors published a [correction in the European Physical Journal C](https://doi.org/10.1140/epjc/s10052-026-15990-9), and [New Scientist covered the story](https://www.newscientist.com/article/2520546-computer-finds-flaw-in-major-physics-paper-for-first-time/).
- [Formalizing a class of particle-physics models from string theory](https://arxiv.org/abs/2603.28406) inside Physlib replaced an ad hoc computer scan with a formally verified classification.

## What holds Physlib back

Contributors work on Physlib in their own time or alongside other research and teaching responsibilities. Four areas in particular would benefit from more of their time.

- **Foundations.** Working out the best way to bring an area of physics into Physlib, and covering it comprehensively. The aim is a base of results that other people can build on, more than any single headline result. Thermodynamics and statistical mechanics, among many other areas, do not yet have foundations that are reusable and easy to build on.
- **Onboarding.** Helping new contributors learn the library's conventions and start making good contributions. A library like this only grows as fast as the community around it, yet getting each newcomer up to speed depends on maintainers who cannot give them as much time as they should, which slows progress in every other area.
- **Maintenance.** Keeping the library correct and current: reviewing contributions, keeping pace with Mathlib, and building automated checks and tests. Review gets done, but our capacity for it is limited, and the rest is often not done as well as it could be, because contributors come for the physics.
- **Infrastructure.** Everything people use to find, explore and learn from the library: dedicated search engines, the website, and its maps of the library. With more time we would link formal results to the published literature and build better systems for people to explore and read the project.

## Funding priorities and estimated costs

These are the kinds of support Physlib most needs, from summer students costing a few thousand dollars to a three-year programme. They are grouped into people, equipment and events, and one combined programme. Funding would normally go to a university or other host institution, usually through a grant.

The costs below are estimates for positions at a UK university, in US dollars and without institutional overheads. Positions in the United States, or for more experienced people, would usually cost more. [How these costs were estimated](#how-these-costs-were-estimated) gives the details.

| Option | What it would achieve | Estimated cost |
|---|---|---:|
| **People** | | |
| Two or three summer students | Usable contributions from supervised summer projects | $7,000–17,000 |
| A dedicated research or engineering post | Sustained work on foundations, onboarding, maintenance or infrastructure | $65,000–300,000 |
| A PhD studentship | A researcher trained in physics and Lean, and a new area of physics in Physlib | $125,000 |
| **Equipment and events** | | |
| A dedicated Physlib server | Hardware to host Physlib's online services, including a browser-based editor | $30,000 |
| A Physlib hackathon | 50 early-career researchers learn Lean and plan future contributions | $90,000 |
| **A combined programme** | | |
| A three-year Physlib Initiative | Twice the contributors and code, review that scales, and foundations for research-level physics | $1.3M–1.9M |

### People

Most of what Physlib needs is someone's time over months or years, not evenings and weekends. A funded person could build the foundations of thermodynamics or statistical mechanics, speed up review and improve the maps of the library, or write the documentation (perhaps even an interactive game) that gets newcomers started.

Everyone who works on Physlib today does so in their spare time, alongside research and teaching, and most of them come for the physics. The work described in [What holds Physlib back](#what-holds-physlib-back) is left to whoever has time that week. A funded person would own that work. By the end of the post they would also know the library well, and could keep reviewing, mentoring and contributing afterwards.

Any one of these areas is worth funding, so a post can follow whatever opportunity comes up: a physics postdoc at one university, an infrastructure post at another. Each task a funded person picks up is also one the maintainers no longer have to do. That leaves them more time for review and direction, and leaves volunteers more time for physics.

#### Summer students

Two or three students in physics, mathematics or computer science would each spend a summer on a project, supervised by someone who knows the physics or infrastructure involved. The aim is a finished contribution that the community can review and use. Each student would receive about $440–560 a week for eight to ten weeks, in line with existing UK summer research bursaries.[^summer]

#### A dedicated research or engineering post

A post can be full-time or part-time, for one to three years. Roughly:

| | Cost |
|---|---|
| Full-time for one year | about $65,000–100,000 |
| Half-time over three years | about $100,000–150,000 |
| Full-time for three years | about $200,000–300,000 |

These are for grade 7 or 8 on the UK University pay scale, a salary of about $52,000–76,000,[^salary] plus the employer's National Insurance[^ni] and pension contributions,[^uss] which together come to about $65,000–97,000 a year.

#### A PhD studentship

A three-and-a-half-year PhD would train someone in both physics and Lean while they build the foundations of an area Physlib doesn't yet cover. The estimate is UKRI's minimum stipend of about $28,600 a year plus UK home fees of about $6,900 a year.[^ukri] International fees vary by university and would add to it.

### Equipment and events

#### A dedicated Physlib server

Some of the online services Physlib wants to offer need hardware of their own. The clearest example is a browser-based editor like [Lean's live editor](https://live.lean-lang.org), where a newcomer can write Lean and check it against Physlib without installing anything. Everyone using it runs their own copy of Lean with Physlib and Mathlib loaded, which takes several gigabytes of memory,[^mathlib-mem] so serving about ten people at once needs a machine with around 128 GB. The $30,000 pays for that machine[^server] and the time to set it up, and a university department would host it.

#### A Physlib hackathon

Fifty undergraduates, PhD students and early-career postdocs would spend two days together. On the first day they learn Lean. On the second they work in teams of five on a real problem, and leave with a plan for what to contribute next. Most of the cost is travel and accommodation.

### A combined programme

#### A three-year Physlib Initiative

The largest option combines the others into one three-year programme with three goals:

- twice as many contributors (over 120 today) and twice as much reviewed code (about 210,000 lines today);
- review that keeps up as the library grows, with as many automated checks as possible and tools that show reviewers what they need to know to review quickly and well;
- foundations for the physics that physicists actually research, so they can build their own work on Physlib: particle collisions at the LHC, semiconductors, the gravitational waves LIGO detects, and the Yang-Mills theory behind the recent AI-generated result.

It would pay for six full-time posts for three years, plus a hackathon, at the costs above. Some of the team could work part-time alongside university jobs. The work would be split across four roles:

- a team leader, responsible for the overall vision;
- two Lean software engineers, working on infrastructure and maintenance;
- two physics experts, building foundations and reviewing contributions;
- one person dedicated to onboarding.

<span id="how-these-costs-were-estimated" class="block scroll-mt-20"></span>

### How these costs were estimated

Staff costs use pay at the University of Bath for an early-career post, on grades 7 and 8 of its pay scale, converted at $1.31 to the pound.[^fx] Student costs use UK rates for bursaries and PhD stipends.

[^fx]: The pound was worth $1.3123 on 27 November 2026, according to [Trading Economics](https://tradingeconomics.com/united-kingdom/currency).
[^summer]: The London Mathematical Society's [undergraduate research bursaries](https://www.lms.ac.uk/grants/undergraduate-research-bursaries) pay £335 a week (£350 in London) for six to eight weeks, and Imperial College London's [UROP bursaries](https://www.imperial.ac.uk/students/fees-and-funding/general-support/funding-for-placements/urop/) pay £424 a week.
[^salary]: The University of Bath's [pay and grading structure](https://www.bath.ac.uk/corporate-information/university-of-bath-pay-and-grading-structure/), effective 1 August 2026: grade 7 is £39,560–46,970 and grade 8 is £48,337–57,666.
[^ni]: Employers pay National Insurance at 15% on earnings above £5,000 a year. See [GOV.UK: rates and thresholds for employers 2026 to 2027](https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027).
[^uss]: Employers pay 14.5% of salary into the Universities Superannuation Scheme. See the [University of York's summary of USS contribution rates](https://www.york.ac.uk/admin/hr/pensions/uss/what-is-uss/). The scheme's [2026 valuation](https://www.uss.co.uk/about-us/valuation-and-funding/2026-valuation) may change this rate.
[^ukri]: [UKRI: support for UKRI-funded students](https://www.ukri.org/manage-your-award/studentship-guidance/support-for-ukri-funded-students), rates from 1 October 2026.
