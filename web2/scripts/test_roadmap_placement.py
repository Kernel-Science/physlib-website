import sqlite3
import unittest
from unittest.mock import patch
from roadmap_placement import Classifier, ReviewedFolders, SCHEMA, write_project_homes


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
    def setUp(self):
        self.rev = "1" * 40
        review = {"sample/repo": {
            "folder": "QuantumMechanics.Operators", "source": f"https://github.com/sample/repo/blob/{self.rev}/Spectral.lean"
        }}
        registry = [{"repository":"sample/repo","revision":self.rev,"subject":subject}
                    for subject in ["Mathematics","QFT","QuantumMechanics"]]
        folders = {"QuantumMechanics", "QuantumMechanics.Operators", "QuantumMechanics.Operators.SpectralTheory", "QuantumMechanics.HilbertSpaces",
                   "Mathematics", "Mathematics.TauCeti.Algebra", "QFT", "QFT.Euclidean", "ClassicalMechanics"}
        self.reviewed = ReviewedFolders(review, registry, folders)
        self.reviewed.primary_subject["sample/repo"] = "Mathematics"

    def placed(self, path, subject, topic, basis="directory-name"):
        context = self.reviewed.module_context("sample/repo", self.rev, path, subject, topic, basis)
        return self.reviewed.destination(context, topic)

    def test_cited_module_and_primary_scope_follow_review(self):
        self.assertEqual(self.placed("Spectral.lean","Mathematics","Mathematics"),"QuantumMechanics.Operators")
        self.assertEqual(self.placed("Basic.lean","Mathematics","Mathematics.TauCeti.Algebra"),"QuantumMechanics.Operators")
        self.assertEqual(self.placed("Operator.lean","QuantumMechanics","QuantumMechanics.Operators.SpectralTheory"),
                         "QuantumMechanics.Operators.SpectralTheory")
        self.assertEqual(self.placed("HilbertSpaces/Basic.lean","QuantumMechanics","QuantumMechanics.HilbertSpaces"),
                         "QuantumMechanics.HilbertSpaces")

    def test_removed_reviewed_folder_uses_surviving_ancestor_and_reports_original(self):
        repo = "sample/repo"
        review = {repo: {**self.reviewed.review[repo], "scope": "Operator spectral theory"}}
        registry = [{"repository":repo, "revision":self.rev, "subject":"QuantumMechanics"}]
        for folders, effective in [({"QuantumMechanics"}, "QuantumMechanics"), ({"QFT"}, "")]:
            with self.subTest(effective=effective), sqlite3.connect(":memory:") as db:
                reviewed = ReviewedFolders(review, registry, folders)
                db.executescript("""
                    CREATE TABLE projects(id INTEGER PRIMARY KEY, repository TEXT, revision TEXT);
                    CREATE TABLE files(id INTEGER PRIMARY KEY, project_id INTEGER, path TEXT, subject TEXT);
                    CREATE TABLE declarations(id INTEGER PRIMARY KEY, file_id INTEGER);
                """ + SCHEMA)
                db.execute("INSERT INTO projects VALUES(1,?,?)", (repo, self.rev))
                db.execute("INSERT INTO files VALUES(1,1,'Spectral.lean','QuantumMechanics')")
                db.execute("INSERT INTO declarations VALUES(17,1)")
                original = review[repo]["folder"]
                db.execute("INSERT INTO module_placements VALUES(1,?,'directory-name','','physics')", (original,))
                db.execute("INSERT INTO declaration_placements VALUES(17,?,'declaration-name','','physics')", (original,))
                with patch.object(ReviewedFolders, "load", return_value=reviewed), self.assertLogs("roadmap_placement", level="WARNING") as log:
                    write_project_homes(db)
                self.assertIn(repo, log.output[0])
                self.assertIn(original, log.output[0])
                self.assertIn("Using " + (effective or "the root"), log.output[0])
                self.assertEqual(db.execute("SELECT topic FROM project_homes").fetchone(), (effective,))
                for table in ("module_placements", "declaration_placements"):
                    self.assertEqual(db.execute(f"SELECT topic,public_topic FROM {table}").fetchone(), (original,effective))
                self.assertEqual(review[repo]["folder"], "QuantumMechanics.Operators")

    def test_explicit_second_scope_and_native_subject_paths_survive(self):
        self.assertEqual(self.placed("Haag.lean","QFT","QFT.Euclidean"),"QFT.Euclidean")
        self.assertEqual(self.placed("ForPhysLib/ClassicalMechanics/Basic.lean","Mathematics",
                                    "ClassicalMechanics","source-subject-path"),"ClassicalMechanics")
        self.assertEqual(self.reviewed.destination(("Mathematics",False),"Mathematics.TauCeti.Algebra"),"Mathematics")


if __name__ == "__main__":
    unittest.main()
