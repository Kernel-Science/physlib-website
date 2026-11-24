// Pinned Lean implementations, grouped by the physics of each selected file.
// Comparator challenge templates are excluded: these links go to solutions.
const reviewed = "4eaee87548250b2682affda7d05d947c05554bae";
const quantumInformation = "f5702854040e97fa7675c21ba37a9608f5f92dd3";

function mathModules(subject, revision, modules) {
  return {
    repository: "openai/math", revision, subject, moduleRoot: "lean/",
    files: modules.map((module) => `lean/OAI/${module}.lean`),
  };
}

export const openAIProjects = [
  mathModules("StatisticalMechanics", reviewed, [
    "Probability/Ising/Main", "Probability/ClassicalON/Main", "Probability/FKMaps/Convergence",
    "Probability/SLE/LowerPositivity", "Combinatorics/HoneycombCorridor/BridgeFiniteness",
    "Probability/Honeycomb/FreeEnergy", "Combinatorics/StripMass/Main",
    "Combinatorics/StripMass/PhysicalPorts", "Combinatorics/HoneycombChords/BridgeMass",
  ]),
  mathModules("Relativity", reviewed, ["Geometry/Relativity/CKS/ComparatorMain"]),
  mathModules("QFT", reviewed, [
    "RepresentationTheory/VertexAlgebra/MinimalComparator",
    "MathematicalPhysics/BFSS/GroundLine", "MathematicalPhysics/BFSS/GroundEnergy",
  ]),
  mathModules("CondensedMatter", reviewed, [
    "Analysis/LaughlinGap/Main", "Analysis/Laughlin/Main",
    "Analysis/LaughlinFock/Main", "Analysis/Laughlin/UniformGap",
  ]),
  mathModules("QuantumInfo", quantumInformation, [
    "InformationTheory/QuantumCircuit/Main", "InformationTheory/AmplitudeDamping/Main",
    "InformationTheory/SecretKey/Main", "InformationTheory/Entanglement/KeyRates",
  ]),
  {
    repository: "openai/NavierStokesAndEuler",
    revision: "f9e8bc5b38b6e212696e8a30e3e91517af887bbd",
    subject: "FluidDynamics",
    files: ["Euler/EulerSingularity.lean", "NavierStokes/ComparatorSolution.lean"],
    names: new Set([
      "EulerPacketInduction.exists_compact_smooth_euler_singularity",
      "NavierStokes.Comparator.navier_stokes_breakdown_R3",
      "NavierStokes.Comparator.navier_stokes_breakdown_periodic",
    ]),
  },
  {
    // The working group's public copy of the original pure Yang–Mills submission.
    repository: "yang-mills-group/OpenAI-YM-20261028",
    revision: "3456e5e75cf8d4cd558955a5c7638fba2d68f464",
    subject: "QFT", prefix: "YangMills.", files: ["Solution.lean"],
    names: new Set(["YangMills.jointExistence"]),
  },
];
