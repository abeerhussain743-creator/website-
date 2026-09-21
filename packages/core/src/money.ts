/** Amounts are always integer paisa (1 PKR = 100 paisa). Never use floats for money. */

export type Paisa = number & { readonly __brand: "paisa" };

export function paisa(amount: number): Paisa {
  if (!Number.isInteger(amount)) {
    throw new Error(`Money must be integer paisa, got ${amount}`);
  }
  return amount as Paisa;
}

export function pkrToPaisa(pkr: number): Paisa {
  if (!Number.isFinite(pkr)) throw new Error("Invalid PKR amount");
  return paisa(Math.round(pkr * 100));
}

export function paisaToPkr(amount: Paisa | number): number {
  return amount / 100;
}

/**
 * Pakistani grouping: PKR 1,85,000
 * Groups: last 3 digits, then pairs of 2.
 */
export function formatPkr(
  amountPaisa: number,
  opts?: { currency?: string; showCurrency?: boolean },
): string {
  const currency = opts?.currency ?? "PKR";
  const showCurrency = opts?.showCurrency ?? true;
  const sign = amountPaisa < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(amountPaisa));
  const whole = Math.floor(abs / 100);
  const fraction = abs % 100;
  const grouped = groupPakistani(whole);
  const body =
    fraction === 0 ? grouped : `${grouped}.${fraction.toString().padStart(2, "0")}`;
  return showCurrency ? `${sign}${currency} ${body}` : `${sign}${body}`;
}

function groupPakistani(n: number): string {
  const s = Math.trunc(n).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  let rest = s.slice(0, -3);
  const parts: string[] = [];
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) parts.unshift(rest);
  return `${parts.join(",")},${last3}`;
}

export function addPaisa(a: number, b: number): Paisa {
  return paisa(a + b);
}

export function percentOfPaisa(amount: number, percent: number): Paisa {
  // percent as basis points-friendly: 10 = 10%
  return paisa(Math.round((amount * percent) / 100));
}
