"""Place external Lean sources among Physlib topics using auditable name/path evidence.

Run from any directory after the source audit: python3 scripts/roadmap_placement.py
A declaration inherits its module unless its identifier supports a more specific
placement. A topic path records a reading location, never proof status or ownership.
"""

import argparse
import json
import re
import sqlite3
from collections import defaultdict
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

WEB = Path(__file__).resolve().parents[1]
DB = WEB / "data/roadmap-audit/declarations.sqlite"

# Explicit name aliases supplement the exact native folder names. Scoping each
# rule prevents e.g. a quantum Fourier transform from being read as field theory.
ALIASES = {
    "ClassicalMechanics": {
        "HarmonicOscillator": "harmonic oscillator|oscillator hamiltonian",
        "DampedHarmonicOscillator": "damped oscillator|damped harmonic oscillator",
        "Pendulum": "double pendulum|pendulum", "Pendulum.SimplePendulum": "simple pendulum",
        "HamiltonianMechanics": "hamiltonian|symplectic flow|hamilton equations",
        "OrbitalMechanics": "n body|kepler|orbital",
        "PointParticle.NewtonianSystem": "ballistic|newtons law|newtonian",
        "WaveEquation": "wave equation|wave equation widget",
        "MolecularMechanics": "lennard jones|molecular mechanics",
        "PhaseSpace": "phase space", "Lagrangian": "euler lagrange|lagrangian",
    },
    "QuantumInfo": {
        "Channels": "channel|channels|kraus|cptp|quantum operation|amplitude damping|superoperator",
        "Capacity": "channel capacity|quantum capacity|coherent information",
        "Entropy": "entropy|strong subadditivity|relative entropy|mutual information",
        "States.Mixed": "mixed state|density matrix|density operator",
        "States.Pure": "pure state|state vector", "States": "quantum state",
        "Measurements": "measurement|measurements|povm|tomography|projective measurement",
        "QuantumErrorCorrection": "qec|error correction|error correcting|errorcorrecting|fault tolerant|fault tolerance|qldpc|fault distance|logical fault|syndrome|surface code|color code|repetition code|stabilizer code|css code|ldpc",
        "QuantumCircuits": "circuit|circuits|controlled gate|gate|hadamard|clifford|toffoli|qudit clifford|pauli group|qubit gate|circuit synthesis",
        "QuantumAlgorithms": "grover|shor|shor ecdlp|quantum algorithm|algorithms|phase estimation|qsvt|amplitude estimation|quantum fourier transform|qft circuit|qft",
        "Cryptography": "cryptography|qkd|key distribution|sifting|secret key|key rate",
        "QuantumComplexity": "query complexity|quantum query|interactive proof|nonlocal game|mip star|quantum automata",
        "QuantumProgramming": "quantum program|quantum programming|quantum hoare|qasm|evaluator|type checker|typechecker",
        "GraphicalCalculus": "zx calculus|spider fusion|zx diagram",
        "ResourceTheory": "resource theory|resource monotone",
        "ResourceTheory.Entanglement": "entanglement|schmidt|entangled|distillation",
        "QuantumErrorCorrection.CSSCodes": "css code|css codes|csscode|css condition",
        "QuantumErrorCorrection.StabilizerCodes": "stabilizer code|stabilizer codes",
        "QuantumErrorCorrection.BivariateBicycleCodes": "bivariate bicycle|bb code",
        "QuantumErrorCorrection.HypergraphProductCodes": "hypergraph product|hgp code",
        "QuantumErrorCorrection.ToricCodes": "toric code|toric codes",
        "QuantumErrorCorrection.SurfaceCodes": "surface code|surface codes",
        "Operators": "unitary group|trace inequality|hermitian matrix",
    },
    "QuantumMechanics": {
        "Operators.SpectralTheory": "spectral theorem|spectral measure|spectral theory|operator spectrum",
        "Operators.AngularMomentum": "angular momentum|spin operator",
        "HilbertSpaces.TensorProducts": "tensor product|tensorproduct",
        "HilbertSpaces": "hilbert space|hilbert spaces",
        "Qubit": "qubit|bloch sphere", "HarmonicOscillator": "harmonic oscillator",
        "Operators": "self adjoint|momentum operator|schrodinger operator|observable",
        "Foundations": "gleason|contextuality|kochen specker|bell inequality|born rule",
        "OpenSystems": "open quantum system|open system|lindblad",
        "QuantumDynamics": "adiabatic|unitary evolution|schrodinger equation|quantum backflow",
        "QuantumSystem": "quantum system|wavefunction|wave function",
    },
    "QFT": {
        "VertexOperatorAlgebras": "vertex operator|vertex algebra|borcherds|heisenberg voa|virasoro|voa|voas",
        "OperatorProductExpansion": "operator product expansion|ope",
        "VertexOperatorAlgebras.Moonshine": "moonshine|monster griess|monstrous",
        "Euclidean.GlimmJaffe": "glimm jaffe|pphi2|polynomial interaction",
        "Euclidean.GaussianFreeField": "gaussian free field|gff",
        "Euclidean.Reconstruction": "osterwalder schrader|os reconstruction|wightman|wick rotation|schwinger os",
        "Euclidean.ReflectionPositivity": "reflection positivity|reflection positive",
        "YangMills": "yang mills|yangmills|su2 gauge",
        "AlgebraicQFT": "algebraic qft|aqft|haag kastler|local net",
        "Renormalization": "renormalization|renormalisation|connes kreimer|ck hopf",
        "PerturbationTheory.FeynmanDiagrams": "feynman diagram|feynman diagrams|feynman graph",
        "PerturbationTheory.WickContraction": "wick contraction",
        "CelestialAmplitudes": "celestial holography|celestial amplitude|shadow transform",
        "SupersymmetricGaugeTheory": "seiberg witten|super yang mills",
        "MatrixModels": "bfss|matrix model", "GaugeTheory": "gauge theory|gauge invariance",
    },
    "LatticeQFT": {
        "WilsonAction": "wilson action|wilson loop|wilson lattice",
        "GaugeFields": "gauge field|gaugefield|holonomy|gauge connection|su3 concrete",
        "MassGap": "mass gap|massgap|strong coupling",
        "GibbsMeasures": "gibbs|partition function",
    },
    "Relativity": {
        "General.Schwarzschild": "schwarzschild", "General": "general relativity|einstein equation|einstein tensor|teleparallel|tetrad",
        "LorentzGroup": "lorentz group|lorentz transformation|lorentz boost",
        "Fermions.Dirac": "dirac spinor|dirac fermion",
        "Poincare": "poincare group", "Causality": "causal cone|light cone|causality",
    },
    "ClassicalFieldTheory": {
        "Local.FirstVariation": "first variation",
        "GaugeTheory": "gauge field|gauge transformation|gauge theory",
        "WaveEquation": "wave equation|classical string",
        "KleinGordon": "klein gordon", "GreenOperator": "green operator",
    },
    "StatisticalMechanics": {
        "CanonicalEnsemble": "canonical ensemble|equipartition|canonical measure",
        "MicroCanonicalEnsemble": "microcanonical ensemble",
        "IsingModel": "ising|lee yang|ferromagnetic|spin glass",
        "GibbsMeasures": "gibbs|detailed balance|dlr|gibbs variational",
        "StochasticDynamics": "markov semigroup|markov chain|mcmc|langevin",
        "KineticTheory": "vlasov|landau damping|mean field limit",
        "FluctuationTheorems": "fluctuation theorem|dft moment body",
        "LatticeModels": "lattice gas|honeycomb|lattice model|random cluster|classical on",
        "ReflectionPositivity": "reflection positivity",
    },
    "CondensedMatter": {
        "TensorNetworks.MatrixProductStates": "mps|matrix product state|matrix product states|parent hamiltonian",
        "TensorNetworks.PEPS": "peps|projected entangled pair",
        "TensorNetworks": "tensor network|tensor networks",
        "Topology.QuantumHall": "laughlin|quantum hall|fock laughlin",
        "LatticeModels": "lattice model|spin glass|ising|quantum cellular automata|qca",
        "ManyBody": "lennard jones|many body|manybody", "BandTheory": "band gap|band structure|kronig penney",
    },
    "FluidDynamics": {"Euler":"euler|incompressible euler", "NavierStokes":"navier stokes|leray hopf", "KineticTheory":"vlasov|landau damping|boltzmann equation"},
    "Thermodynamics": {"IdealGas":"ideal gas|boyles law|boyle law", "Temperature":"temperature|celsius", "Adsorption":"adsorption|langmuir"},
    "Cosmology": {"FLRW":"friedmann|flrw|scale factor"},
    "Electromagnetism": {"PlasmaPhysics":"vlasov|electrostatic vlasov|landau damping|plasma", "Charge":"coulomb|couloubconstant|charge density", "Kinematics":"electromagnetic field|faraday tensor"},
    "Units": {"DimensionalAnalysis":"dimensional analysis|dimensionalanalysis|buckingham pi|dimensionless", "SI":"si base|si units|si system|isq|units system"},
    "Particles": {"StandardModel":"standard model", "StandardModel.GaugeGroup":"standard model gauge group", "BeyondTheStandardModel":"beyond standard model"},
    "Mathematics": {"Distribution":"distribution space|tempered distribution|schwartz|distributions", "Probability":"probability|kolmogorov|bochner minlos", "FunctionalAnalysis":"spectral theorem|spectral theory|bounded operator|hille yosida|functional analysis|unbounded operator|spectral measure", "PartialDifferentialEquations":"elliptic|de giorgi|sobolev|dispersive", "Calculus":"differentiation|automatic differentiation", "DifferentialGeometry":"diffeology", "InnerProductSpace":"inner product space|hilbert space"},
}

# Context of specialized public projects where terse artifact names carry little
# information (for example 'Main.lean'). A project name is weaker evidence than
# the local source identifier; keep this distinction in the persisted basis.
AREA_TOPICS = {
    "QuantumInfo": {
        "QuantumErrorCorrection":"quantum error correction|quantum fault tolerance",
        "QuantumAlgorithms":"quantum algorithms|quantum optimization",
        "QuantumProgramming":"quantum program verification|quantum programming",
        "QuantumCircuits":"quantum circuits|quantum circuit synthesis|quantum computing|qubit circuit geometry",
        "QuantumComplexity":"quantum complexity|quantum automata|query complexity",
        "Cryptography":"quantum cryptography",
        "GraphicalCalculus":"graphical quantum reasoning|categorical quantum mechanics",
    },
    "QFT":{"VertexOperatorAlgebras":"vertex algebras|vertex operator algebras", "AlgebraicQFT":"algebraic qft", "Euclidean":"constructive qft", "Renormalization":"renormalization", "CelestialAmplitudes":"celestial amplitudes"},
    "QuantumMechanics":{"Foundations":"quantum foundations", "QuantumDynamics":"quantum adiabatic|quantum dynamics", "OpenSystems":"open quantum systems"},
    "Relativity":{"General":"general relativity|mathematical relativity"},
    "StatisticalMechanics":{"KineticTheory":"kinetic / plasma physics", "GibbsMeasures":"gibbs measures"},
    "Electromagnetism":{"PlasmaPhysics":"plasma physics"},
    "CondensedMatter":{"TensorNetworks":"tensor networks", "ManyBody":"lennard"},
    "Mathematics":{"Distribution":"distributions", "PartialDifferentialEquations":"elliptic pde", "DifferentialGeometry":"diffeology", "FunctionalAnalysis":"spectral theorem", "Probability":"probability foundations|probability / analysis"},
}
PROJECT_TOPICS = {
    "troyjlee/quantum-query-complexity":"QuantumInfo.QuantumComplexity.QueryComplexity",
    "nasa-jpl/propertykindcalculus":"Units.PhysicalQuantities",
    "ecyrbe/lean-units":"Units.DimensionalAnalysis", "ericeallen/lambda-s":"Units.UnitConversion",
    "or4nge19/spinglass":"CondensedMatter.SpinGlasses", "or4nge19/mcmc":"StatisticalMechanics.StochasticDynamics",
    "elazarg/rank-r":"QuantumInfo.Channels.PositiveMaps",
    "scisolv/weingarten-lean":"Mathematics.Probability.UnitaryIntegration",
    "alektronnik/quantum4lean":"QuantumInfo.QuantumSimulation",
    "yang-mills-group/openai-ym-20261028":"QFT.YangMills",
    "xiyin137/osreconstruction":"QFT.Euclidean.Reconstruction",
    "mrdouglasny/gff":"QFT.Euclidean.GaussianFreeField",
    "mrdouglasny/osforgff":"QFT.Euclidean.GaussianFreeField",
    "mrdouglasny/gaussian-field":"QFT.Euclidean.GaussianFreeField",
    "mrdouglasny/pphi2":"QFT.Euclidean.GlimmJaffe",
    "mrdouglasny/seiberg-witten":"QFT.SupersymmetricGaugeTheory",
    "mrdouglasny/reflection-positivity":"StatisticalMechanics.ReflectionPositivity",
    "mrdouglasny/gibbs-variational":"StatisticalMechanics.GibbsMeasures",
    "mrdouglasny/lee-yang":"StatisticalMechanics.IsingModel",
    "mrdouglasny/markov-semigroups":"StatisticalMechanics.StochasticDynamics",
    "mrdouglasny/hille-yosida":"Mathematics.FunctionalAnalysis",
    "mrdouglasny/spectral-positivity":"Mathematics.FunctionalAnalysis",
    "mrdouglasny/lgt":"LatticeQFT", "lecopivo/numlean":"Mathematics.NumericalAnalysis",
    "lionsr/tnlean":"CondensedMatter.TensorNetworks",
    "openai/navierstokesandeuler":"FluidDynamics",
    "fedor-popov/lean_voa":"QFT.VertexOperatorAlgebras",
    "jstoobysmith/thomson-n-8-warrant":"ClassicalMechanics.PointParticle",
    "verifiedqc/shorecdlp":"QuantumInfo.QuantumAlgorithms",
    "qudeleap/lean-quantumalg":"QuantumInfo.QuantumAlgorithms",
    "yezhuoyang/logicq":"QuantumInfo.QuantumProgramming",
}

# These directory labels denote infrastructure irrespective of project subject.
# A file called 'TestsOfBellInequality' is not a test suite.
TOOLS = {
    "test":"Meta.Tests", "tests":"Meta.Tests", "unittests":"Meta.Tests", "testcases":"Meta.Tests",
    "tactic":"Meta.Tactics", "tactics":"Meta.Tactics", "lint":"Meta.Linters", "linters":"Meta.Linters",
    "scripts":"Meta.Tooling", "widgets":"Meta.Tooling", "widget":"Meta.Tooling", "lakefile":"Meta.Tooling",
    "comparator":"Meta.Verification", "verification":"Meta.Verification", "axiomcheck":"Meta.Verification",
    "judge":"Meta.Verification", "axiomaudit":"Meta.Verification",
}
MATH = {"formathlib":"Mathematics.ForMathlib", "mathlib":"Mathematics.ForMathlib", "mathlibcompat":"Mathematics.ForMathlib", "schwartz":"Mathematics.Distribution", "linearalgebra":"Mathematics.LinearAlgebra", "complexliegroups":"Mathematics.Groups", "scv":"Mathematics.SeveralComplexVariables", "grouptheory":"Mathematics.Groups", "numbertheory":"Mathematics.NumberTheory", "functionalanalysis":"Mathematics.FunctionalAnalysis"}

# These expressions denote the same physics object in more than one source
# area. E.g. a source package labelled QFT may still define the Lorentz group.
# Do not infer a cross-domain placement from overloaded words like "field",
# "Euler", "state", "channel", "charge", "ring" or the abbreviation "QFT".
CROSS_DOMAIN = {
    "ClassicalMechanics.DampedHarmonicOscillator":"damped harmonic oscillator",
    "ClassicalMechanics.Pendulum.SimplePendulum":"simple pendulum",
    "ClassicalMechanics.Pendulum":"double pendulum",
    "ClassicalMechanics.HamiltonianMechanics":"hamilton equations|hamiltonian mechanics",
    "ClassicalMechanics.Lagrangian":"euler lagrange",
    "ClassicalFieldTheory.KleinGordon":"klein gordon",
    "ClassicalFieldTheory.GreenOperator":"green operator",
    "CondensedMatter.IsingModel":"ising|ising model",
    "CondensedMatter.ManyBody":"lennard jones",
    "CondensedMatter.Topology.QuantumHall":"laughlin|quantum hall",
    "Cosmology.FLRW":"flrw|friedmann equation|friedmann lemaitre",
    "Electromagnetism.PlasmaPhysics":"vlasov|landau damping",
    "FluidDynamics.NavierStokes":"navier stokes|leray hopf",
    "LatticeQFT.WilsonAction":"wilson action|wilson loop",
    "Mathematics.Distribution":"schwartz map|schwartz space|tempered distribution",
    "Mathematics.Fourier":"fourier transform",
    "Mathematics.Probability":"kolmogorov extension|martingale",
    "Mathematics.MeasureTheory":"measurable space|measure theory",
    "Mathematics.RepresentationTheory":"group representation|lie representation",
    "Particles.StandardModel.HiggsBoson":"higgs boson",
    "Particles.FlavorPhysics.CKMMatrix":"ckm matrix",
    "Particles.NeutrinoPhysics":"neutrino oscillation",
    "QFT.VertexOperatorAlgebras":"vertex algebra|vertex operator algebra|vertex operators",
    "QFT.Euclidean.Reconstruction":"osterwalder schrader|wightman axiom",
    "QFT.PerturbationTheory.FeynmanDiagrams":"feynman diagram|feynman diagrams",
    "QuantumInfo.Channels":"quantum channel|kraus operator|completely positive trace preserving|amplitude damping",
    "QuantumInfo.Measurements":"quantum tomography|positive operator valued measure",
    "QuantumInfo.QuantumAlgorithms":"quantum fourier transform|shor algorithm",
    "QuantumInfo.QuantumCircuits":"quantum circuit|hadamard gate|clifford circuit",
    "QuantumInfo.QuantumErrorCorrection":"quantum error correction|stabilizer code|surface code|css code",
    "QuantumInfo.Entropy":"von neumann entropy",
    "QuantumMechanics.HilbertSpaces.TensorProducts":"hilbert tensor product",
    "QuantumMechanics.Operators.AngularMomentum":"angular momentum operator",
    "QuantumMechanics.Operators.SpectralTheory":"spectral theorem",
    "Relativity.Fermions.Dirac":"dirac spinor","Relativity.Fermions.Weyl":"weyl spinor",
    "Relativity.LorentzGroup":"lorentz group|lorentz transformation",
    "Relativity.Poincare":"poincare group",
    "Relativity.General.Schwarzschild":"schwarzschild",
    "StatisticalMechanics.CanonicalEnsemble":"canonical ensemble",
    "StatisticalMechanics.MicroCanonicalEnsemble":"microcanonical ensemble",
    "Thermodynamics.IdealGas":"ideal gas",
    "Units.DimensionalAnalysis":"buckingham pi",
}

# Exact local project components resolve overloaded identifiers that cannot be
# inferred from one word across all physics projects. These are source path
# rules, not additional catalog role claims.
PROJECT_COMPONENTS = {
    "fedor-popov/lean_voa": {
        "DeligneAudit":"QFT.VertexOperatorAlgebras.DeligneSeries",
        "Classification":"QFT.VertexOperatorAlgebras.Classification",
        "Moonshine":"QFT.VertexOperatorAlgebras.Moonshine",
        "MoonshineCFSG":"QFT.VertexOperatorAlgebras.Moonshine",
        "Huang":"QFT.VertexOperatorAlgebras.TensorCategories",
        "Modularity":"QFT.VertexOperatorAlgebras.Modularity",
        "AffineGeneral":"QFT.VertexOperatorAlgebras.AffineAlgebras",
        "OPE":"QFT.VertexOperatorAlgebras.OperatorProducts",
    },
    "yang-mills-group/openai-ym-20261028": {
        "RG08":"QFT.YangMills.Renormalization", "RG12":"QFT.YangMills.Renormalization",
        "RG05Readout":"QFT.YangMills.Renormalization", "WilsonBulk":"LatticeQFT.WilsonAction",
        "OPE":"QFT.OperatorProductExpansion",
    },
    "qeclean/qeclean": {
        "CSS":"QuantumInfo.QuantumErrorCorrection.CSSCodes",
        "Stabilizer":"QuantumInfo.QuantumErrorCorrection.StabilizerCodes",
        "Color":"QuantumInfo.QuantumErrorCorrection.ColorCodes",
        "Repetition":"QuantumInfo.QuantumErrorCorrection.RepetitionCodes",
        "Surface":"QuantumInfo.QuantumErrorCorrection.SurfaceCodes",
    },
    "yezhuoyang/logicq": {
        "GF2":"Mathematics.LinearAlgebra.FiniteFields", "GF2Rank":"Mathematics.LinearAlgebra.FiniteFields",
        "Algebra":"Mathematics.LinearAlgebra",
        "Toric":"QuantumInfo.QuantumErrorCorrection.ToricCodes",
        "Surface":"QuantumInfo.QuantumErrorCorrection.SurfaceCodes",
        "ChainQ":"QuantumInfo.QuantumErrorCorrection.CSSCodes",
        "BBCode":"QuantumInfo.QuantumErrorCorrection.BivariateBicycleCodes",
        "HGPCode":"QuantumInfo.QuantumErrorCorrection.HypergraphProductCodes",
        "LiftedProduct":"QuantumInfo.QuantumErrorCorrection.LiftedProductCodes", "Compiler":"QuantumInfo.QuantumProgramming.Compilers",
        "QASM":"QuantumInfo.QuantumProgramming.Compilers", "TypeChecker":"QuantumInfo.QuantumProgramming.TypeSystems",
    },
    "quair/lean-qit": {
        "Coding":"QuantumInfo.Capacity", "OneShot":"QuantumInfo.OneShotInformation",
        "Security":"QuantumInfo.Cryptography", "Nonlocality":"QuantumMechanics.Foundations",
        "HigherOrder":"QuantumInfo.Channels", "States":"QuantumInfo.States",
    },
    "or4nge19/spinglass": {
        "Parisi":"CondensedMatter.SpinGlasses.ParisiFormula", "FiniteGibbs":"StatisticalMechanics.GibbsMeasures",
        "Replicas":"CondensedMatter.SpinGlasses", "Common":"Mathematics.Probability",
    },
    "nasa-jpl/propertykindcalculus": {
        "iso80000":"Units.SI", "uncertainty":"Units.MeasurementUncertainty",
        "dimension":"Units.DimensionalAnalysis", "torch":"Units.PhysicalQuantities",
    },
    "hxrts/stat-mech": {
        "MeanField":"StatisticalMechanics.MeanFieldModels",
        "Hamiltonian":"StatisticalMechanics.CanonicalEnsemble",
    },
    "lionsr/qiclean": {
        "Algebra":"Mathematics.LinearAlgebra", "Analysis":"Mathematics.Analysis", "Topology":"Mathematics.Topology",
        "QPF":"QuantumInfo.Channels", "Kraus":"QuantumInfo.Channels",
    },
    "lionsr/tnlean": {
        "Algebra":"Mathematics.LinearAlgebra", "PiAlgebra":"Mathematics.LinearAlgebra",
        "QCA":"CondensedMatter.LatticeModels.QuantumCellularAutomata",
        "MPDO":"CondensedMatter.TensorNetworks.MatrixProductStates", "PEPS":"CondensedMatter.TensorNetworks.PEPS",
    },
    "qudeleap/lean-quantumalg": {
        "Factoring":"QuantumInfo.QuantumAlgorithms.Factoring",
        "EllipticCurve":"QuantumInfo.QuantumAlgorithms.DiscreteLogarithms",
        "HiddenSubgroup":"QuantumInfo.QuantumAlgorithms.HiddenSubgroups",
        "AmplitudeEstimation":"QuantumInfo.QuantumAlgorithms.AmplitudeEstimation",
        "PhaseEstimation":"QuantumInfo.QuantumAlgorithms.PhaseEstimation",
    },
    "openai/math": {
        "SLE":"StatisticalMechanics.SchrammLoewnerEvolution",
        "FKMaps":"StatisticalMechanics.RandomClusterModel",
        "ClassicalON":"StatisticalMechanics.SpinModels",
        "Honeycomb":"StatisticalMechanics.LatticeModels",
        "HoneycombCorridor":"StatisticalMechanics.LatticeModels",
        "HoneycombChords":"StatisticalMechanics.LatticeModels",
        "StripMass":"StatisticalMechanics.LatticeModels",
        "BFSS":"QFT.MatrixModels", "CKS":"Relativity.General",
    },
}

MATH_NAMESPACES = {
    "Nat":"Mathematics.ForMathlib", "Fin":"Mathematics.ForMathlib.Fin", "List":"Mathematics.ForMathlib.List",
    "Finset":"Mathematics.ForMathlib", "Multiset":"Mathematics.ForMathlib", "Finsupp":"Mathematics.Modules",
    "ContinuousLinearMap":"Mathematics.Analysis.Normed", "NormedSpace":"Mathematics.Analysis.Normed",
    "TwoSidedIdeal":"Mathematics.RingTheory", "Polynomial":"Mathematics.RingTheory",
    "SchwartzMap":"Mathematics.Distribution", "MeasureTheory":"Mathematics.MeasureTheory",
    "ProbabilityTheory":"Mathematics.Probability", "Measure":"Mathematics.MeasureTheory",
}

SPLIT_ACRONYMS = re.compile(r"([A-Z]+)([A-Z][a-z])")
SPLIT_CASE = re.compile(r"([a-z0-9])([A-Z])")
WORDS = re.compile(r"[^\W_]+", re.UNICODE)


@lru_cache(maxsize=65536)
def tokens(text):
    return tuple(WORDS.findall(SPLIT_CASE.sub(r"\1 \2", SPLIT_ACRONYMS.sub(r"\1 \2", text)).lower()))


@dataclass(frozen=True)
class Place:
    topic: str
    basis: str
    evidence: str
    material: str


def catalog_topics():
    data = json.loads((WEB / "data/APIMap.json").read_text())
    topics = set()
    for row in data["directories"] + data["nodes"]:
        parts = row["path"].split("/")
        if parts[0] in {"Physlib", "PhyslibAlpha"}:
            parts = parts[1:]
        if parts:
            topics.add(".".join(parts))
    return topics


def native_source_index():
    document = json.loads((WEB / "public/roadmap-view/roadmap-data.json").read_text())
    modules = defaultdict(set)
    declarations = defaultdict(set)
    stack = [document["tree"]]
    while stack:
        node = stack.pop()
        stack.extend(node.get("children", []))
        path = node["path"]
        if not path or not any(link.get("source") in {"Physlib","PhyslibAlpha"} for link in node.get("moduleLinks", [])):
            continue
        subject = path.split(".", 1)[0]
        parts = path.split(".")
        for length in range(2,min(len(parts),4)+1):
            modules[subject,tuple(parts[-length:])].add(path)
        for d in node.get("decls", []):
            if d["source"] in {"Physlib","PhyslibAlpha"} and "." in d["name"]:
                declarations[d["name"]].add(path)
    return ({key:next(iter(paths)) for key,paths in modules.items() if len(paths)==1},
            {key:next(iter(paths)) for key,paths in declarations.items() if len(paths)==1})


def build_rules(native):
    rules = defaultdict(dict)
    for subject, mapping in ALIASES.items():
        for tail, expressions in mapping.items():
            for expr in expressions.split("|"):
                rules[subject][tokens(expr)] = subject + "." + tail
    # A distinctive folder name can make an exact match without an alias. Only
    # use unambiguous native names: e.g. two distinct AngularMomentum folders.
    candidates = defaultdict(set)
    for path in native:
        if "." not in path:
            continue
        subject, _, _ = path.partition(".")
        phrase = tokens(path.rsplit(".", 1)[-1])
        if len(phrase) > 1 or (len(phrase[0]) >= 6 and phrase[0] not in {"invariants", "special", "general", "specific", "solution", "examples", "internal", "koszul", "normalorder", "euclidean", "definitions", "integration", "topology", "mathematics"}):
            candidates[subject, phrase].add(path)
    for (subject, phrase), paths in candidates.items():
        if phrase in {('normal','order'),('specific','cases')}:
            continue
        if len(paths) == 1:
            rules[subject].setdefault(phrase, next(iter(paths)))
    for topic, expressions in CROSS_DOMAIN.items():
        for expr in expressions.split("|"):
            rules["*"][tokens(expr)] = topic
    return rules


class Classifier:
    def __init__(self, registry=None, native=None):
        self.native = native if native is not None else catalog_topics()
        self.native_modules, self.native_declarations = native_source_index()
        self.rules = build_rules(self.native)
        self.width = {key:max(map(len, expressions), default=1) for key, expressions in self.rules.items()}
        records = registry if registry is not None else json.loads((WEB / "scripts/roadmap-project-registry.json").read_text())
        self.registry = {(r["repository"].lower(),r["revision"],r["subject"]):r for r in records}

    @lru_cache(maxsize=131072)
    def match(self, subject, text):
        words = tokens(text)
        rules = self.rules.get(subject, {})
        for size in range(min(len(words), self.width.get(subject, 0)), 0, -1):
            for start in range(len(words)-size+1):
                window = words[start:start+size]
                if window in rules:
                    return rules[window], " ".join(window)
        return None

    def identifier(self, subject, segment):
        local = self.match(subject, segment)
        cross = self.match("*", segment)
        if not cross:
            return local
        if not local:
            return cross
        # Equal expressions favor authored Physlib/PhyslibAlpha folder names.
        # A longer local expression beats a shorter match such as Fourier in QFTCircuit.
        if (len(cross[1].split()) > len(local[1].split())
            or (cross[1] == local[1] and cross[0] in self.native and local[0] not in self.native)):
            return cross
        return local

    def module(self, repo, revision, subject, path):
        r = self.registry.get((repo.lower(),revision,subject), {})
        role = r.get("role","").lower()
        material = "mathematics" if subject == "Mathematics" else "physics"
        if any(tag in role for tag in ("educational","benchmark","course")):
            material = "education"
        segments = path.removesuffix(".lean").split("/")
        for segment in reversed(segments):
            # In published submission packages a comparator solution may contain
            # the headline physics theorem. Only dedicated tool directories
            # and standalone infrastructure names are classified as tooling.
            compact = "".join(tokens(segment))
            if compact in TOOLS:
                return Place(TOOLS[compact], "support-path", segment, "tooling")
            if compact in MATH:
                return Place(MATH[compact], "support-path", segment, "mathematics")
        # A declared source hierarchy is stronger evidence than an overall
        # registry subject. For example the NASA metrology examples explicitly
        # mirror Physlib's ClassicalMechanics and Electromagnetism trees.
        for i, segment in enumerate(segments[:-1]):
            if segment in self.native and "." not in segment and segment != subject and segment not in {"QFT","Units","Meta","Mathematics"}:
                qualified = segment
                for later in segments[i+1:]:
                    candidate = qualified+"."+later
                    if candidate in self.native:
                        qualified = candidate
                    else:
                        match = self.identifier(segment,later)
                        if match and match[0].startswith(segment+"."):
                            qualified = match[0]
                return Place(qualified,"source-subject-path","/".join(segments[i:]),material)
        for length in range(min(len(segments),4),1,-1):
            tail = tuple(segments[-length:])
            topic = self.native_modules.get((subject,tail))
            if topic:
                return Place(topic,"native-module-path","/".join(tail)+".lean",material)
        component_rules = PROJECT_COMPONENTS.get(repo.lower(), {})
        if repo.lower() == "fedor-popov/lean_voa" and "DeligneAudit" in segments:
            if re.search(r"(?:Data|Chk|Check)[0-9]", segments[-1]):
                material = "supporting-data"
        for i in range(len(segments)-1, -1, -1):
            segment = segments[i]
            if segment in component_rules:
                topic = component_rules[segment]
                return Place(topic,"file-name" if i == len(segments)-1 else "directory-name",segment,
                             "mathematics" if topic.startswith("Mathematics.") else material)
            # Ignore repository-wide package names here: they reflect the same
            # scope as the project, not local evidence for an individual file.
            if i == 0 and len(segments) > 1 and "".join(tokens(segment)) == "".join(tokens(repo.split("/")[-1])):
                continue
            result = self.identifier(subject,segment)
            if result:
                topic, _ = result
                return Place(topic, "file-name" if i == len(segments)-1 else "directory-name",segment, "mathematics" if topic.startswith("Mathematics.") else material)
        repo_topic = PROJECT_TOPICS.get(repo.lower())
        if repo_topic and (repo_topic.split(".")[0] == subject or repo.lower()=="scisolv/weingarten-lean"):
            return Place(repo_topic,"project-scope",repo,"mathematics" if repo_topic.startswith("Mathematics.") else material)
        area = r.get("area","")
        for tail, phrases in AREA_TOPICS.get(subject,{}).items():
            if any(phrase in area.lower() for phrase in phrases.split("|")):
                return Place(subject+"."+tail,"catalogue-area",area,material)
        return Place(subject,"catalogue-area",area or subject,material)

    def declaration(self, subject, module, name):
        native_home = self.native_declarations.get(name)
        if native_home and (native_home.split(".")[0] == subject or len(name.split(".")) >= 3):
            return Place(native_home,"native-declaration-name",name,
                         "mathematics" if native_home.startswith("Mathematics.") else module.material)
        if module.material in {"tooling","mathematics"} and module.basis == "support-path":
            return module
        if module.basis == "source-subject-path":
            subject = module.topic.split(".",1)[0]
        pieces = name.split(".")
        # Root namespaces in the source express the actual mathematical object.
        # A physics-specific named operation still takes priority over its host.
        namespace_topic = MATH_NAMESPACES.get(pieces[0]) if len(pieces) > 1 else None
        for index in range(len(pieces)-1, -1, -1):
            piece = pieces[index]
            hit = self.identifier(subject,piece)
            if not hit:
                continue
            topic, phrase = hit
            if topic == module.topic or module.topic.startswith(topic+"."):
                return module
            # A single broad word inside a lemma (such as gate_id) should not
            # move a result out of a more precisely evidenced source folder.
            is_local = module.basis in {"file-name","directory-name"}
            if is_local and not topic.startswith(module.topic+".") and len(phrase.split()) == 1:
                continue
            return Place(topic,"declaration-name" if index == len(pieces)-1 else "namespace",piece, "mathematics" if topic.startswith("Mathematics.") else module.material)
        if namespace_topic and namespace_topic != module.topic:
            return Place(namespace_topic,"namespace",pieces[0],"mathematics")
        return module


# A repository has one entry point, even when its declarations belong to
# several topics. These decisions capture a project's scientific purpose
# where generated calculations, generic helpers or a shared example would
# otherwise overwhelm a simple plurality of declarations.
REVIEWED_HOMES = {
    "adambornemann-glitch/Spectra": ("Mathematics.FunctionalAnalysis", "The library develops unbounded operators, their spectra and functional calculus for quantum mechanics."),
    "Alektronnik/M4TH": ("LatticeQFT.WilsonAction", "The two included SU(3) packages construct the group and use it in the Wilson lattice action."),
    "ATOMSLab/LeanChemicalTheories": ("Thermodynamics.Adsorption", "Its Langmuir and BET adsorption models give the chemical theory a concrete home alongside its ideal-gas and dimensional-analysis modules."),
    "ATOMSLab/LeanLJ": ("CondensedMatter.ManyBody", "The Lennard–Jones potential and particle interaction calculation are the package's physical example."),
    "doxtor6/MerLean-examples": ("QuantumInfo.QuantumErrorCorrection", "The QEC1 source formalizes fault-tolerant gauging, logical faults and code distances."),
    "Fedor-Popov/Lean_VOA": ("QFT.VertexOperatorAlgebras", "The project develops the vertex operator algebra theory used by its classification, Deligne-series, modularity and moonshine subprojects."),
    "fpvandoorn/BonnAnalysis": ("Mathematics.Distribution", "The catalogue selects distribution and Fourier analysis from this course, including test functions and convergence of distributions."),
    "gecrooks/PhysicsAI": ("StatisticalMechanics.FluctuationTheorems", "The fluctuation-theorem moment-body development is the larger of its two indexed physics workstreams."),
    "GoldenPhysicsProject/GPPVerify2": ("QFT.CelestialAmplitudes", "Celestial holography is the largest of the selected physics subtrees."),
    "Hayata-Yamasaki-Group/lean-quantum": ("QuantumInfo.Operators", "Its source connects quantum states and information quantities through operator and matrix trace inequalities."),
    "hxrts/stat-mech": ("StatisticalMechanics", "The project joins Hamiltonian, mean-field and continuum theories under statistical mechanics; Navier–Stokes is one part of the continuum branch."),
    "lecopivo/SciLean": ("ClassicalMechanics", "The indexed physics examples include ballistic motion, pendula, N-body dynamics and the harmonic oscillator."),
    "LionSR/QICLean": ("QuantumInfo.Channels", "The project's largest scientific development is its channel theory, including Kraus maps, dilation and channel structure."),
    "LionSR/TNLean": ("CondensedMatter.TensorNetworks", "Matrix product states, projected entangled-pair states and canonical forms all belong to this tensor-network library."),
    "mcdoll/DispersiveEquations": ("Mathematics.Distribution", "Its Bessel-potential and Sobolev developments supply distribution-theoretic foundations for dispersive PDE."),
    "mcdoll/DynamicalSystems": ("ClassicalMechanics.HamiltonianMechanics", "The selected mechanics files study Hamiltonian dynamics, stability and flows."),
    "mrdouglasny/bochner": ("Mathematics.Probability", "The Bochner–Minlos and probability-measure construction is the project's purpose."),
    "mrdouglasny/gaussian-field": ("QFT.Euclidean.GaussianFreeField", "The project builds Gaussian fields and covariances for Euclidean field theory."),
    "mrdouglasny/GFF": ("QFT.Euclidean.GaussianFreeField", "Its source builds the Gaussian free field and the bridge to the Euclidean axioms."),
    "mrdouglasny/lgt": ("LatticeQFT", "Connections, lattice observables, Wilson action and mass-gap arguments form a single lattice gauge theory development."),
    "mrdouglasny/pphi2": ("QFT.Euclidean.GlimmJaffe", "Its polynomial field and Osterwalder–Schrader axioms develop the constructive two-dimensional model."),
    "mrdouglasny/seiberg-witten": ("QFT.SupersymmetricGaugeTheory", "The source organizes SU(2) matter, beta functions and monodromy around Seiberg–Witten theory."),
    "N-Y-L/axiom-physics": ("QuantumMechanics.QuantumDynamics", "The consolidated adiabatic-theorem and quantum-backflow projects share quantum dynamics."),
    "oliver-butterley/SpectralThm": ("Mathematics.FunctionalAnalysis", "The target is the spectral theorem for bounded normal operators on Hilbert space."),
    "openai/math": ("CondensedMatter.Topology.QuantumHall", "In the selected physics corpus, the Laughlin-state developments are the largest single topic and span several packages."),
    "openai/NavierStokesAndEuler": ("FluidDynamics.NavierStokes", "The repository contains both fluid equations; its largest proof development concerns Navier–Stokes breakdown."),
    "QECLean/QECLean": ("QuantumInfo.QuantumErrorCorrection", "The stabilizer, CSS, surface, toric and other code families share quantum error correction."),
    "QuAIR/Lean-QIT": ("QuantumInfo", "Its coding, hypothesis testing, one-shot, asymptotic and higher-order channel interfaces cover quantum information theory as a whole."),
    "QudeLeap/Lean-QuantumAlg": ("QuantumInfo.QuantumAlgorithms", "Its quantum algorithm implementations depend on the library's circuit, primitive and resource-analysis layers."),
    "QudeLeap/Lean-QuantumAlg-Bench": ("QuantumInfo.QuantumAlgorithms", "The benchmark's circuit, Fourier and estimation tasks are companion material for the quantum algorithms library."),
    "RemyDegenne/kolmogorov_extension4": ("Mathematics.Probability", "The project proves Kolmogorov's extension theorem for consistent probability distributions."),
    "ShirleyLIYuxin/Lean4PHYS": ("Units", "The SI and physical-units foundation is the largest of its selected teaching examples."),
    "urikol/QuantumOptimization": ("QuantumInfo.QuantumAlgorithms", "The algorithms and optimization objectives are the organizing purpose, with Ising models as an application."),
    "velvetmonkey/hamiltonian-lean": ("ClassicalMechanics.HamiltonianMechanics", "Its principal result is a Hamiltonian-mechanics formalization."),
    "xiyin137/OSreconstruction": ("QFT.Euclidean.Reconstruction", "The public reconstruction theorems connect the Euclidean and Wightman formulations of quantum field theory."),
    "yang-mills-group/OpenAI-YM-20261028": ("QFT.YangMills", "The top-level jointExistence statement and its supporting corpus concern Yang–Mills theory."),
    "yezhuoyang/LogicQ": ("QuantumInfo.QuantumProgramming.Compilers", "The repository builds a verified QEC compilation stack across several quantum languages; its ChainQ modules supply error-correcting codes."),
}


def choose_project_home(repository, counts, fallback):
    """Choose a populated exact topic; counts are declaration placements, not files."""
    if not counts:
        return fallback, "No declarations in this snapshot; the source files are grouped under "+fallback+"."
    reviewed = REVIEWED_HOMES.get(repository)
    if reviewed and counts.get(reviewed[0]):
        topic, basis = reviewed
    else:
        # Reusable Mathlib and tooling folders may contain infrastructure for a
        # far smaller main theorem. Only choose those when no domain topic exists.
        scientific = [t for t in counts if not t.startswith("Meta.") and ".ForMathlib" not in t]
        topic = min(scientific or counts, key=lambda t:(-counts[t],t))
        basis = "Largest populated scientific topic in the indexed source."
    return topic, f"{basis} {counts[topic]:,} of {sum(counts.values()):,} declarations are placed directly here."


def write_project_homes(conn):
    counts = defaultdict(dict)
    for repo, topic, n in conn.execute("""
        SELECT p.repository, COALESCE(dp.topic,mp.topic), count(*)
        FROM declarations d JOIN files f ON f.id=d.file_id JOIN projects p ON p.id=f.project_id
        JOIN module_placements mp ON mp.module_id=f.id
        LEFT JOIN declaration_placements dp ON dp.declaration_id=d.id GROUP BY 1,2
    """):
        counts[repo][topic] = n
    fallbacks = {}
    for repo, subject, _ in conn.execute("""
        SELECT p.repository,f.subject,count(*) FROM projects p JOIN files f ON p.id=f.project_id
        GROUP BY 1,2 ORDER BY 1,3 DESC,2
    """):
        fallbacks.setdefault(repo,subject)
    rows = [(repo,*choose_project_home(repo,counts[repo],subject)) for repo,subject in fallbacks.items()]
    conn.execute("DELETE FROM project_homes")
    conn.executemany("INSERT INTO project_homes(repository,topic,basis) VALUES (?,?,?)",rows)


SCHEMA = """
CREATE TABLE IF NOT EXISTS module_placements(
    module_id INTEGER PRIMARY KEY REFERENCES files(id) ON DELETE CASCADE,
    topic TEXT NOT NULL, basis TEXT NOT NULL, evidence TEXT NOT NULL, material TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS declaration_placements(
    declaration_id INTEGER PRIMARY KEY REFERENCES declarations(id) ON DELETE CASCADE,
    topic TEXT NOT NULL, basis TEXT NOT NULL, evidence TEXT NOT NULL, material TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS project_homes(repository TEXT PRIMARY KEY, topic TEXT NOT NULL, basis TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS module_placements_topic ON module_placements(topic, module_id);
CREATE INDEX IF NOT EXISTS declaration_placements_topic ON declaration_placements(topic, declaration_id);
"""


def materialize(database):
    """Replace both placement tables atomically from one audited source snapshot."""
    classifier = Classifier()
    conn = sqlite3.connect(database, timeout=60)
    conn.execute("PRAGMA foreign_keys=ON")
    conn.executescript(SCHEMA)
    try:
        conn.execute("BEGIN")
        version = conn.execute("PRAGMA data_version").fetchone()[0]
        modules = {}
        module_rows = []
        for file_id, repo, rev, subject, path in conn.execute("""
            SELECT f.id, p.repository, p.revision, f.subject, f.path
            FROM files f JOIN projects p ON p.id=f.project_id ORDER BY f.id
        """):
            result = classifier.module(repo, rev, subject, path)
            modules[file_id] = subject, result
            module_rows.append((file_id,result.topic,result.basis,result.evidence,result.material))
        overrides = []
        count = 0
        for decl_id,file_id,name in conn.execute("SELECT id,file_id,name FROM declarations ORDER BY id"):
            subject, inherited = modules[file_id]
            chosen = classifier.declaration(subject,inherited,name)
            if chosen != inherited:
                overrides.append((decl_id,chosen.topic,chosen.basis,chosen.evidence,chosen.material))
            count += 1
        conn.commit()
        # The source scanner may revise rows while a reader is working. A new
        # run can retry that case without exposing stale or partial placements.
        conn.execute("BEGIN IMMEDIATE")
        if conn.execute("PRAGMA data_version").fetchone()[0] != version:
            raise RuntimeError("Source audit changed during placement; rerun against the completed audit")
        conn.execute("DELETE FROM declaration_placements")
        conn.execute("DELETE FROM module_placements")
        conn.executemany("INSERT INTO module_placements VALUES (?,?,?,?,?)",module_rows)
        conn.executemany("INSERT INTO declaration_placements VALUES (?,?,?,?,?)",overrides)
        write_project_homes(conn)
        conn.commit()
        return len(modules), count, len(overrides)
    finally:
        conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DB)
    parser.add_argument("--project-homes-only", action="store_true", help="Choose project homes from the existing audited placements")
    args = parser.parse_args()
    if not args.db.is_file():
        parser.error(f"Missing source audit {args.db}")
    if args.project_homes_only:
        with sqlite3.connect(args.db, timeout=60) as conn:
            conn.executescript(SCHEMA)
            conn.execute("BEGIN IMMEDIATE")
            write_project_homes(conn)
            projects = conn.execute("SELECT count(*) FROM project_homes").fetchone()[0]
        print(f"Selected one home for each of {projects} repositories.")
        raise SystemExit(0)
    modules, decls, overrides = materialize(args.db)
    print(f"Classified {modules:,} source files and {decls:,} declarations ({overrides:,} declaration overrides).")
