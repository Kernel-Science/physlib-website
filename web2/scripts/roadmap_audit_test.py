import unittest

from roadmap_audit import declarations


class LeanSourceDeclarations(unittest.TestCase):
    def test_admissions_and_names_are_local_to_actual_commands(self):
        text = """namespace A
@[simp] theorem same : True := by trivial
#check sorry
end A
namespace B
theorem same : True := by
  /- admit /- sorry -/ -/ sorry
def prose := "admit"
axiom assumed : Prop
end B"""
        rows, _ = declarations(text)
        self.assertEqual(rows, [
            (2,"A.same","theorem",0,0), (6,"B.same","theorem",1,0),
            (8,"B.prose","def",0,0), (9,"B.assumed","axiom",0,0),
        ])

    def test_quoted_commands_and_verso_documentation(self):
        text = """import Verso
def macroValue := \x60(command|
  theorem generated : False := by sorry)
#doc (Manual) "A chapter" =>
axiom set in the documentation.
def exampleName := "This is a code example"
"""
        rows, flags = declarations(text)
        self.assertEqual(rows, [(2,"macroValue","def",0,0)])
        self.assertFalse(flags)


if __name__ == "__main__":
    unittest.main()
