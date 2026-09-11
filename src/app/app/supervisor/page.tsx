"use client";

import { FormEvent, useMemo, useState } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { PageHeaderNote, SectionCard } from "@/components/ui/Primitives";
import { useForge } from "@/lib/store";
import {
  deskLabels,
  desksForRole,
  isOwnerLike,
  type SupervisorDesk,
} from "@/lib/permissions";
import { roleLabels, cn } from "@/lib/format";
import type { SupervisorAction } from "@/lib/supervisor";
import type { InventoryCategory, QualityStage } from "@/lib/types";

const fieldClass =
  "w-full rounded-xl border border-[var(--line-strong)] bg-white px-3 py-2.5 text-sm outline-none ring-[var(--champagne)] focus:ring-2";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-semibold text-[var(--ink)]">{label}</span>
      {children}
    </label>
  );
}

export default function SupervisorPage() {
  const { data, submitSupervisorEntry } = useForge();
  const desks = desksForRole(data.user.role);
  const [desk, setDesk] = useState<SupervisorDesk>(desks[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeDesk = desks.includes(desk) ? desk : desks[0];

  async function submit(input: SupervisorAction) {
    setBusy(true);
    setError(null);
    try {
      await submitSupervisorEntry(input);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fade-up">
      <TopBar
        title="Supervisor Desk"
        subtitle={`${data.user.department} · Enter day-to-day plant information for your department.`}
      />
      <PageHeaderNote>
        Signed in as <strong>{data.user.name}</strong> ({roleLabels[data.user.role]}).
        {isOwnerLike(data.user.role)
          ? " Owner view can enter data for every department."
          : " You only see forms for your assigned department."}{" "}
        Entries save to the live tenant store immediately.
      </PageHeaderNote>

      <div className="flex flex-wrap gap-2">
        {desks.map((d) => (
          <button
            key={d}
            type="button"
            className={cn(
              "rounded-xl px-3.5 py-2 text-sm font-semibold transition",
              activeDesk === d
                ? "bg-[var(--steel)] text-white"
                : "bg-[var(--surface-2)] text-[var(--ink-soft)] hover:bg-[rgba(42,82,80,0.12)]"
            )}
            onClick={() => setDesk(d)}
          >
            {deskLabels[d]}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-[rgba(192,57,43,0.1)] px-3 py-2 text-sm text-[var(--bad)]">
          {error}
        </p>
      ) : null}

      <div className="mt-5 space-y-5">
        {activeDesk === "sales" ? (
          <SalesForms data={data} busy={busy} onSubmit={submit} />
        ) : null}
        {activeDesk === "purchase" ? (
          <PurchaseForms data={data} busy={busy} onSubmit={submit} />
        ) : null}
        {activeDesk === "inventory" ? (
          <InventoryForms data={data} busy={busy} onSubmit={submit} />
        ) : null}
        {activeDesk === "production" ? (
          <ProductionForms data={data} busy={busy} onSubmit={submit} />
        ) : null}
        {activeDesk === "quality" ? (
          <QualityForms data={data} busy={busy} onSubmit={submit} />
        ) : null}
        {activeDesk === "warehouse" ? (
          <WarehouseForms data={data} busy={busy} onSubmit={submit} />
        ) : null}
        {activeDesk === "accounts" ? (
          <AccountsForms busy={busy} onSubmit={submit} />
        ) : null}
        {activeDesk === "hr" ? (
          <HrForms data={data} busy={busy} onSubmit={submit} />
        ) : null}
      </div>
    </div>
  );
}

type FormProps = {
  data: ReturnType<typeof useForge>["data"];
  busy: boolean;
  onSubmit: (input: SupervisorAction) => Promise<void>;
};

function SalesForms({ data, busy, onSubmit }: FormProps) {
  const [customer, setCustomer] = useState({
    company: "",
    contact: "",
    phone: "",
    email: "",
    industry: "Industrial",
    paymentTerms: "Net 30",
  });
  const [quote, setQuote] = useState({
    customerId: data.customers[0]?.id || "",
    productId: data.products.find((p) => p.category === "finished_goods")?.id || data.products[0]?.id || "",
    quantity: 10,
    unitPrice: 100,
  });

  const fg = useMemo(
    () => data.products.filter((p) => p.category === "finished_goods" || p.sellPrice),
    [data.products]
  );

  async function addCustomer(e: FormEvent) {
    e.preventDefault();
    await onSubmit({ action: "create_customer", payload: customer });
    setCustomer({ company: "", contact: "", phone: "", email: "", industry: "Industrial", paymentTerms: "Net 30" });
  }

  async function addQuote(e: FormEvent) {
    e.preventDefault();
    await onSubmit({ action: "create_quotation", payload: quote });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <SectionCard title="Add customer">
        <form className="grid gap-3" onSubmit={addCustomer}>
          <Field label="Company">
            <input className={fieldClass} required value={customer.company} onChange={(e) => setCustomer({ ...customer, company: e.target.value })} />
          </Field>
          <Field label="Contact name">
            <input className={fieldClass} required value={customer.contact} onChange={(e) => setCustomer({ ...customer, contact: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Phone">
              <input className={fieldClass} value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <input className={fieldClass} type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Industry">
              <input className={fieldClass} value={customer.industry} onChange={(e) => setCustomer({ ...customer, industry: e.target.value })} />
            </Field>
            <Field label="Payment terms">
              <input className={fieldClass} value={customer.paymentTerms} onChange={(e) => setCustomer({ ...customer, paymentTerms: e.target.value })} />
            </Field>
          </div>
          <button type="submit" className="btn btn-primary mt-1" disabled={busy}>Save customer</button>
        </form>
      </SectionCard>

      <SectionCard title="Create quotation">
        <form className="grid gap-3" onSubmit={addQuote}>
          <Field label="Customer">
            <select className={fieldClass} required value={quote.customerId} onChange={(e) => setQuote({ ...quote, customerId: e.target.value })}>
              {data.customers.map((c) => (
                <option key={c.id} value={c.id}>{c.company}</option>
              ))}
            </select>
          </Field>
          <Field label="Product">
            <select className={fieldClass} required value={quote.productId} onChange={(e) => setQuote({ ...quote, productId: e.target.value })}>
              {(fg.length ? fg : data.products).map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Quantity">
              <input className={fieldClass} type="number" min={1} required value={quote.quantity} onChange={(e) => setQuote({ ...quote, quantity: Number(e.target.value) })} />
            </Field>
            <Field label="Unit price">
              <input className={fieldClass} type="number" min={0} step="0.01" required value={quote.unitPrice} onChange={(e) => setQuote({ ...quote, unitPrice: Number(e.target.value) })} />
            </Field>
          </div>
          <button type="submit" className="btn btn-primary mt-1" disabled={busy || !data.customers.length}>Save quotation</button>
        </form>
      </SectionCard>
    </div>
  );
}

function PurchaseForms({ data, busy, onSubmit }: FormProps) {
  const [supplier, setSupplier] = useState({
    company: "",
    contact: "",
    phone: "",
    email: "",
    paymentTerms: "Net 30",
    leadTimeDays: 7,
  });
  const [po, setPo] = useState({
    supplierId: data.suppliers[0]?.id || "",
    productId: data.products.find((p) => p.category === "raw_material")?.id || data.products[0]?.id || "",
    quantity: 100,
    unitCost: 5,
    expectedDate: "",
  });

  async function addSupplier(e: FormEvent) {
    e.preventDefault();
    await onSubmit({ action: "create_supplier", payload: supplier });
    setSupplier({ company: "", contact: "", phone: "", email: "", paymentTerms: "Net 30", leadTimeDays: 7 });
  }

  async function addPo(e: FormEvent) {
    e.preventDefault();
    await onSubmit({
      action: "create_purchase_order",
      payload: { ...po, expectedDate: po.expectedDate || undefined },
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <SectionCard title="Add supplier">
        <form className="grid gap-3" onSubmit={addSupplier}>
          <Field label="Company">
            <input className={fieldClass} required value={supplier.company} onChange={(e) => setSupplier({ ...supplier, company: e.target.value })} />
          </Field>
          <Field label="Contact">
            <input className={fieldClass} required value={supplier.contact} onChange={(e) => setSupplier({ ...supplier, contact: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Phone">
              <input className={fieldClass} value={supplier.phone} onChange={(e) => setSupplier({ ...supplier, phone: e.target.value })} />
            </Field>
            <Field label="Lead time (days)">
              <input className={fieldClass} type="number" min={1} value={supplier.leadTimeDays} onChange={(e) => setSupplier({ ...supplier, leadTimeDays: Number(e.target.value) })} />
            </Field>
          </div>
          <button type="submit" className="btn btn-primary mt-1" disabled={busy}>Save supplier</button>
        </form>
      </SectionCard>

      <SectionCard title="Create purchase order">
        <form className="grid gap-3" onSubmit={addPo}>
          <Field label="Supplier">
            <select className={fieldClass} required value={po.supplierId} onChange={(e) => setPo({ ...po, supplierId: e.target.value })}>
              {data.suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.company}</option>
              ))}
            </select>
          </Field>
          <Field label="Material / SKU">
            <select className={fieldClass} required value={po.productId} onChange={(e) => setPo({ ...po, productId: e.target.value })}>
              {data.products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Qty">
              <input className={fieldClass} type="number" min={1} required value={po.quantity} onChange={(e) => setPo({ ...po, quantity: Number(e.target.value) })} />
            </Field>
            <Field label="Unit cost">
              <input className={fieldClass} type="number" min={0} step="0.01" required value={po.unitCost} onChange={(e) => setPo({ ...po, unitCost: Number(e.target.value) })} />
            </Field>
            <Field label="Expected">
              <input className={fieldClass} type="date" value={po.expectedDate} onChange={(e) => setPo({ ...po, expectedDate: e.target.value })} />
            </Field>
          </div>
          <button type="submit" className="btn btn-primary mt-1" disabled={busy || !data.suppliers.length}>Save PO</button>
        </form>
      </SectionCard>
    </div>
  );
}

function InventoryForms({ data, busy, onSubmit }: FormProps) {
  const [product, setProduct] = useState({
    sku: "",
    name: "",
    category: "raw_material" as InventoryCategory,
    unit: "kg",
    quantity: 0,
    minStock: 0,
    reorderPoint: 0,
    warehouse: data.warehouses[0]?.name || "Main Warehouse",
    bin: "A-01",
    unitCost: 0,
  });
  const [adjust, setAdjust] = useState({
    productId: data.products[0]?.id || "",
    quantityDelta: 0,
    note: "",
  });

  async function addProduct(e: FormEvent) {
    e.preventDefault();
    await onSubmit({ action: "create_product", payload: product });
    setProduct({ ...product, sku: "", name: "", quantity: 0 });
  }

  async function adjustStock(e: FormEvent) {
    e.preventDefault();
    await onSubmit({ action: "adjust_stock", payload: adjust });
    setAdjust({ ...adjust, quantityDelta: 0, note: "" });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <SectionCard title="Add SKU">
        <form className="grid gap-3" onSubmit={addProduct}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="SKU">
              <input className={fieldClass} required value={product.sku} onChange={(e) => setProduct({ ...product, sku: e.target.value })} />
            </Field>
            <Field label="Name">
              <input className={fieldClass} required value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Category">
              <select className={fieldClass} value={product.category} onChange={(e) => setProduct({ ...product, category: e.target.value as InventoryCategory })}>
                {["raw_material", "component", "wip", "finished_goods", "packaging", "scrap"].map((c) => (
                  <option key={c} value={c}>{c.replaceAll("_", " ")}</option>
                ))}
              </select>
            </Field>
            <Field label="Unit">
              <input className={fieldClass} value={product.unit} onChange={(e) => setProduct({ ...product, unit: e.target.value })} />
            </Field>
            <Field label="On hand">
              <input className={fieldClass} type="number" min={0} value={product.quantity} onChange={(e) => setProduct({ ...product, quantity: Number(e.target.value) })} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Unit cost">
              <input className={fieldClass} type="number" min={0} step="0.01" value={product.unitCost} onChange={(e) => setProduct({ ...product, unitCost: Number(e.target.value) })} />
            </Field>
            <Field label="Reorder point">
              <input className={fieldClass} type="number" min={0} value={product.reorderPoint} onChange={(e) => setProduct({ ...product, reorderPoint: Number(e.target.value) })} />
            </Field>
            <Field label="Bin">
              <input className={fieldClass} value={product.bin} onChange={(e) => setProduct({ ...product, bin: e.target.value })} />
            </Field>
          </div>
          <button type="submit" className="btn btn-primary mt-1" disabled={busy}>Save SKU</button>
        </form>
      </SectionCard>

      <SectionCard title="Adjust stock">
        <form className="grid gap-3" onSubmit={adjustStock}>
          <Field label="SKU">
            <select className={fieldClass} required value={adjust.productId} onChange={(e) => setAdjust({ ...adjust, productId: e.target.value })}>
              {data.products.map((p) => (
                <option key={p.id} value={p.id}>{p.sku} · {p.name} (on hand {p.quantity})</option>
              ))}
            </select>
          </Field>
          <Field label="Quantity change (+ receive / − issue)">
            <input className={fieldClass} type="number" required value={adjust.quantityDelta} onChange={(e) => setAdjust({ ...adjust, quantityDelta: Number(e.target.value) })} />
          </Field>
          <Field label="Note">
            <input className={fieldClass} value={adjust.note} onChange={(e) => setAdjust({ ...adjust, note: e.target.value })} />
          </Field>
          <button type="submit" className="btn btn-primary mt-1" disabled={busy || !data.products.length}>Post adjustment</button>
        </form>
      </SectionCard>
    </div>
  );
}

function ProductionForms({ data, busy, onSubmit }: FormProps) {
  const fg = data.products.filter((p) => p.category === "finished_goods");
  const [order, setOrder] = useState({
    productId: fg[0]?.id || data.products[0]?.id || "",
    quantity: 25,
    deadline: "",
    salesOrderId: "",
  });
  const openWos = data.workOrders.filter((w) => w.status !== "done").slice(0, 12);

  async function addOrder(e: FormEvent) {
    e.preventDefault();
    await onSubmit({
      action: "create_production_order",
      payload: {
        ...order,
        deadline: order.deadline || undefined,
        salesOrderId: order.salesOrderId || undefined,
      },
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <SectionCard title="Create production order">
        <form className="grid gap-3" onSubmit={addOrder}>
          <Field label="Finished good">
            <select className={fieldClass} required value={order.productId} onChange={(e) => setOrder({ ...order, productId: e.target.value })}>
              {(fg.length ? fg : data.products).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Quantity">
              <input className={fieldClass} type="number" min={1} required value={order.quantity} onChange={(e) => setOrder({ ...order, quantity: Number(e.target.value) })} />
            </Field>
            <Field label="Deadline">
              <input className={fieldClass} type="date" value={order.deadline} onChange={(e) => setOrder({ ...order, deadline: e.target.value })} />
            </Field>
          </div>
          <Field label="Linked sales order (optional)">
            <select className={fieldClass} value={order.salesOrderId} onChange={(e) => setOrder({ ...order, salesOrderId: e.target.value })}>
              <option value="">None</option>
              {data.salesOrders.map((s) => (
                <option key={s.id} value={s.id}>{s.number}</option>
              ))}
            </select>
          </Field>
          <button type="submit" className="btn btn-primary mt-1" disabled={busy}>Create order + work orders</button>
        </form>
      </SectionCard>

      <SectionCard title="Update work order status">
        <div className="space-y-3">
          {openWos.length === 0 ? (
            <p className="muted text-sm">No open work orders.</p>
          ) : (
            openWos.map((w) => {
              const po = data.productionOrders.find((p) => p.id === w.productionOrderId);
              return (
                <div key={w.id} className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-3">
                  <p className="font-semibold">{po?.number} · {w.stage}</p>
                  <p className="muted text-xs">{w.department} · {w.status.replaceAll("_", " ")}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["pending", "in_progress", "done", "blocked"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        className="btn btn-secondary py-1.5 text-xs"
                        disabled={busy || w.status === status}
                        onClick={() =>
                          onSubmit({
                            action: "update_work_order",
                            payload: { workOrderId: w.id, status, assignee: data.user.name },
                          })
                        }
                      >
                        {status.replaceAll("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function QualityForms({ data, busy, onSubmit }: FormProps) {
  const [form, setForm] = useState<{
    reference: string;
    stage: QualityStage;
    batch: string;
    inspected: number;
    rejected: number;
    defect: string;
    correctiveAction: string;
    status: "pass" | "fail" | "conditional";
  }>({
    reference: data.productionOrders[0]?.number || "",
    stage: "final",
    batch: "",
    inspected: 10,
    rejected: 0,
    defect: "",
    correctiveAction: "",
    status: "pass",
  });

  async function save(e: FormEvent) {
    e.preventDefault();
    await onSubmit({
      action: "create_quality_check",
      payload: {
        ...form,
        defect: form.defect || undefined,
        correctiveAction: form.correctiveAction || undefined,
      },
    });
    setForm({ ...form, batch: "", rejected: 0, defect: "", correctiveAction: "" });
  }

  return (
    <SectionCard title="Log quality inspection">
      <form className="grid max-w-3xl gap-3" onSubmit={save}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Reference (PO / PR / batch)">
            <input className={fieldClass} required value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          </Field>
          <Field label="Batch">
            <input className={fieldClass} required value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Stage">
            <select className={fieldClass} value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as QualityStage })}>
              {["raw_material", "in_process", "final", "dispatch"].map((s) => (
                <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
              ))}
            </select>
          </Field>
          <Field label="Inspected">
            <input className={fieldClass} type="number" min={1} required value={form.inspected} onChange={(e) => setForm({ ...form, inspected: Number(e.target.value) })} />
          </Field>
          <Field label="Rejected">
            <input className={fieldClass} type="number" min={0} value={form.rejected} onChange={(e) => setForm({ ...form, rejected: Number(e.target.value) })} />
          </Field>
        </div>
        <Field label="Result">
          <select
            className={fieldClass}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as "pass" | "fail" | "conditional" })}
          >
            <option value="pass">Pass</option>
            <option value="conditional">Conditional</option>
            <option value="fail">Fail</option>
          </select>
        </Field>
        <Field label="Defect notes">
          <input className={fieldClass} value={form.defect} onChange={(e) => setForm({ ...form, defect: e.target.value })} />
        </Field>
        <Field label="Corrective action">
          <input className={fieldClass} value={form.correctiveAction} onChange={(e) => setForm({ ...form, correctiveAction: e.target.value })} />
        </Field>
        <button type="submit" className="btn btn-primary mt-1 w-fit" disabled={busy}>Save inspection</button>
      </form>
    </SectionCard>
  );
}

function WarehouseForms({ data, busy, onSubmit }: FormProps) {
  const [form, setForm] = useState({
    productId: data.products[0]?.id || "",
    warehouse: data.warehouses[0]?.name || "Main Warehouse",
    bin: "",
  });

  async function save(e: FormEvent) {
    e.preventDefault();
    await onSubmit({ action: "update_bin_location", payload: form });
    setForm({ ...form, bin: "" });
  }

  return (
    <SectionCard title="Update bin / location">
      <form className="grid max-w-2xl gap-3" onSubmit={save}>
        <Field label="SKU">
          <select className={fieldClass} required value={form.productId} onChange={(e) => setForm({ ...form, productId: e.target.value })}>
            {data.products.map((p) => (
              <option key={p.id} value={p.id}>{p.sku} · {p.warehouse}/{p.bin}</option>
            ))}
          </select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Warehouse">
            <select className={fieldClass} value={form.warehouse} onChange={(e) => setForm({ ...form, warehouse: e.target.value })}>
              {data.warehouses.map((w) => (
                <option key={w.id} value={w.name}>{w.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Bin">
            <input className={fieldClass} required value={form.bin} onChange={(e) => setForm({ ...form, bin: e.target.value })} placeholder="e.g. FG-12" />
          </Field>
        </div>
        <button type="submit" className="btn btn-primary mt-1 w-fit" disabled={busy || !data.products.length}>Save location</button>
      </form>
    </SectionCard>
  );
}

function AccountsForms({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (input: SupervisorAction) => Promise<void>;
}) {
  const [form, setForm] = useState<{
    type: "receivable" | "payable";
    partyName: string;
    amount: number;
    paid: number;
    dueDate: string;
  }>({
    type: "receivable",
    partyName: "",
    amount: 0,
    paid: 0,
    dueDate: "",
  });

  async function save(e: FormEvent) {
    e.preventDefault();
    await onSubmit({
      action: "create_invoice_entry",
      payload: {
        ...form,
        dueDate: form.dueDate || undefined,
      },
    });
    setForm({ type: "receivable", partyName: "", amount: 0, paid: 0, dueDate: "" });
  }

  return (
    <SectionCard title="Record invoice / bill">
      <form className="grid max-w-2xl gap-3" onSubmit={save}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Type">
            <select
              className={fieldClass}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as "receivable" | "payable" })}
            >
              <option value="receivable">Customer invoice (AR)</option>
              <option value="payable">Supplier bill (AP)</option>
            </select>
          </Field>
          <Field label="Party name">
            <input className={fieldClass} required value={form.partyName} onChange={(e) => setForm({ ...form, partyName: e.target.value })} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Amount">
            <input className={fieldClass} type="number" min={1} required value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
          </Field>
          <Field label="Paid so far">
            <input className={fieldClass} type="number" min={0} value={form.paid} onChange={(e) => setForm({ ...form, paid: Number(e.target.value) })} />
          </Field>
          <Field label="Due date">
            <input className={fieldClass} type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </Field>
        </div>
        <button type="submit" className="btn btn-primary mt-1 w-fit" disabled={busy}>Save entry</button>
      </form>
    </SectionCard>
  );
}

function HrForms({ data, busy, onSubmit }: FormProps) {
  const [form, setForm] = useState<{
    name: string;
    department: string;
    role: string;
    shift: "morning" | "evening" | "night";
    hourlyRate: number;
  }>({
    name: "",
    department: "Fabrication",
    role: "Operator",
    shift: "morning",
    hourlyRate: 22,
  });

  async function addEmployee(e: FormEvent) {
    e.preventDefault();
    await onSubmit({ action: "create_employee", payload: form });
    setForm({ ...form, name: "" });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <SectionCard title="Add employee">
        <form className="grid gap-3" onSubmit={addEmployee}>
          <Field label="Full name">
            <input className={fieldClass} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Department">
              <input className={fieldClass} required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            </Field>
            <Field label="Role / title">
              <input className={fieldClass} required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Shift">
              <select
                className={fieldClass}
                value={form.shift}
                onChange={(e) => setForm({ ...form, shift: e.target.value as "morning" | "evening" | "night" })}
              >
                <option value="morning">Morning</option>
                <option value="evening">Evening</option>
                <option value="night">Night</option>
              </select>
            </Field>
            <Field label="Hourly rate">
              <input className={fieldClass} type="number" min={0} step="0.01" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: Number(e.target.value) })} />
            </Field>
          </div>
          <button type="submit" className="btn btn-primary mt-1" disabled={busy}>Save employee</button>
        </form>
      </SectionCard>

      <SectionCard title="Update attendance status">
        <div className="space-y-3">
          {data.employees.slice(0, 10).map((emp) => (
            <div key={emp.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5">
              <div>
                <p className="font-semibold">{emp.name}</p>
                <p className="muted text-xs">{emp.department} · {emp.status}</p>
              </div>
              <div className="flex gap-2">
                {(["active", "leave"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    className="btn btn-secondary py-1.5 text-xs"
                    disabled={busy || emp.status === status}
                    onClick={() =>
                      onSubmit({
                        action: "update_employee_status",
                        payload: { employeeId: emp.id, status },
                      })
                    }
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
