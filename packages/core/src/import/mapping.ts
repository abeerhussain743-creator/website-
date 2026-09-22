import { normalizePakistanPhone } from "../phone.js";

export type StudentImportRow = {
  rowNumber: number;
  fullName?: string;
  registrationNo?: string;
  groupName?: string;
  subgroupName?: string;
  guardianName?: string;
  guardianPhone?: string;
  relation?: string;
  language?: string;
};

export type ImportField =
  | "fullName"
  | "registrationNo"
  | "groupName"
  | "subgroupName"
  | "guardianName"
  | "guardianPhone"
  | "relation"
  | "language"
  | "skip";

const HEADER_ALIASES: Record<ImportField, string[]> = {
  fullName: ["name", "student name", "full name", "student", "naam", "طالب علم", "اسم"],
  registrationNo: ["reg", "registration", "roll", "roll no", "reg no", "admission no", "id"],
  groupName: ["class", "batch", "course", "grade", "group", "jamaat"],
  subgroupName: ["section", "subgroup", "cohort", "group"],
  guardianName: ["parent", "father", "mother", "guardian", "parent name", "wali"],
  guardianPhone: ["phone", "mobile", "whatsapp", "contact", "parent phone", "guardian phone", "number"],
  relation: ["relation", "relationship"],
  language: ["language", "lang", "preferred language"],
  skip: [],
};

export function detectColumnMapping(headers: string[]): Record<string, ImportField> {
  const mapping: Record<string, ImportField> = {};
  const used = new Set<ImportField>();

  // Prefer phone fields when header clearly looks like a phone column
  const orderedFields: ImportField[] = [
    "guardianPhone",
    "fullName",
    "registrationNo",
    "groupName",
    "subgroupName",
    "guardianName",
    "relation",
    "language",
  ];

  for (const header of headers) {
    const normalized = header.trim().toLowerCase();
    let matched: ImportField = "skip";
    for (const field of orderedFields) {
      if (used.has(field)) continue;
      const aliases = HEADER_ALIASES[field];
      if (aliases.some((a) => normalized === a || normalized.includes(a))) {
        matched = field;
        used.add(field);
        break;
      }
    }
    mapping[header] = matched;
  }
  return mapping;
}

export type RowValidation =
  | { ok: true; row: Required<Pick<StudentImportRow, "fullName" | "guardianPhone">> & StudentImportRow }
  | { ok: false; rowNumber: number; errors: string[] };

export function validateImportRow(row: StudentImportRow): RowValidation {
  const errors: string[] = [];
  if (!row.fullName?.trim()) errors.push("Missing student name");
  const phone = row.guardianPhone ? normalizePakistanPhone(row.guardianPhone) : null;
  if (!phone) errors.push("Invalid Pakistan phone");
  if (!row.groupName?.trim()) errors.push("Missing class/batch");
  if (errors.length) return { ok: false, rowNumber: row.rowNumber, errors };
  return {
    ok: true,
    row: {
      ...row,
      fullName: row.fullName!.trim(),
      guardianPhone: phone!,
      groupName: row.groupName!.trim(),
    },
  };
}

export function applyMapping(
  headers: string[],
  values: string[],
  mapping: Record<string, ImportField>,
  rowNumber: number,
): StudentImportRow {
  const row: StudentImportRow = { rowNumber };
  headers.forEach((header, i) => {
    const field = mapping[header] ?? "skip";
    if (field === "skip") return;
    const value = values[i]?.trim() || undefined;
    (row as Record<string, unknown>)[field] = value;
  });
  return row;
}
