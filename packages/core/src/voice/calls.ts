export type VoiceCallWindow = {
  hour: number; // 0-23 local
  lastCallAt?: Date | null;
  now?: Date;
  maxGapDays?: number;
};

export function canPlaceVoiceCall(input: VoiceCallWindow): {
  ok: boolean;
  reason?: string;
} {
  const hour = input.hour;
  if (hour < 10 || hour >= 19) {
    return { ok: false, reason: "outside_calling_hours" };
  }
  const gapDays = input.maxGapDays ?? 3;
  if (input.lastCallAt) {
    const now = input.now ?? new Date();
    const ms = now.getTime() - input.lastCallAt.getTime();
    if (ms < gapDays * 24 * 60 * 60 * 1000) {
      return { ok: false, reason: "guardian_call_cooldown" };
    }
  }
  return { ok: true };
}

export type StructuredCallOutcome =
  | "answered"
  | "promised_date"
  | "dispute"
  | "wrong_number"
  | "callback_requested"
  | "no_answer"
  | "failed";

export function normalizeCallOutcome(raw: string | undefined | null): StructuredCallOutcome {
  const v = (raw ?? "").toLowerCase();
  if (v.includes("promis")) return "promised_date";
  if (v.includes("dispute")) return "dispute";
  if (v.includes("wrong")) return "wrong_number";
  if (v.includes("callback") || v.includes("call back")) return "callback_requested";
  if (v.includes("no_answer") || v.includes("no answer") || v.includes("missed"))
    return "no_answer";
  if (v.includes("fail")) return "failed";
  if (v.includes("answer")) return "answered";
  return "answered";
}
