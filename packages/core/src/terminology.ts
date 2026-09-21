export type InstitutionType = "SCHOOL" | "COACHING_ACADEMY" | "TRAINING_CENTER";

export type TerminologyKey =
  | "group"
  | "subgroup"
  | "learner"
  | "term"
  | "guardian";

export type Terminology = Record<TerminologyKey, string>;

export const TERMINOLOGY_PRESETS: Record<InstitutionType, Terminology> = {
  SCHOOL: {
    group: "Class",
    subgroup: "Section",
    learner: "Student",
    term: "Session",
    guardian: "Parent",
  },
  COACHING_ACADEMY: {
    group: "Batch",
    subgroup: "Group",
    learner: "Student",
    term: "Session",
    guardian: "Parent",
  },
  TRAINING_CENTER: {
    group: "Course",
    subgroup: "Cohort",
    learner: "Trainee",
    term: "Intake",
    guardian: "Guardian / Self",
  },
};

export function terminologyForType(type: InstitutionType): Terminology {
  return { ...TERMINOLOGY_PRESETS[type] };
}

export function t(
  map: Terminology,
  key: TerminologyKey,
  opts?: { plural?: boolean },
): string {
  const label = map[key];
  if (opts?.plural) {
    if (label.includes(" / ")) return label;
    if (/(?:s|x|z|ch|sh)$/i.test(label)) return `${label}es`;
    if (/[^aeiou]y$/i.test(label)) return `${label.slice(0, -1)}ies`;
    return `${label}s`;
  }
  return label;
}
