# Forge — Product Blueprint

**Positioning:** An AI-powered operating system for manufacturing businesses.  
**Initial segment:** Metal fabrication & component manufacturers.  
**Demo tenant:** Apex Metalworks (single plant, Houston).

---

## 1. Product thesis

Generic CRM/ERP fails manufacturers because the hard problem is the **operational loop**:

Customer → Sales → Planning → Purchase → Raw inventory → Manufacturing → QC → Finished goods → Warehouse → Delivery → Invoice → Payment

Forge is built around that loop first, then expands into ERP-like breadth.

---

## 2. Module map (12 + admin)

| # | Module | Phase | Primary screens |
|---|---|---|---|
| 01 | Dashboard | 1 | Today overview, alerts, production snapshot, quick actions |
| 02 | CRM & Sales | 1 | Customers, pipeline board, quotations, sales orders |
| 03 | Purchase | 1 | Suppliers, PR/PO list, receiving status |
| 04 | Inventory / Stores | 1 | SKU ledger, category views, reorder status |
| 05 | Production | 1–2 | Production orders, BOM, material check, work orders, machines |
| 06 | Quality Control | 2 | Inspection log by stage, rejection & CAPA |
| 07 | Warehouse & Dispatch | 2 | Multi-warehouse zones, pick/pack/dispatch flow |
| 08 | Accounts & Finance | 1–3 | AR/AP, banking, costing engine |
| 09 | HR & Payroll | 3 | Employees, shifts, attendance → labor cost |
| 10 | Parties | 1 | Customers + suppliers (embedded in Sales/Purchase) |
| 11 | Reports & Analytics | 2 | Sales, inventory, production, finance, HR packs |
| 12 | AI & Automation | 4 | Copilot Q&A, proactive alerts |
| — | Admin & Settings | 1 | Tenant, plan, roles, plants |

---

## 3. Core entities (database)

### Tenant & access
- `Company`, `Plant`, `User`, `Role`, `Permission`, `Subscription`

### Commercial
- `Customer`, `Lead`, `Quotation`, `QuotationLine`, `SalesOrder`, `SalesOrderLine`

### Supply
- `Supplier`, `PurchaseRequest`, `PurchaseOrder`, `PurchaseOrderLine`, `GoodsReceipt`

### Inventory
- `Product` (SKU), `Warehouse`, `Bin`, `StockLedger`, `StockReservation`, `StockTransfer`, `Batch/Lot`

### Manufacturing
- `BillOfMaterials`, `BomLine`, `ProductionOrder`, `WorkOrder`, `RoutingStep`
- `Machine`, `MaintenanceOrder`

### Quality
- `QualityCheck`, `DefectCode`, `CorrectiveAction`

### Finance
- `Invoice`, `Payment`, `BankAccount`, `BankTransaction`, `JournalEntry`
- `CostRollup` (material + labor + machine + overhead)

### People
- `Employee`, `Shift`, `Attendance`, `Leave`, `PayrollRun`

### Intelligence
- `Alert`, `AiInsight`, `MetricSnapshot`

**Multi-tenancy rule:** every business table includes `company_id`. No cross-tenant reads.

---

## 4. Critical workflows

### 4.1 Quote → cash
1. Sales creates quotation  
2. Customer accepts  
3. Convert → sales order (no re-entry)  
4. MRP / material check  
5. Production + QC  
6. Dispatch  
7. Invoice → payment → AR close

### 4.2 Shortage → purchase
1. Production order explodes BOM × qty  
2. Compare required vs available (on-hand − reserved)  
3. If shortage → purchase request  
4. Approve → PO → GRN → QC → inventory increase

### 4.3 Production execution
1. Materials / machine / labor readiness gates  
2. Start production  
3. Stage work orders (Cut → Machine → Assemble → Paint → QC → Pack)  
4. Complete → finished goods inventory  
5. Cost rollup posts manufacturing cost

### 4.4 AI owner loop
Operational data → anomaly detection → natural-language explanation → recommended action → retention flywheel

---

## 5. Screen inventory (MVP+)

### Dashboard
- KPI strip (revenue, SOs, PRs, pending, low stock, POs, AR, AP, cash)
- Alert feed
- Revenue/profit chart
- Active production table
- Quick actions

### Sales
- Customer table (credit limit, terms, outstanding, stage)
- Pipeline stage counts
- Quotation cards with line math + convert CTA
- Sales order table

### Purchase
- Workflow strip
- PO table
- Supplier cards (rating, lead time, terms)

### Inventory
- Category counts
- SKU ledger with reserved/available/reorder/bin

### Production
- Material check panel (interactive shortage → PO)
- BOM cards with material cost
- Production order table
- Work order stage list
- Machine & maintenance cards

### Accounts
- AR/AP invoices
- Bank balances
- Product costing breakdown

### Later modules
Quality log, warehouse zones, HR shifts, reports packs, AI copilot prompts, settings/roles/plans

---

## 6. Roles (granular RBAC)

| Role | Access |
|---|---|
| Owner | Everything |
| Admin | Everything except critical financial settings |
| Sales Manager | Sales + CRM |
| Salesperson | Assigned customers |
| Purchase Manager | Purchasing |
| Store Manager | Inventory |
| Production Manager | Production |
| QC Manager | Quality |
| Accountant | Finance |
| HR Manager | HR |
| Worker | Assigned work orders |

---

## 7. Subscription plans (hypotheses)

| Plan | Price | Fit |
|---|---|---|
| Starter | $99–149/mo | Small single-plant manufacturer |
| Growth | $299–499/mo | Multi-department manufacturer |
| Professional | $799–1,499/mo | QC + warehouse + costing |
| Enterprise | Custom | Multi-plant, SSO, API, premium AI |

**Add-ons:** extra plants, advanced AI, API, integrations, storage, premium support, implementation, data migration.

Pricing is intentionally **not pure per-seat** — plants have many workers who only need task access.

---

## 8. Phased delivery

### Phase 1 — MVP (this demo focus)
Sales + Purchase + Inventory + Production + Basic Accounts + Dashboard + Admin

### Phase 2
BOM depth + Work Orders + Quality + Warehouse + Costing + Reports

### Phase 3
HR + Payroll + Maintenance maturity + Advanced finance (GL, periods)

### Phase 4
AI Copilot + predictive alerts + automated recommendations

### Phase 5
Multi-plant + integrations + public API + enterprise controls

---

## 9. Technical architecture (target)

```text
Forge SaaS
 ├─ Marketing site
 ├─ App (Next.js)
 ├─ API (tenant-scoped)
 ├─ Postgres (RLS or app-level company_id)
 ├─ Object storage (drawings, QC photos)
 ├─ Jobs (MRP, alerts, payroll)
 └─ AI service (retrieval over tenant metrics)
```

**Current repository:** interactive Next.js product demo with in-memory tenant data for Apex Metalworks, covering all 12 module surfaces and Phase 1 workflows (quote conversion, shortage → PO, production start).

---

## 10. Success metrics

- Time from quote acceptance → sales order < 1 minute  
- % of production orders with material readiness known before start  
- Stockout incidents / month  
- Gross margin visibility by SKU  
- Owner weekly active use of dashboard + AI alerts  
- Net revenue retention > 110% by month 18
