/**
 * Normalize Pakistan mobile numbers to E.164 (+92…).
 * Accepts: 03xx-xxxxxxx, 03xxxxxxxxx, 923xxxxxxxxx, +923xxxxxxxxx
 */
export function normalizePakistanPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  let n = digits.startsWith("+") ? digits.slice(1) : digits;
  if (n.startsWith("0") && n.length === 11) {
    n = `92${n.slice(1)}`;
  }
  if (n.startsWith("92") && n.length === 12) {
    return `+${n}`;
  }
  if (n.length === 10 && n.startsWith("3")) {
    return `+92${n}`;
  }
  return null;
}

export function isValidPakistanPhone(raw: string): boolean {
  return normalizePakistanPhone(raw) !== null;
}
