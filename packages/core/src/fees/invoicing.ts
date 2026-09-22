import { applyDiscount, applySiblingDiscount, type DiscountInput } from "./index.js";
import { paisa, type Paisa } from "../money.js";

export type InvoiceLineInput = {
  description: string;
  amountPaisa: number;
  feeHeadKind?: string;
};

export function buildInvoiceTotals(input: {
  lines: InvoiceLineInput[];
  siblingCount?: number;
  extraDiscounts?: DiscountInput[];
  lateFeePaisa?: number;
}): {
  subtotalPaisa: Paisa;
  discountPaisa: Paisa;
  lateFeePaisa: Paisa;
  totalPaisa: Paisa;
} {
  const subtotal = input.lines.reduce((s, l) => s + l.amountPaisa, 0);
  let after = subtotal;
  if (input.siblingCount && input.siblingCount > 0) {
    after = applySiblingDiscount(after, input.siblingCount);
  }
  for (const d of input.extraDiscounts ?? []) {
    after = applyDiscount(after, d);
  }
  const discountPaisa = paisa(subtotal - after);
  const lateFeePaisa = paisa(input.lateFeePaisa ?? 0);
  return {
    subtotalPaisa: paisa(subtotal),
    discountPaisa,
    lateFeePaisa,
    totalPaisa: paisa(after + lateFeePaisa),
  };
}

export function invoiceNumber(prefix: string, seq: number, year = new Date().getFullYear()): string {
  return `${prefix}-${year}-${String(seq).padStart(5, "0")}`;
}

export function applyPaymentToInvoice(input: {
  totalPaisa: number;
  paidPaisa: number;
  paymentPaisa: number;
}): { paidPaisa: number; status: "PARTIALLY_PAID" | "PAID"; appliedPaisa: number } {
  if (input.paymentPaisa < 0) throw new Error("payment cannot be negative");
  const remaining = Math.max(0, input.totalPaisa - input.paidPaisa);
  const applied = Math.min(remaining, input.paymentPaisa);
  const paidPaisa = input.paidPaisa + applied;
  return {
    paidPaisa,
    appliedPaisa: applied,
    status: paidPaisa >= input.totalPaisa ? "PAID" : "PARTIALLY_PAID",
  };
}

/** Idempotent credit: same key twice never double-credits. */
export function shouldAcceptPaymentCallback(
  seenKeys: Set<string>,
  idempotencyKey: string,
): boolean {
  if (seenKeys.has(idempotencyKey)) return false;
  seenKeys.add(idempotencyKey);
  return true;
}
