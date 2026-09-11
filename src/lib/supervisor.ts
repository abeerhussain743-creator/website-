import type {
  AppData,
  Customer,
  Employee,
  InventoryCategory,
  PipelineStage,
  Product,
  ProductionOrder,
  PurchaseOrder,
  QualityCheck,
  QualityStage,
  Quotation,
  Supplier,
  WorkOrder,
} from "./types";

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function bumpMetrics(data: AppData): AppData {
  return {
    ...data,
    metrics: {
      ...data.metrics,
      salesOrders: data.salesOrders.length,
      productionOrders: data.productionOrders.length,
      pendingOrders: data.salesOrders.filter((s) => !["paid", "dispatched"].includes(s.status))
        .length,
      lowStockItems: data.products.filter((p) => p.quantity - p.reserved <= p.reorderPoint).length,
      purchaseOrders: data.purchaseOrders.length,
      receivables: data.invoices
        .filter((i) => i.type === "receivable")
        .reduce((s, i) => s + (i.amount - i.paid), 0),
      payables: data.invoices
        .filter((i) => i.type === "payable")
        .reduce((s, i) => s + (i.amount - i.paid), 0),
      cashBalance: data.bankAccounts.reduce((s, b) => s + b.balance, 0),
    },
  };
}

export type SupervisorAction =
  | {
      action: "create_customer";
      payload: {
        company: string;
        contact: string;
        phone?: string;
        email?: string;
        industry?: string;
        creditLimit?: number;
        paymentTerms?: string;
        stage?: PipelineStage;
      };
    }
  | {
      action: "create_quotation";
      payload: {
        customerId: string;
        productId: string;
        quantity: number;
        unitPrice: number;
        taxRate?: number;
        discount?: number;
      };
    }
  | {
      action: "create_supplier";
      payload: {
        company: string;
        contact: string;
        phone?: string;
        email?: string;
        paymentTerms?: string;
        leadTimeDays?: number;
        rating?: number;
      };
    }
  | {
      action: "create_purchase_order";
      payload: {
        supplierId: string;
        productId: string;
        quantity: number;
        unitCost: number;
        expectedDate?: string;
      };
    }
  | {
      action: "create_product";
      payload: {
        sku: string;
        name: string;
        category: InventoryCategory;
        unit: string;
        quantity: number;
        minStock?: number;
        reorderPoint?: number;
        warehouse?: string;
        bin?: string;
        unitCost: number;
        sellPrice?: number;
      };
    }
  | {
      action: "adjust_stock";
      payload: { productId: string; quantityDelta: number; note?: string };
    }
  | {
      action: "create_production_order";
      payload: {
        productId: string;
        quantity: number;
        deadline?: string;
        salesOrderId?: string;
      };
    }
  | {
      action: "update_work_order";
      payload: { workOrderId: string; status: WorkOrder["status"]; assignee?: string };
    }
  | {
      action: "create_quality_check";
      payload: {
        reference: string;
        stage: QualityStage;
        batch: string;
        inspected: number;
        rejected?: number;
        defect?: string;
        correctiveAction?: string;
        status: QualityCheck["status"];
      };
    }
  | {
      action: "update_bin_location";
      payload: { productId: string; warehouse: string; bin: string };
    }
  | {
      action: "create_invoice_entry";
      payload: {
        type: "receivable" | "payable";
        partyName: string;
        amount: number;
        dueDate?: string;
        paid?: number;
      };
    }
  | {
      action: "create_employee";
      payload: {
        name: string;
        department: string;
        role: string;
        shift: Employee["shift"];
        hourlyRate?: number;
        status?: Employee["status"];
      };
    }
  | {
      action: "update_employee_status";
      payload: { employeeId: string; status: Employee["status"]; shift?: Employee["shift"] };
    };

export function applySupervisorAction(
  data: AppData,
  input: SupervisorAction,
  actorName: string
): { data: AppData; message: string } {
  switch (input.action) {
    case "create_customer": {
      const p = input.payload;
      if (!p.company?.trim() || !p.contact?.trim()) {
        throw new Error("Customer company and contact are required");
      }
      const customer: Customer = {
        id: uid("c"),
        company: p.company.trim(),
        contact: p.contact.trim(),
        phone: p.phone?.trim() || "",
        email: p.email?.trim() || "",
        industry: p.industry?.trim() || "General",
        creditLimit: Number(p.creditLimit) || 25000,
        paymentTerms: p.paymentTerms?.trim() || "Net 30",
        outstanding: 0,
        stage: p.stage || "lead",
        lifetimeValue: 0,
      };
      return {
        data: bumpMetrics({ ...data, customers: [customer, ...data.customers] }),
        message: `Customer ${customer.company} added`,
      };
    }
    case "create_quotation": {
      const p = input.payload;
      const customer = data.customers.find((c) => c.id === p.customerId);
      const product = data.products.find((x) => x.id === p.productId);
      if (!customer || !product) throw new Error("Customer and product are required");
      if (!(p.quantity > 0) || !(p.unitPrice >= 0)) throw new Error("Invalid quantity or price");
      const quotation: Quotation = {
        id: uid("q"),
        number: `QT-${1000 + data.quotations.length + 1}`,
        customerId: customer.id,
        date: today(),
        validUntil: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        lines: [{ productId: product.id, quantity: Number(p.quantity), unitPrice: Number(p.unitPrice) }],
        taxRate: p.taxRate ?? 0.08,
        discount: Number(p.discount) || 0,
        status: "sent",
      };
      const customers = data.customers.map((c) =>
        c.id === customer.id && c.stage === "lead" ? { ...c, stage: "quotation" as const } : c
      );
      return {
        data: bumpMetrics({ ...data, quotations: [quotation, ...data.quotations], customers }),
        message: `Quotation ${quotation.number} created for ${customer.company}`,
      };
    }
    case "create_supplier": {
      const p = input.payload;
      if (!p.company?.trim() || !p.contact?.trim()) {
        throw new Error("Supplier company and contact are required");
      }
      const supplier: Supplier = {
        id: uid("s"),
        company: p.company.trim(),
        contact: p.contact.trim(),
        phone: p.phone?.trim() || "",
        email: p.email?.trim() || "",
        paymentTerms: p.paymentTerms?.trim() || "Net 30",
        rating: Number(p.rating) || 4,
        leadTimeDays: Number(p.leadTimeDays) || 7,
      };
      return {
        data: bumpMetrics({ ...data, suppliers: [supplier, ...data.suppliers] }),
        message: `Supplier ${supplier.company} added`,
      };
    }
    case "create_purchase_order": {
      const p = input.payload;
      const supplier = data.suppliers.find((s) => s.id === p.supplierId);
      const product = data.products.find((x) => x.id === p.productId);
      if (!supplier || !product) throw new Error("Supplier and product are required");
      if (!(p.quantity > 0) || !(p.unitCost >= 0)) throw new Error("Invalid quantity or cost");
      const total = Number(p.quantity) * Number(p.unitCost);
      const po: PurchaseOrder = {
        id: uid("po"),
        number: `PO-${2000 + data.purchaseOrders.length + 1}`,
        supplierId: supplier.id,
        date: today(),
        expectedDate:
          p.expectedDate ||
          new Date(Date.now() + supplier.leadTimeDays * 86400000).toISOString().slice(0, 10),
        lines: [
          {
            productId: product.id,
            quantity: Number(p.quantity),
            unitCost: Number(p.unitCost),
          },
        ],
        status: "ordered",
        total,
      };
      return {
        data: bumpMetrics({ ...data, purchaseOrders: [po, ...data.purchaseOrders] }),
        message: `Purchase order ${po.number} created`,
      };
    }
    case "create_product": {
      const p = input.payload;
      if (!p.sku?.trim() || !p.name?.trim()) throw new Error("SKU and name are required");
      if (data.products.some((x) => x.sku.toLowerCase() === p.sku.trim().toLowerCase())) {
        throw new Error("SKU already exists");
      }
      const product: Product = {
        id: uid("p"),
        sku: p.sku.trim().toUpperCase(),
        name: p.name.trim(),
        category: p.category,
        unit: p.unit?.trim() || "ea",
        quantity: Number(p.quantity) || 0,
        reserved: 0,
        minStock: Number(p.minStock) || 0,
        reorderPoint: Number(p.reorderPoint) || 0,
        warehouse: p.warehouse?.trim() || data.warehouses[0]?.name || "Main Warehouse",
        bin: p.bin?.trim() || "A-01",
        unitCost: Number(p.unitCost) || 0,
        sellPrice: p.sellPrice != null ? Number(p.sellPrice) : undefined,
      };
      return {
        data: bumpMetrics({ ...data, products: [product, ...data.products] }),
        message: `SKU ${product.sku} created`,
      };
    }
    case "adjust_stock": {
      const p = input.payload;
      const product = data.products.find((x) => x.id === p.productId);
      if (!product) throw new Error("Product not found");
      const nextQty = product.quantity + Number(p.quantityDelta);
      if (nextQty < 0) throw new Error("Stock cannot go below zero");
      const products = data.products.map((x) =>
        x.id === product.id ? { ...x, quantity: nextQty } : x
      );
      return {
        data: bumpMetrics({
          ...data,
          products,
          alerts: [
            {
              id: uid("a"),
              severity: "info",
              module: "Inventory",
              title: `Stock adjusted · ${product.sku}`,
              detail: `${actorName} changed qty by ${p.quantityDelta}${p.note ? ` · ${p.note}` : ""}`,
              time: "just now",
            },
            ...data.alerts,
          ],
        }),
        message: `${product.sku} stock is now ${nextQty} ${product.unit}`,
      };
    }
    case "create_production_order": {
      const p = input.payload;
      const product = data.products.find((x) => x.id === p.productId);
      if (!product) throw new Error("Finished-goods product required");
      if (!(p.quantity > 0)) throw new Error("Quantity must be positive");
      const order: ProductionOrder = {
        id: uid("pr"),
        number: `PR-${3000 + data.productionOrders.length + 1}`,
        productId: product.id,
        salesOrderId: p.salesOrderId || undefined,
        quantity: Number(p.quantity),
        deadline:
          p.deadline || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        status: "materials_check",
        materialsReady: false,
        machineReady: true,
        laborReady: true,
        progress: 0,
      };
      const stages = [
        { stage: "Cutting", department: "Fabrication" },
        { stage: "Machining", department: "Machining" },
        { stage: "Assembly", department: "Assembly" },
        { stage: "QC", department: "QC" },
      ];
      const workOrders: WorkOrder[] = stages.map((s, i) => ({
        id: uid("wo"),
        productionOrderId: order.id,
        stage: s.stage,
        department: s.department,
        status: i === 0 ? "pending" : "pending",
        sequence: i + 1,
      }));
      return {
        data: bumpMetrics({
          ...data,
          productionOrders: [order, ...data.productionOrders],
          workOrders: [...workOrders, ...data.workOrders],
        }),
        message: `Production order ${order.number} created with ${workOrders.length} work orders`,
      };
    }
    case "update_work_order": {
      const p = input.payload;
      const wo = data.workOrders.find((w) => w.id === p.workOrderId);
      if (!wo) throw new Error("Work order not found");
      const workOrders = data.workOrders.map((w) =>
        w.id === wo.id
          ? { ...w, status: p.status, assignee: p.assignee?.trim() || w.assignee }
          : w
      );
      const siblings = workOrders.filter((w) => w.productionOrderId === wo.productionOrderId);
      const done = siblings.filter((w) => w.status === "done").length;
      const progress = Math.round((done / Math.max(siblings.length, 1)) * 100);
      const productionOrders = data.productionOrders.map((po) =>
        po.id === wo.productionOrderId
          ? {
              ...po,
              progress,
              status:
                progress === 100
                  ? ("quality_check" as const)
                  : progress > 0
                    ? ("in_production" as const)
                    : po.status,
            }
          : po
      );
      return {
        data: bumpMetrics({ ...data, workOrders, productionOrders }),
        message: `Work order ${wo.stage} marked ${p.status.replaceAll("_", " ")}`,
      };
    }
    case "create_quality_check": {
      const p = input.payload;
      if (!p.reference?.trim() || !p.batch?.trim()) {
        throw new Error("Reference and batch are required");
      }
      if (!(p.inspected > 0)) throw new Error("Inspected quantity must be positive");
      const check: QualityCheck = {
        id: uid("qc"),
        reference: p.reference.trim(),
        stage: p.stage,
        batch: p.batch.trim(),
        inspector: actorName,
        inspected: Number(p.inspected),
        rejected: Number(p.rejected) || 0,
        defect: p.defect?.trim() || undefined,
        correctiveAction: p.correctiveAction?.trim() || undefined,
        date: today(),
        status: p.status,
      };
      const qcBlocks =
        check.status === "fail"
          ? Array.from(new Set([...data.qcBlocks, check.reference]))
          : data.qcBlocks.filter((r) => r !== check.reference);
      return {
        data: bumpMetrics({
          ...data,
          qualityChecks: [check, ...data.qualityChecks],
          qcBlocks,
        }),
        message: `QC ${check.status.toUpperCase()} logged for ${check.reference}`,
      };
    }
    case "update_bin_location": {
      const p = input.payload;
      const product = data.products.find((x) => x.id === p.productId);
      if (!product) throw new Error("Product not found");
      if (!p.warehouse?.trim() || !p.bin?.trim()) throw new Error("Warehouse and bin required");
      const products = data.products.map((x) =>
        x.id === product.id
          ? { ...x, warehouse: p.warehouse.trim(), bin: p.bin.trim() }
          : x
      );
      return {
        data: bumpMetrics({ ...data, products }),
        message: `${product.sku} moved to ${p.warehouse} / ${p.bin}`,
      };
    }
    case "create_invoice_entry": {
      const p = input.payload;
      if (!p.partyName?.trim() || !(p.amount > 0)) {
        throw new Error("Party and amount are required");
      }
      const paid = Number(p.paid) || 0;
      const invoice = {
        id: uid("inv"),
        number: `${p.type === "receivable" ? "INV" : "BILL"}-${4000 + data.invoices.length + 1}`,
        type: p.type,
        partyName: p.partyName.trim(),
        date: today(),
        dueDate: p.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        amount: Number(p.amount),
        paid,
        status:
          paid >= Number(p.amount)
            ? ("paid" as const)
            : paid > 0
              ? ("partial" as const)
              : ("open" as const),
      };
      return {
        data: bumpMetrics({ ...data, invoices: [invoice, ...data.invoices] }),
        message: `${invoice.number} recorded for ${invoice.partyName}`,
      };
    }
    case "create_employee": {
      const p = input.payload;
      if (!p.name?.trim() || !p.department?.trim() || !p.role?.trim()) {
        throw new Error("Name, department, and role are required");
      }
      const employee: Employee = {
        id: uid("e"),
        name: p.name.trim(),
        department: p.department.trim(),
        role: p.role.trim(),
        shift: p.shift || "morning",
        status: p.status || "active",
        hourlyRate: Number(p.hourlyRate) || 0,
      };
      return {
        data: bumpMetrics({ ...data, employees: [employee, ...data.employees] }),
        message: `${employee.name} added to ${employee.department}`,
      };
    }
    case "update_employee_status": {
      const p = input.payload;
      const employee = data.employees.find((e) => e.id === p.employeeId);
      if (!employee) throw new Error("Employee not found");
      const employees = data.employees.map((e) =>
        e.id === employee.id
          ? { ...e, status: p.status, shift: p.shift || e.shift }
          : e
      );
      return {
        data: bumpMetrics({ ...data, employees }),
        message: `${employee.name} set to ${p.status}`,
      };
    }
    default:
      throw new Error("Unknown supervisor action");
  }
}
