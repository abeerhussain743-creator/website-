import { addPaisa, paisa, percentOfPaisa, type Paisa } from "../money.js";

export type DiscountKind = "PERCENT" | "FIXED";

export type DiscountInput = {
  kind: DiscountKind;
  /** Percent (e.g. 10) or fixed paisa */
  value: number;
};

export type LateFeeRule =
  | { kind: "FIXED"; amountPaisa: number; capPaisa?: number }
  | { kind: "PER_DAY"; amountPaisa: number; capPaisa?: number };

export function applyDiscount(basePaisa: number, discount: DiscountInput): Paisa {
  if (basePaisa < 0) throw new Error("base cannot be negative");
  if (discount.value < 0) throw new Error("discount cannot be negative");
  if (discount.kind === "PERCENT") {
    if (discount.value > 100) throw new Error("percent discount cannot exceed 100");
    const cut = percentOfPaisa(basePaisa, discount.value);
    return paisa(basePaisa - cut);
  }
  return paisa(Math.max(0, basePaisa - discount.value));
}

export function applySiblingDiscount(
  basePaisa: number,
  siblingCount: number,
  percentPerSibling = 10,
  maxPercent = 30,
): Paisa {
  if (siblingCount <= 0) return paisa(basePaisa);
  const percent = Math.min(maxPercent, siblingCount * percentPerSibling);
  return applyDiscount(basePaisa, { kind: "PERCENT", value: percent });
}

export function calculateLateFee(
  outstandingPaisa: number,
  daysOverdue: number,
  rule: LateFeeRule,
): Paisa {
  if (daysOverdue <= 0 || outstandingPaisa <= 0) return paisa(0);
  let fee = 0;
  if (rule.kind === "FIXED") {
    fee = rule.amountPaisa;
  } else {
    fee = rule.amountPaisa * daysOverdue;
  }
  if (rule.capPaisa != null) fee = Math.min(fee, rule.capPaisa);
  return paisa(fee);
}

export function allocatePayment(
  invoiceBalances: Array<{ id: string; balancePaisa: number }>,
  paymentPaisa: number,
): Array<{ invoiceId: string; appliedPaisa: Paisa }> {
  if (paymentPaisa < 0) throw new Error("payment cannot be negative");
  let remaining = paymentPaisa;
  const allocations: Array<{ invoiceId: string; appliedPaisa: Paisa }> = [];
  for (const inv of invoiceBalances) {
    if (remaining <= 0) break;
    if (inv.balancePaisa <= 0) continue;
    const applied = Math.min(inv.balancePaisa, remaining);
    allocations.push({ invoiceId: inv.id, appliedPaisa: paisa(applied) });
    remaining -= applied;
  }
  return allocations;
}

export function sumPaisa(values: number[]): Paisa {
  return values.reduce<Paisa>((acc, v) => addPaisa(acc, v), paisa(0));
}

export * from "./installments.js";
