"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Button } from "@maxtrone/ui";

export default function PayPage() {
  const params = useParams<{ token: string }>();
  const [invoice, setInvoice] = React.useState<{
    number: string;
    studentName: string;
    balancePaisa: number;
    status: string;
  } | null>(null);
  const [msg, setMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch(`/api/payments/${params.token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setMsg(d.error);
        else setInvoice(d);
      });
  }, [params.token]);

  async function pay(channel: string) {
    setMsg(null);
    const res = await fetch(`/api/payments/${params.token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel,
        amountPaisa: invoice?.balancePaisa,
        idempotencyKey: `pay:${params.token}:${channel}`,
        providerPaymentId: `mock_${params.token}_${channel}`,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMsg(data.error ?? "Payment failed");
      return;
    }
    setMsg(data.duplicate ? "Already paid (idempotent)" : "Payment successful");
    const refreshed = await fetch(`/api/payments/${params.token}`).then((r) => r.json());
    setInvoice(refreshed);
  }

  if (!invoice && !msg) {
    return <div className="p-8 text-sm">Loading payment…</div>;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <p className="font-display text-3xl font-semibold">Maxtrone</p>
      <div className="mt-6 rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-soft">
        {invoice ? (
          <>
            <h1 className="font-display text-xl font-semibold">Pay fee</h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {invoice.studentName} · {invoice.number}
            </p>
            <p className="font-display mt-4 text-3xl tabular-nums text-[var(--gold-dark)]">
              PKR {(invoice.balancePaisa / 100).toLocaleString("en-PK")}
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">Status: {invoice.status}</p>
            <div className="mt-6 flex flex-col gap-2">
              <Button type="button" onClick={() => pay("JAZZCASH")}>
                Pay with JazzCash
              </Button>
              <Button type="button" variant="outline" onClick={() => pay("EASYPAISA")}>
                Pay with Easypaisa
              </Button>
            </div>
          </>
        ) : null}
        {msg ? <p className="mt-4 text-sm">{msg}</p> : null}
      </div>
    </div>
  );
}
