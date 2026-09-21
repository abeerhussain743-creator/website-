import { paisa, type Paisa } from "../money.js";

export type Installment = {
  sequence: number;
  dueOn: string; // ISO date
  amountPaisa: Paisa;
};

/** Split a total into N equal installments; remainder goes to the last. */
export function buildEqualInstallments(
  totalPaisa: number,
  count: number,
  firstDueOn: Date,
  everyDays = 30,
): Installment[] {
  if (count < 1) throw new Error("count must be >= 1");
  if (totalPaisa < 0) throw new Error("total cannot be negative");
  const base = Math.floor(totalPaisa / count);
  const remainder = totalPaisa - base * count;
  const out: Installment[] = [];
  for (let i = 0; i < count; i++) {
    const due = new Date(firstDueOn);
    due.setUTCDate(due.getUTCDate() + i * everyDays);
    const amount = i === count - 1 ? base + remainder : base;
    out.push({
      sequence: i + 1,
      dueOn: due.toISOString().slice(0, 10),
      amountPaisa: paisa(amount),
    });
  }
  return out;
}
