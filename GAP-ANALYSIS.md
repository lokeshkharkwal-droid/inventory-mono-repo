# EzHealthTrack Inventory → inventory-monorepo — Feature Gap Analysis

Evidence-based comparison of the legacy `ezhealthtrack/inventory` controllers
(25 controllers) against the implemented NestJS backend routes + React pages.
Status: ✅ done · 🟡 partial · ❌ missing · ⛔ intentionally descoped.

Legend of effort: **S** small (hours) · **M** medium (a day) · **L** large (multi-day).

> **Updated 2026-11-10.** The status tables below were re-verified against the
> live code (controllers + Prisma schema + frontend). The earlier version's
> tables were stale — they still showed ❌/🟡 for features that had since been
> delivered. The port is now **substantially complete**; the handful of genuine
> remaining gaps are collected in §10.

---

## 1. Parties

| Legacy | Status | Gap detail | Effort |
|---|---|---|---|
| Billers (CRUD, logos) | 🟡 | CRUD ✅. `getLogoList` logo picker ❌ | S |
| Suppliers (CRUD, import, payments) | ✅ | CRUD+import ✅; supplier-level payment ledger ✅ (`GET/POST /suppliers/:id/payments`). Portal users = N/A (kalnostics owns identity) | — |
| Customers (CRUD, import) | ✅ | CRUD+import ✅ | — |
| Customers → **Deposits/advances** | ✅ | `GET/POST /customers/:id/deposits` built | — |
| Customers → **Patients** tab | ⛔ | kalnostics-new owns patient identity — not duplicated here by design | — |
| Customers → portal users, referral suggestions, award points | 🟡 | **award/loyalty points ✅** (sale awards points); portal users N/A; referral suggestions ❌ | S |
| **Manufacturers** (CRUD, logos) | ✅ | module built (migration 0012); logo picker minor | — |

## 2. Products

| Legacy action | Status | Gap detail | Effort |
|---|---|---|---|
| CRUD, list, view | 🟡 | CRUD+list ✅. `modal_view`/`pdf` detail view ❌ | S |
| import_products / import_csv / update_csv | ✅ | CSV import pipeline ✅ | — |
| quantity_adjustments | ✅ | stock adjustments ✅ | — |
| **print_barcodes** (multi-product label sheet) | ✅ | `POST /print/barcodes` sheet built | — |
| single_label / barcode / gen_barcode | 🟡 | single label ✅; style variants ❌ | S |
| set_rack | ✅ | `POST /products/:id/rack` built | — |
| **update_price** (bulk price/cost update) | ✅ | `POST /products/bulk-price` built | — |
| **drug/batch/serial + expiry** authoring | 🟡 | batches ✅ + serial model exists (`InventoryProductSerial`); per-unit serial *authoring* + drug modal still thin | M |
| **homoeopathy potency** scripts | 🟡 | `potency`/`genericName`/`strength` fields exist; niche potency scripts not built | M |
| variants/options with per-option stock | 🟡 | variant master ✅; product-level options w/ stock ❌ | M |
| getHSNCode / getSubCategories ajax | ✅ | covered via category/sub-category endpoints | — |
| **master_products (SITE templates)** | 🟡 | **`product-template` module built** (reusable templates + `POST /product-templates/:id/create-product`), but it is **tenant-scoped**, not a global cross-tenant SiteAdmin catalogue. See §10.1 | M |

## 3. Purchases

| Legacy | Status | Gap | Effort |
|---|---|---|---|
| CRUD, receiving, import | ✅ | ✅ | — |
| payments (add/edit/delete) | ✅ | `POST/PATCH/DELETE /purchases/:id/payments[/:paymentId]` built | — |
| returns | 🟡 | create+list+view ✅; process/refund detail 🟡 | M |
| **expenses** (freight/insurance) | ✅ | `GET/POST /purchases/:id/expenses` built | — |
| **supplier_payments** (supplier-level ledger) | ✅ | built (`/suppliers/:id/payments`) | — |
| pdf / combine_pdf / email | ✅ | print PO ✅ + `POST /print/email` (via kalnostics comms) ✅ | — |
| generate_bd_purchase (blood-donation PO) | 🟡 | dedicated `bloodbank` module (donations/requests/inventory) ✅; the exact purchase-side `generate_bd_purchase` shortcut not replicated | M |

## 4. Sales

| Legacy | Status | Gap | Effort |
|---|---|---|---|
| CRUD, import | ✅ | create/list/**edit** (`PATCH /sales/:id`)/delete ✅ | — |
| returns, deliveries, payments, incomes, gift cards | ✅ | all present as modules ✅ | — |
| payment edit/delete | ✅ | `PATCH/DELETE /sales/:id/payments/:paymentId` built | — |
| receipts/tax-invoice/templates PDF | 🟡 | invoice+receipt print ✅ + email-template module ✅; multi-template style variants 🟡 | S |
| award/loyalty points, sell_gift_card | ✅ | loyalty points awarded on sale ✅; gift-card module ✅ | — |

## 5. Quotes / Proformas / Requisitions / Transfers / Materials

| Legacy | Status | Gap | Effort |
|---|---|---|---|
| Quotes (sales+purchase, approval, convert, pdf/email) | 🟡 | CRUD+status+convert+pdf+email ✅; sales/purchase split + formal **approval** flow 🟡 | S |
| **Proformas** (lab-test/radiology/blood line items, pdf/email) | ✅ | CRUD ✅ + **clinical lab/radiology line items** (JSON) ✅ + pdf/email ✅ | — |
| Requisitions (approval, received, pdf/email) | ✅ | CRUD+approve/reject/receive+pdf/email ✅; department routing minor | — |
| Transfers (send/receive, csv, pdf/email) | ✅ | CRUD+send/receive+import+pdf/email ✅ | — |
| Materials (damages, repairs, csv, pdf/email) | ✅ | CRUD+import+damages+repairs+pdf/email ✅ | — |

## 6. POS

| Legacy | Status | Gap | Effort |
|---|---|---|---|
| registers open/close, sessions, checkout, PIN, gateway balances, lookup | ✅ | ✅ | — |
| serial lookup, **suspend bills** (`opened_bills`), email receipt, business/payments config | ✅ | hold/resume bills ✅ + serial lookup ✅; email receipt via comms ✅; gateway config stored (processing descoped — §10.3) | — |

## 7. Reports (legacy Reports.php = 11,816 lines)

| Area | Status |
|---|---|
| sales/purchase summary, product sales, inventory valuation, low-stock, expiry, tax summary, profit, payments | ✅ |
| **GST GSTR-1/2/3B**, P&L, party-ledger | ✅ (simplified) |
| **daily/monthly, register log, top customers/suppliers, stock-by-category, sales-by-user, sales-by-brand, financial-statement** | ✅ (delivered — were the biggest gap) |
| AMC/warranty, best-sellers, per-patient report | 🟡 niche sub-reports not built |

## 8. System Settings (legacy 3,300 lines)

| Area | Status |
|---|---|
| categories/subcategories/units/tax/variants/currencies/customer-groups/expense+income categories | ✅ (as modules) |
| warehouses | ✅ via kalnostics branches |
| email templates, business settings, gateway JSON config, permission-matrix UI | ✅ (email-template module migration 0013; config stored; matrix UI present) |
| live payment-gateway **processing/IPN** | ⛔ descoped (§10.3) |

## 9. Cross-cutting

| Legacy | Status | Notes |
|---|---|---|
| Notifications | ✅ | module built |
| Calendar | ✅ | module built |
| Auth/Users/Groups | ✅ (delegated) | kalnostics owns identity |
| Permissions matrix | ✅ | catalog+resolve + admin UI present |
| Payments IPN (PayPal/Skrill/Stripe webhooks) | ⛔ | **explicitly descoped by stakeholder** |
| Welcome: dashboard widgets, promotions | ✅ | report dashboard + widgets + `promotion` module built |
| **Multi-language (7+ locales) + RTL** | ✅ | `I18nProvider` + language switcher; full per-string translation is incremental |
| Sync (master↔branch replication) | ⛔ | legacy multi-DB artefact — obsolete under single shared DB (§11) |
| Api.php / Api_BIN.php (AJAX/BIN) | 🟡 | most covered by REST; blood-bank BIN partial |

---

## 10. Remaining genuine gaps (post-reconciliation)

Everything else in §1–9 is delivered. These are the only real outstanding items:

### 10.1 Global / cross-tenant master-product catalogue — **DELIVERED (2026-11-10)**
The legacy `master_products` let a central authority maintain global products
that **any tenant could selectively import**. This is now built, **SiteAdmin-governed**
(the option chosen over the legacy `tenant_id=0` sentinel):
- **Platform-level model** `InventoryMasterProduct` (no `tenant_id`, no RLS policy)
  — migration `0019_master_product_catalogue`. Tenant products gained a
  `sourceMasterProductId` back-link.
- **SiteAdmin auth** replicated into the inventory backend: a `'jwt-siteadmin'`
  strategy + `SiteAdminGuard` + `@CurrentSiteAdmin()` (shared `JWT_SECRET`,
  `type:'siteadmin'` discriminator). No login here — tokens come from kalnostics-new.
- **Endpoints:** SiteAdmin-only `GET/POST/PATCH/DELETE /master-products/manage*`
  (manage the catalogue); business `GET /master-products` (browse importable) +
  `POST /master-products/import { ids }` (copy into own products via
  `ProductService`, find-or-create category, per-tenant dedupe on
  `sourceMasterProductId`).
- **Import carries full classification:** a master stores category, sub-category,
  unit, brand and tax-rate (name + %); on import each is **find-or-created** per
  tenant (migration `0020`), so imported products come through fully classified.
  Importing invalidates all affected list caches on the FE.
- **Frontend (business):** "Master Data" page (Catalog menu) — browse +
  multi-select + **Import selected** (gated on `products.create`).
- **Frontend (SiteAdmin):** a full **"Inventory Masters"** CRUD screen now lives
  in **kalnostics-siteadmin-fe** (`/inventory-master-products`) — it calls the
  inventory backend's `/master-products/manage` with the SiteAdmin token via a
  dedicated `inventoryApi` axios instance (CORS updated to allow the SiteAdmin
  origin).

> This closes the one gap with real business weight. The tenant-scoped
> `product-template` module remains for per-tenant blueprints; the new
> master-product catalogue is the cross-tenant, SiteAdmin-owned tier.

### 10.2 Niche product authoring — **partial**
Per-unit drug **serial-number authoring** (model exists, UI/flow thin) and
**homoeopathy potency** scripts remain deferred as low-value legacy niches.
Effort: **M**.

### 10.3 Payment-gateway processing / IPN — **descoped**
Gateway **configuration** is stored and balances surface in POS, but live
**processing + IPN webhooks** (PayPal/Skrill/Stripe/Authorize.net) are
**explicitly descoped by the stakeholder**. Standing, agreed exclusion.

### 10.4 Minor polish — **mostly delivered (2026-11-10)**
Six quick-win items were completed:
- ✅ **Biller logo** — logo thumbnail now shown in the billers list (the
  `logoUrl` field already existed; a full upload/picker still needs upload infra).
- ✅ **Customer referral suggestions** — `referredByCustomerId` self-relation
  (migration 0018) + a "Referred by" customer picker on the customer form.
- ✅ **Product view/pdf detail** — read-only `ProductDetailDialog` (full record,
  variants, per-branch stock) opened from the products list.
- ✅ **Barcode/label symbology** — labels can print as Code 39 **or QR**
  (`symbology` on `POST /print/barcodes` + a selector in the barcode dialog).
- ✅ **Receipt/invoice template variants** — `GET /print/sale/:id?template=`
  (`standard` | `tax` | `simple`) + a "Tax" invoice print button on Sales.
- ✅ **Quote → purchase convert** — `POST /quotes/:id/convert` now also converts
  a PURCHASE quote into an ORDERED purchase; "To purchase" button on Quotes.
  (Type split + approve/reject already existed.)

Still open: biller/manufacturer **upload-based logo picker**, barcode/label
**paper-size style variants** beyond the four sizes, `generate_bd_purchase`
one-click shortcut, and a few **niche reports** (AMC/warranty, best-sellers,
per-patient). All small or low-use.

---

## 11. Sync.php — confirmed OBSOLETE (no port)

Legacy `Sync.php` existed only to replicate data between the **master DB** and
each tenant's **per-tenant MySQL database** (the old one-DB-per-tenant design).
The new stack is a **single shared PostgreSQL database** with Row-Level Security
keyed on `app.current_tenant_id` — there is no master/branch DB split to
reconcile, so the entire incremental-sync mechanism has no counterpart and is
**intentionally not ported**. No functional capability is lost.

## 12. Document email — DONE (via kalnostics comms API)

Legacy "email this invoice/PO/quote/proforma" is functional. The inventory
backend owns **no** mail transport; a new `integration` module
(`KalnosticsCommsClient`) forwards the caller's Bearer token to kalnostics-new's
`POST /communications/send` (Exchange gateway). Endpoint: `POST /print/email`
`{ type: sale|purchase|quote|proforma, id, to, message? }`. FE: shared
`EmailDocumentButton` on the Sales, Purchases, Quotes and Proformas lists.
