"""Place external Lean sources among Physlib topics using auditable name/path evidence.

Run from any directory after the source audit: python3 scripts/roadmap_placement.py
A declaration inherits its module unless its identifier supports a more specific
placement. A topic path records a reading location, never proof status or ownership.
"""

import argparse
import json
import logging
import re
import sqlite3
from collections import defaultdict
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from urllib.parse import unquote, urlsplit

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
    data = json.loads((WEB / "data/RoadmapNativeFolders.json").read_text())
    return {row["path"] for row in data["folders"]} | {
        path.replace("/", ".") for path in data["quantumInfoFolders"]
    }


def native_source_index():
    data = json.loads((WEB / "data/RoadmapNativeDeclarations.json").read_text())
    modules = defaultdict(set)
    declarations = defaultdict(set)
    for file, rows in data["files"].items():
        path = file.removesuffix(".lean").removeprefix("Physlib/").removeprefix("PhyslibAlpha/").replace("/", ".")
        # This subtree records one project's internal namespaces. Its local
        # names (e.g. Algebra, Normed.Operator) cannot identify unrelated work.
        if path == "Mathematics.TauCeti" or path.startswith("Mathematics.TauCeti."):
            continue
        parts = path.split(".")
        for length in range(2,min(len(parts),4)+1):
            modules[parts[0],tuple(parts[-length:])].add(path)
        for name, _, _ in rows:
            if "." in name:
                declarations[name].add(path)
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
        if "." not in path or path.startswith("Mathematics.TauCeti."):
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


REVIEW = WEB / "data/roadmap-audit/project-review.json"
REGISTRY = WEB / "scripts/roadmap-project-registry.json"


def inside(topic, folder):
    return topic == folder or topic.startswith(folder + ".")


class ReviewedFolders:
    """Resolve source-level classifications against the approved project and real file tree."""

    def __init__(self, review, registry, folders):
        self.review = review
        self.folders = folders | {""}
        self.homes = {repo: self.nearest(entry["folder"]) for repo, entry in review.items()}
        self.subjects = defaultdict(set)
        self.revisions = set()
        self.sources = {}
        self.primary_subject = {}
        for row in registry:
            repo = row["repository"]
            self.subjects[repo].add(row["subject"])
            self.revisions.add((repo, row["revision"]))
        if set(review) != set(self.subjects):
            raise ValueError("Review and source registry disagree: " +
                             str(sorted(set(review).symmetric_difference(self.subjects))))
        for repo, entry in review.items():
            url = urlsplit(entry["source"])
            root = "/" + repo + "/blob/"
            if url.hostname != "github.com" or not url.path.startswith(root):
                raise ValueError(f"{repo}: invalid reviewed source {url.geturl()}")
            revision, _, path = url.path[len(root):].partition("/")
            if (repo, revision) not in self.revisions or not path.endswith(".lean"):
                raise ValueError(f"{repo}: reviewed source is outside its audited revisions")
            self.sources[repo] = (revision, unquote(path))

    @classmethod
    def load(cls):
        return cls(json.loads(REVIEW.read_text()), json.loads(REGISTRY.read_text()), catalog_topics())

    @lru_cache(maxsize=8192)
    def nearest(self, topic):
        while topic and topic not in self.folders:
            topic = topic.rpartition(".")[0]
        return topic

    def module_context(self, repo, revision, path, subject, classified, basis):
        home = self.homes[repo]
        if (revision, path) == self.sources[repo]:
            return home, True
        # Independently registered source scopes have their own subject.
        # A source tree explicitly naming a full Physlib subject (e.g. NASA's
        # ForPhysLib/ClassicalMechanics) is likewise stronger than a repo default.
        candidate = self.nearest(classified)
        if candidate and inside(candidate, "Mathematics.TauCeti") and not inside(home, "Mathematics.TauCeti"):
            candidate = ""
        if basis == "source-subject-path" and candidate:
            return candidate, False
        home_subject = home.partition(".")[0]
        if (len(self.subjects[repo]) > 1 and subject not in {home_subject, self.primary_subject.get(repo)}
                and subject in self.folders):
            return subject, False
        # A specifically classified sibling module still belongs in its own
        # native branch (e.g. Entropy/ in a quantum channels library).
        # A broad ancestor such as Operators remains at its reviewed home.
        if basis in {"file-name", "directory-name", "native-module-path"} and candidate and (
                candidate.partition(".")[0] == home_subject and not inside(home, candidate)):
            return candidate, False
        return home, False

    def destination(self, context, topic):
        anchor, representative = context
        if representative:
            return anchor
        candidate = self.nearest(topic)
        if candidate and inside(candidate, anchor):
            if inside(candidate, "Mathematics.TauCeti") and not inside(anchor, "Mathematics.TauCeti"):
                return anchor
            return candidate
        return anchor


def write_project_homes(conn):
    reviewed = ReviewedFolders.load()
    repos = {repo for repo, in conn.execute("SELECT DISTINCT repository FROM projects")}
    if repos - reviewed.review.keys():
        raise RuntimeError("Unreviewed source projects: " + str(sorted(repos - reviewed.review.keys())))
    for repo in sorted(repos):
        original = reviewed.review[repo]["folder"]
        effective = reviewed.homes[repo]
        if original != effective:
            logging.getLogger(__name__).warning(
                "%s: reviewed folder %s is absent from the native tree. Using %s on the Roadmap. Review the placement.",
                repo, original, effective or "the root",
            )
    for table in ("module_placements", "declaration_placements"):
        if "public_topic" not in {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN public_topic TEXT")
    modules = list(conn.execute("""
        SELECT f.id,p.repository,p.revision,f.path,f.subject,mp.topic,mp.basis
        FROM files f JOIN projects p ON p.id=f.project_id
        JOIN module_placements mp ON mp.module_id=f.id
    """))
    for _, repo, rev, path, subject, _, _ in modules:
        if reviewed.sources[repo] == (rev, path):
            reviewed.primary_subject[repo] = subject
    contexts = {}
    placements = []
    for ident, repo, rev, path, subject, topic, basis in modules:
        context = reviewed.module_context(repo, rev, path, subject, topic, basis)
        contexts[ident] = context
        placements.append((reviewed.destination(context, topic), ident))
    conn.executemany("UPDATE module_placements SET public_topic=? WHERE module_id=?", placements)
    overrides = [(reviewed.destination(contexts[module], topic), ident) for ident, module, topic
                 in conn.execute("""SELECT d.id,d.file_id,dp.topic FROM declaration_placements dp
                                     JOIN declarations d ON d.id=dp.declaration_id""")]
    conn.executemany("UPDATE declaration_placements SET public_topic=? WHERE declaration_id=?", overrides)
    conn.execute("DELETE FROM project_homes")
    conn.executemany("INSERT INTO project_homes(repository,topic,basis) VALUES (?,?,?)",
                     [(repo, reviewed.homes[repo], reviewed.review[repo]["scope"]) for repo in sorted(repos)])


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
        conn.executemany("INSERT INTO module_placements(module_id,topic,basis,evidence,material) VALUES (?,?,?,?,?)",module_rows)
        conn.executemany("INSERT INTO declaration_placements(declaration_id,topic,basis,evidence,material) VALUES (?,?,?,?,?)",overrides)
        write_project_homes(conn)
        conn.commit()
        return len(modules), count, len(overrides)
    finally:
        conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DB)
    parser.add_argument("--project-homes-only", action="store_true", help="Apply reviewed public folders to the existing audited placements")
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
