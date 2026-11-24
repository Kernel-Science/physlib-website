// Selected modules from the public Lean physics projects in the formalization landscape.
// Pins tie each reader link to the same source used to extract its declaration names.
export const catalogueProjects = [
  {
    repository: "mrdouglasny/lgt",
    revision: "b8793ccf6a51e00e9e2b1685ba191b8626e37137",
    subject: "LatticeQFT",
    files: [
      "LGT/GaugeField/Connection.lean",
      "LGT/GaugeField/Holonomy.lean",
      "LGT/WilsonAction/GaugeInvariance.lean",
      "LGT/MassGap/StrongCoupling.lean",
    ],
  },
  {
    repository: "mrdouglasny/GFF",
    revision: "f3629bb8698938e65e82b4c5dd64c5a9510ce448",
    subject: "QFT",
    files: [
      "GFF/GFFConstruction.lean",
      "GFF/OSVerification.lean",
    ],
  },
  {
    repository: "mrdouglasny/OSforGFF",
    revision: "fef84a82937dfd2bb7f672108a72da329d3ef0fd",
    subject: "QFT",
    files: [
      "OSforGFF/Measure/GaussianFreeField.lean",
      "OSforGFF/Covariance/Propagator.lean",
      "OSforGFF/Instances/Dim4.lean",
    ],
  },
  {
    repository: "mrdouglasny/pphi2",
    revision: "03fc44ccab3f7dc2f086b47f03cbd2241b6f7fcd",
    subject: "QFT",
    files: [
      "Pphi2/Main.lean",
      "Pphi2/Polynomial.lean",
      "Pphi2/OSAxioms.lean",
    ],
  },
  {
    repository: "mrdouglasny/QFTFramework",
    revision: "95090320a5154e46d010357a97b75fa6b6a0d7ff",
    subject: "QFT",
    files: [
      "QFTFramework/QFTData.lean",
      "QFTFramework/SpacetimeData.lean",
      "QFTFramework/TheoryData.lean",
    ],
  },
  {
    repository: "mrdouglasny/seiberg-witten",
    revision: "57293619a0d508fb8d46a40aadcf8954b53bdd3e",
    subject: "QFT",
    files: [
      "SeibergWitten/Physics/SU2Matter.lean",
      "SeibergWitten/Physics/Monodromy.lean",
      "SeibergWitten/Physics/BetaFunction.lean",
    ],
  },
  {
    repository: "mrdouglasny/gaussian-field",
    revision: "1283a2721377a36e80672799fcc1f69a494c8ea0",
    subject: "QFT",
    files: [
      "GaussianField/Construction.lean",
      "GaussianField/IsGaussian.lean",
      "Cylinder/GreenFunction.lean",
    ],
  },
  {
    repository: "mrdouglasny/reflection-positivity",
    revision: "1cf718319c8f3b6ff3724a1a5781110aa9fc0630",
    subject: "StatisticalMechanics",
    files: [
      "ReflectionPositivity/Abstract.lean",
      "ReflectionPositivity/PhysicalHilbertSpace.lean",
      "ReflectionPositivity/TransferConstruction.lean",
    ],
  },
  {
    repository: "mrdouglasny/lee-yang",
    revision: "d48ee59243afb5e30a3de3ccc90eae2d51806537",
    subject: "StatisticalMechanics",
    files: [
      "LeeYang/Measure/IsingLeeYang.lean",
      "LeeYang/Examples/TwoSpin.lean",
    ],
  },
  {
    repository: "mrdouglasny/gibbs-variational",
    revision: "75e08d8aaca83bb090fc43855898991fbfc9abf3",
    subject: "StatisticalMechanics",
    files: [
      "GibbsVariational/Variational.lean",
      "GibbsVariational/GaussianEntropy.lean",
    ],
  },
  {
    repository: "Hayata-Yamasaki-Group/lean-quantum",
    revision: "bf1c4f6aaec84948f1a1c76c0728432813404a0f",
    subject: "QuantumInfo",
    files: [
      "Quantum/QuantumMechanics/QuantumState.lean",
      "Quantum/TraceInequality/JensenOperatorInequality.lean",
      "Quantum/TraceInequality/LownerHeinzTheorem.lean",
    ],
  },
  {
    repository: "LionSR/QICLean",
    revision: "aa64691428b8778b95a55ce039998a90a789c7d5",
    subject: "QuantumInfo",
    files: [
      "QICLean/Entropy/StrongSubadditivity.lean",
      "QICLean/QPF/Primitive.lean",
      "QICLean/Spectral/TransferOperatorGapNormalized.lean",
    ],
  },
  {
    repository: "LionSR/TNLean",
    revision: "fafa75e42af48847a029f222014ddf7d4ef360fe",
    subject: "CondensedMatter",
    files: [
      "TNLean/MPS/FundamentalTheorem/Basic.lean",
      "TNLean/MPS/ParentHamiltonian.lean",
      "TNLean/QCA/LocalAlgebra.lean",
    ],
  },
  {
    repository: "adomasbaliuka/formal-qkd",
    revision: "b0b88dbdc129303fed01d6fbc35df9bb53b91c51",
    subject: "QuantumInfo",
    files: [
      "FormalQKD/Sifting.lean",
      "FormalQKD/RuscaEqn.lean",
    ],
  },
  {
    repository: "QECLean/QECLean",
    revision: "ffb62c24e6d3bba8a095fb3aa4821654744d131e",
    subject: "QuantumInfo",
    files: [
      "QEC/Stabilizer/Codes/Color/Distance.lean",
      "QEC/Stabilizer/Codes/Repetition/Three.lean",
    ],
  },
  {
    repository: "troyjlee/quantum-query-complexity",
    revision: "df7f2e8199bd845a35a4200e0c74d964ec6b02b8",
    subject: "QuantumInfo",
    files: [
      "QuantumQueryComplexity/Basic.lean",
      "QuantumQueryComplexity/Composition/Main.lean",
      "QuantumQueryComplexity/Duality/Main.lean",
    ],
  },
  {
    repository: "ian-turner/QLean",
    revision: "e6b2386486e5702258b843e6b83039392361c891",
    subject: "QuantumInfo",
    files: [
      "QLean/Circuit/Type.lean",
      "QLean/Circuit/Semantics.lean",
    ],
  },
  {
    repository: "tannerduve/zxLean",
    revision: "ee1b2a407955aefc6f850f1c3dfeb2c6cd91bcd2",
    subject: "QuantumInfo",
    files: [
      "ZxCalculus/MultiQubit/DenotationalSemantics.lean",
      "ZxCalculus/MultiQubit/Soundness.lean",
      "ZxCalculus/MultiQubit/SpiderFusion.lean",
    ],
  },
];
