import { createHash } from "crypto";

export function voiceNoteTextHash(text: string, language: string): string {
  return createHash("sha256")
    .update(`${language}\n${text.trim()}`)
    .digest("hex")
    .slice(0, 32);
}

export function personalizeVoiceScript(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

/** Guardians on WHATSAPP_VOICE get a short text companion with the audio. */
export function companionTextForVoice(fullText: string): string {
  const trimmed = fullText.trim();
  if (trimmed.length <= 120) return trimmed;
  return `${trimmed.slice(0, 117)}…`;
}
