import importlib.util
import json
from pathlib import Path
import unittest


SCRIPT = Path(__file__).with_name('build-roadmap-native-declarations.py')
spec = importlib.util.spec_from_file_location('native_declarations', SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class NativeDeclarations(unittest.TestCase):
    def test_source_command_inclusions_and_lines(self):
        text = '''namespace Physics
/-! lemma notADeclaration -/
@[simp] private theorem exampleResult : True := by trivial
class Quantity (a : Type) where
  mass : Nat
instance named : Quantity Bool := ⟨0⟩
instance (priority := 500) : Quantity Nat := ⟨1⟩
example : True := by trivial
informal_lemma note := "open question"
semiformal_result plan := "not a Lean result"
noncomputable def _root_.other := 1
class abbrev TwoQuantities (a : Type) := Quantity a, Quantity Bool
alias getMass := Quantity.mass
end Physics
'''
        self.assertEqual(module.formal_declarations(text), [
            ['Physics.exampleResult', 'theorem', 3],
            ['Physics.Quantity', 'class', 4],
            ['Physics.named', 'instance', 6],
            ['Physics.«anonymous instance at line 7»', 'instance', 7],
            ['other', 'def', 11],
            ['Physics.TwoQuantities', 'class abbrev', 12],
            ['Physics.getMass', 'alias', 13],
        ])
        self.assertEqual(module.formal_declarations('import Mathlib\n'), [])

    def test_complete_pinned_inventory(self):
        data = json.loads(module.OUTPUT.read_text())
        inventory = json.loads(module.MANIFEST.read_text())
        self.assertEqual(data['repository'], inventory['repository'])
        self.assertEqual(data['revision'], inventory['revision'])
        self.assertEqual(set(data['files']), set(inventory['files']))
        self.assertIn('QED.indexList', [n for n, _, _ in data['files']['PhyslibAlpha/Particles/QED/Basic.lean']])
        for path, rows in data['files'].items():
            with self.subTest(path=path):
                lines = [line for _, _, line in rows]
                self.assertEqual(lines, sorted(set(lines)))
                self.assertTrue(all(name and kind in module.FORMAL_KINDS and line > 0 for name, kind, line in rows))


if __name__ == '__main__':
    unittest.main()
