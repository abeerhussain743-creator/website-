export type EvalCase = {
  id: string;
  language: "UR" | "ROMAN_UR" | "EN";
  message: string;
  expectHandoff?: boolean;
  mustNotContain?: string[];
  mustContainAny?: string[];
};

/** At least 30 sample conversations for admissions fee grounding evals. */
export const ADMISSIONS_EVAL_CASES: EvalCase[] = [
  { id: "en-1", language: "EN", message: "What is the monthly fee for class 8?", mustContainAny: ["15,000", "15000", "PKR"] },
  { id: "en-2", language: "EN", message: "Do you have transport?", mustContainAny: ["transport", "van", "bus"] },
  { id: "en-3", language: "EN", message: "I want to talk to a person", expectHandoff: true },
  { id: "en-4", language: "EN", message: "Admission process?", mustContainAny: ["admission", "documents", "form"] },
  { id: "en-5", language: "EN", message: "What documents are required?", mustContainAny: ["B-Form", "document", "photo"] },
  { id: "en-6", language: "EN", message: "Is there a sibling discount?", mustContainAny: ["sibling", "discount"] },
  { id: "en-7", language: "EN", message: "School timings?", mustContainAny: ["am", "pm", "timing", "8"] },
  { id: "en-8", language: "EN", message: "Can I book a visit tomorrow?", mustContainAny: ["visit", "book"] },
  { id: "en-9", language: "EN", message: "Any lab fee?", mustContainAny: ["lab", "fee", "staff"] },
  { id: "en-10", language: "EN", message: "This is fraud nonsense", expectHandoff: true },
  { id: "ru-1", language: "ROMAN_UR", message: "Class 8 ki fee kitni hai?", mustContainAny: ["15,000", "15000", "PKR"] },
  { id: "ru-2", language: "ROMAN_UR", message: "Transport available hai?", mustContainAny: ["transport", "van"] },
  { id: "ru-3", language: "ROMAN_UR", message: "Insan se baat karni hai", expectHandoff: true },
  { id: "ru-4", language: "ROMAN_UR", message: "Admission ka process kya hai?", mustContainAny: ["admission", "form", "document"] },
  { id: "ru-5", language: "ROMAN_UR", message: "Timing batao", mustContainAny: ["8", "timing", "am"] },
  { id: "ru-6", language: "ROMAN_UR", message: "Visit book karna hai", mustContainAny: ["visit", "book"] },
  { id: "ru-7", language: "ROMAN_UR", message: "Sibling discount milta hai?", mustContainAny: ["sibling", "discount"] },
  { id: "ru-8", language: "ROMAN_UR", message: "Documents kya chahiye?", mustContainAny: ["B-Form", "document", "photo"] },
  { id: "ru-9", language: "ROMAN_UR", message: "Fee discount special dena", mustNotContain: ["free", "zero fee", "0 fee"], expectHandoff: true },
  { id: "ru-10", language: "ROMAN_UR", message: "Bakwas hai yeh", expectHandoff: true },
  { id: "ur-1", language: "UR", message: "آٹھویں جماعت کی فیس کیا ہے؟", mustContainAny: ["15,000", "15000", "PKR"] },
  { id: "ur-2", language: "UR", message: "ٹرانسپورٹ ہے؟", mustContainAny: ["transport", "van", "ٹرانسپورٹ"] },
  { id: "ur-3", language: "UR", message: "انسان سے بات کرنی ہے", expectHandoff: true },
  { id: "ur-4", language: "UR", message: "داخلہ کا طریقہ؟", mustContainAny: ["admission", "داخلہ", "form"] },
  { id: "ur-5", language: "UR", message: "اوقات کیا ہیں؟", mustContainAny: ["8", "timing", "am"] },
  { id: "ur-6", language: "UR", message: "وزٹ بک کریں", mustContainAny: ["visit", "book"] },
  { id: "ur-7", language: "UR", message: "بہن بھائی ڈسکاؤنٹ؟", mustContainAny: ["sibling", "discount"] },
  { id: "ur-8", language: "UR", message: "دستاویزات؟", mustContainAny: ["B-Form", "document", "photo"] },
  { id: "ur-9", language: "UR", message: "فیس معاف کر دو", mustNotContain: ["waived", "free forever"], expectHandoff: true },
  { id: "ur-10", language: "UR", message: "بیوقوف النظام", expectHandoff: true },
];

export const DEMO_KNOWLEDGE = [
  {
    id: "kb-fee",
    category: "fees",
    title: "Class 8 monthly fee",
    body: "Class 8 monthly tuition is PKR 15,000. Admission fee is PKR 10,000 (one-time).",
  },
  {
    id: "kb-transport",
    category: "transport",
    title: "Transport",
    body: "School van transport is available in Gulberg and DHA for PKR 4,000 per month.",
  },
  {
    id: "kb-timing",
    category: "timings",
    title: "Timings",
    body: "School timings are 8:00am to 2:00pm, Monday to Friday.",
  },
  {
    id: "kb-admission",
    category: "admission",
    title: "Admission process",
    body: "Fill the admission form, submit documents (B-Form, photos, previous result), then book an assessment visit.",
  },
  {
    id: "kb-docs",
    category: "documents",
    title: "Documents required",
    body: "Required documents: B-Form/CRC, 2 passport photos, previous school leaving certificate.",
  },
  {
    id: "kb-sibling",
    category: "fees",
    title: "Sibling discount",
    body: "Sibling discount is 10% on tuition for the second child.",
  },
];
