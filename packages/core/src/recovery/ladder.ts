export type RecoveryStepDef = {
  dayOffset: number;
  channel: "WHATSAPP_TEXT" | "WHATSAPP_VOICE" | "VOICE_CALL" | "TASK";
  templateBody: string;
};

export const DEFAULT_RECOVERY_LADDER: RecoveryStepDef[] = [
  {
    dayOffset: -3,
    channel: "WHATSAPP_TEXT",
    templateBody:
      "Assalam o alaikum {{guardian_name}}. Friendly reminder: {{student_name}}'s fee of {{amount_due}} is due on {{due_date}}. Pay here: {{payment_link}}",
  },
  {
    dayOffset: 1,
    channel: "WHATSAPP_TEXT",
    templateBody:
      "Assalam o alaikum {{guardian_name}}. {{student_name}}'s fee {{amount_due}} is overdue. Please pay: {{payment_link}}",
  },
  {
    dayOffset: 5,
    channel: "WHATSAPP_TEXT",
    templateBody:
      "Reminder: fee for {{student_name}} is overdue. Late fee may apply. Pay now: {{payment_link}}",
  },
  {
    dayOffset: 10,
    channel: "WHATSAPP_TEXT",
    templateBody:
      "Message from the Principal regarding {{student_name}}'s pending fee {{amount_due}}. Please clear dues: {{payment_link}}",
  },
  {
    dayOffset: 15,
    channel: "VOICE_CALL",
    templateBody: "Urdu fee reminder call for {{student_name}}, amount {{amount_due}}.",
  },
  {
    dayOffset: 20,
    channel: "TASK",
    templateBody: "Staff personal call required for overdue invoice {{invoice_number}}.",
  },
];

/** Phase 1 text-only steps (skip voice until Phase 2). */
export function textOnlyLadder(steps = DEFAULT_RECOVERY_LADDER): RecoveryStepDef[] {
  return steps.filter((s) => s.channel === "WHATSAPP_TEXT" || s.channel === "TASK");
}

export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((b - a) / 86_400_000);
}

export function nextRecoveryStep(input: {
  dueDate: Date;
  today: Date;
  paid: boolean;
  promiseToPayOn?: Date | null;
  completedOffsets: number[];
  steps: RecoveryStepDef[];
}): RecoveryStepDef | null {
  if (input.paid) return null;
  if (input.promiseToPayOn && input.today < input.promiseToPayOn) return null;
  const daysOverdue = daysBetween(input.dueDate, input.today);
  const candidates = input.steps
    .filter((s) => s.dayOffset <= daysOverdue)
    .filter((s) => !input.completedOffsets.includes(s.dayOffset))
    .sort((a, b) => a.dayOffset - b.dayOffset);
  return candidates[0] ?? null;
}
