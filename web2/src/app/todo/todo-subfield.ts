import type { TodoItem } from "@/lib/yaml";

const subjectsByNamespace: Record<string, string> = {
  ClassicalFieldTheory: "Classical Field Theory",
  ClassicalMechanics: "Classical Mechanics",
  Particles: "Particles",
  QuantumMechanics: "Quantum Mechanics",
  SpaceAndTime: "Space and Time",
  StringTheory: "String Theory",
  Units: "Units",
};

/** Use the Lean module's subject when the generated list supplies only a catch-all. */
export function todoSubfield(item: TodoItem): string {
  if (item.category !== "Other" && item.category !== "Physlib Alpha") return item.category;
  const [library, subject] = item.file.split(".");
  if (library === "QuantumInfo") return "Quantum Information";
  if (library === "Physlib" || library === "PhyslibAlpha") {
    return subjectsByNamespace[subject] ?? item.category;
  }
  return item.category;
}
