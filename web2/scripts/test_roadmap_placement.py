import unittest
from roadmap_placement import Classifier, choose_project_home


class RoadmapPlacementTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.classifier = Classifier()

    def module(self, repo, subject, path):
        rev = next(rev for r,rev,s in self.classifier.registry if r == repo.lower() and s == subject)
        return self.classifier.module(repo,rev,subject,path)

    def test_quantum_information_and_support(self):
        source = "yezhuoyang/LogicQ"
        self.assertEqual(self.module(source,"QuantumInfo","ChainQ/Toric/Basic.lean").topic,
                         "QuantumInfo.QuantumErrorCorrection.ToricCodes")
        for path in ("ChainQ/BBCode/Basic.lean","ChainQ/BBCode/Checked.lean"):
            self.assertEqual(self.module(source,"QuantumInfo",path).topic,
                             "QuantumInfo.QuantumErrorCorrection.BivariateBicycleCodes")
        self.assertEqual(self.module(source,"QuantumInfo","ChainQ/Core/Code.lean").topic,
                         "QuantumInfo.QuantumErrorCorrection.CSSCodes")
        field = self.module(source,"QuantumInfo","ChainQ/Algebra/GF2.lean")
        self.assertEqual((field.topic, field.material), ("Mathematics.LinearAlgebra.FiniteFields","mathematics"))
        self.assertEqual(self.module(source,"QuantumInfo","Compiler/QASM/Parser.lean").topic,
                         "QuantumInfo.QuantumProgramming.Compilers")

    def test_actual_native_folders(self):
        self.assertEqual(self.module("lecopivo/SciLean","ClassicalMechanics","examples/HarmonicOscillator.lean").topic,
                         "ClassicalMechanics.HarmonicOscillator")
        channel = self.module("LionSR/QICLean","QuantumInfo","QICLean/Channel/Basic.lean")
        self.assertEqual(channel.topic, "QuantumInfo.Channels")
        state = self.module("Hayata-Yamasaki-Group/lean-quantum","QuantumInfo","Quantum/QuantumMechanics/QuantumState.lean")
        entropy = self.classifier.declaration("QuantumInfo",state,"Quantum.QuantumState.finiteVonNeumannEntropy")
        self.assertEqual((entropy.topic,entropy.basis),("QuantumInfo.Entropy","declaration-name"))

    def test_distinguish_scientific_meanings_of_ope(self):
        self.assertEqual(self.module("yang-mills-group/OpenAI-YM-20261028","QFT","YM/OPE/Cards/Literal.lean").topic,
                         "QFT.OperatorProductExpansion")
        self.assertEqual(self.module("Fedor-Popov/Lean_VOA","QFT","VOA/Core/OPE.lean").topic,
                         "QFT.VertexOperatorAlgebras.OperatorProducts")

    def test_overloaded_words_in_voa(self):
        classification = self.module("Fedor-Popov/Lean_VOA","QFT","VOA/Classification/COne/McRaeO5Monodromy.lean")
        self.assertEqual(classification.topic,"QFT.VertexOperatorAlgebras.Classification")
        koszul = self.module("Fedor-Popov/Lean_VOA","QFT","VOA/Examples/KoszulConcreteGrading.lean")
        self.assertEqual(koszul.topic,"QFT.VertexOperatorAlgebras")

    def test_cross_domain_and_companion_material(self):
        # Same source repo split between the two physical topics in its public code.
        self.assertEqual(self.module("openai/math","CondensedMatter","lean/OAI/Analysis/Laughlin/Main.lean").topic,
                         "CondensedMatter.Topology.QuantumHall")
        self.assertEqual(self.module("openai/math","QFT","lean/OAI/RepresentationTheory/VertexAlgebra/MinimalComparator.lean").topic,
                         "QFT.VertexOperatorAlgebras")
        audit = self.module("Fedor-Popov/Lean_VOA","QFT","VOA/DeligneAudit/D4FusionRealizationCharacterTwoData00.lean")
        self.assertEqual((audit.topic,audit.material), ("QFT.VertexOperatorAlgebras.DeligneSeries","supporting-data"))
        generic = self.module("yang-mills-group/OpenAI-YM-20261028","QFT","YM/Next/Work.lean")
        # An explicitly named physical or mathematical concept overrides the opaque path.
        self.assertEqual(self.classifier.declaration("QFT",generic,"Example.schwarzschild").topic,
                         "Relativity.General.Schwarzschild")
        self.assertEqual(self.classifier.declaration("QFT",generic,"Finset.sum_aux").material,"mathematics")


class ProjectHomeTests(unittest.TestCase):
    def test_scientific_project_and_its_largest_generated_subtree(self):
        counts = {"QFT.VertexOperatorAlgebras":9, "QFT.VertexOperatorAlgebras.Classification":99}
        topic, basis = choose_project_home("Fedor-Popov/Lean_VOA",counts,"QFT")
        self.assertEqual(topic,"QFT.VertexOperatorAlgebras")
        self.assertIn("9 of 108",basis)

    def test_selection_must_be_populated_and_unique(self):
        counts = {"Meta.Tooling":20,"QFT.GaugeTheory":2,"QFT.YangMills":2}
        topic, _ = choose_project_home("sample/repo",counts,"QFT")
        self.assertEqual(topic,"QFT.GaugeTheory")
        topic, _ = choose_project_home("Fedor-Popov/Lean_VOA",{"QFT":3},"QFT")
        self.assertEqual(topic,"QFT")
        topic, basis = choose_project_home("sample/empty",{},"QFT")
        self.assertEqual(topic,"QFT")
        self.assertIn("No declarations",basis)


if __name__ == "__main__":
    unittest.main()
