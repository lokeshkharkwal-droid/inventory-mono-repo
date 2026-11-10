# EzHealthTrack Inventory → inventory-monorepo — Feature Gap Analysis

Evidence-based comparison of the legacy `ezhealthtrack/inventory` controllers
(25 controllers) against the implemented NestJS backend routes + React pages.
Status: ✅ done · 🟡 partial · ❌ missing.

Legend of effort: **S** small (hours) · **M** medium (a day) · **L** large (multi-day).

---

## 1. Parties

| Legacy | Status | Gap detail | Effort |
|---|---|---|---|
| Billers (CRUD, logos) | 🟡 | CRUD ✅. `getLogoList` logo picker ❌ | S |
| Suppliers (CRUD, import, portal users) | 🟡 | CRUD+import ✅. **Portal users** (`add_user`) ❌ | S |
| Customers (CRUD, import) | 🟡 | CRUD+import ✅ | — |
| Customers → **Deposits/advances** | ❌ | `deposits/add_deposit/edit/delete/deposit_note` not built | M |
| Customers → **Patients** tab | ❌ | legacy patient CRUD under customers (kalnostics owns patients — decide link vs port) | M |
| Customers → portal users, referral suggestions, award points | ❌ | not built | M |
| **Manufacturers** (CRUD, logos) | ❌ | **entire module missing** (is a party, `companies.group_name=manufacturer`) | S |

## 2. Products

| Legacy action | Status | Gap detail | Effort |
|---|---|---|---|
| CRUD, list, view | 🟡 | CRUD+list ✅. `modal_view`/`pdf` detail view ❌ | S |
| import_products / import_csv / update_csv | ✅ | CSV import pipeline ✅ | — |
| quantity_adjustments | ✅ | stock adjustments ✅ | — |
| **print_barcodes** (multi-product label sheet, styles) | ❌ | only single-product label exists | M |
| single_label / barcode / gen_barcode | 🟡 | single label ✅; style variants ❌ | S |
| set_rack | 🟡 | rack column exists; no set-rack endpoint/UI | S |
| **update_price** (bulk price/cost update) | ❌ | not built | S |
| **drug/batch/serial + expiry** authoring | 🟡 | batches created via purchase only; no serial tracking, no drug modal | L |
| **homoeopathy potency** scripts | ❌ | niche legacy feature | M |
| variants/options with per-option stock | 🟡 | variant master ✅; product-level options w/ stock ❌ | M |
| getHSNCode / getSubCategories ajax | 🟡 | helpers; covered differently | S |
| master_products (SITE templates) | ❌ | lab two-tier concept; decide scope | M |

## 3. Purchases

| Legacy | Status | Gap | Effort |
|---|---|---|---|
| CRUD, receiving, import | ✅ | ✅ | — |
| payments (add) | 🟡 | add ✅; **edit_payment/delete_payment** ❌ | S |
| returns | 🟡 | create+list+view ✅; process/refund detail 🟡 | M |
| **expenses** (freight/insurance) | ❌ | `expenses/add_expense/edit/delete` not built | M |
| **supplier_payments** (supplier-level ledger) | ❌ | not built | M |
| pdf / combine_pdf / email | 🟡 | print PO ✅; combine/email ❌ | M |
| generate_bd_purchase (blood-donation PO) | ❌ | not built | M |

## 4. Sales

| Legacy | Status | Gap | Effort |
|---|---|---|---|
| CRUD, import | 🟡 | create/list/delete ✅; **edit sale** ❌ | M |
| returns, deliveries, payments, incomes, gift cards | ✅ | all present as modules ✅ | — |
| payment edit/delete | ❌ | only add | S |
| receipts/tax-invoice/templates PDF | 🟡 | invoice+receipt print ✅; template variants ❌ | M |
| award/loyalty points, sell_gift_card | ❌ | not built | M |

## 5. Quotes / Proformas / Requisitions / Transfers / Materials

| Legacy | Status | Gap | Effort |
|---|---|---|---|
| Quotes (sales+purchase, approval, convert, pdf/email) | 🟡 | CRUD+status+convert ✅; sales/purchase split, **approval**, pdf/email ❌ | M |
| **Proformas** (lab-test/radiology/blood line items, multi-branch, pdf/email) | 🟡 | basic CRUD ✅; **clinical line items + types ❌ (big)** | L |
| Requisitions (approval, received, pdf/email) | 🟡 | CRUD+approve/reject/receive ✅; pdf/email, departments ❌ | S |
| Transfers (send/receive, csv, pdf/email) | 🟡 | CRUD+send/receive+import ✅; pdf/email ❌ | S |
| Materials (damages, repairs, csv, pdf/email) | 🟡 | CRUD+import+damages+repairs ✅; pdf/email/view ❌ | S |

## 6. POS

| Legacy | Status | Gap | Effort |
|---|---|---|---|
| registers open/close, sessions, checkout, PIN, gateway balances, lookup | ✅ | ✅ | — |
| serial lookup, receipt templates, suspend bills (`opened_bills`), email_receipt, business_settings/write_payments_config | ❌ | not built | M |

## 7. Reports (legacy Reports.php = 11,816 lines)

| Area | Status |
|---|---|
| sales/purchase summary, product sales, inventory valuation, low-stock, expiry, tax summary, profit, payments | ✅ |
| **GST GSTR-1/2/3B**, P&L, party-ledger | ✅ (simplified) |
| **daily/monthly, register logs, staff, customer/supplier/patient, AMC/warranty, best-sellers, by category/brand, detailed tax** | ❌ (**L — biggest single gap**) |

## 8. System Settings (legacy 3,300 lines)

| Area | Status |
|---|---|
| categories/subcategories/units/tax/variants/currencies/customer-groups/expense+income categories | ✅ (as modules) |
| warehouses | ✅ via kalnostics branches |
| **payment gateways config, email templates, business settings, user preferences/locale/RTL, user groups+permission matrix UI** | ❌ (L) |

## 9. Cross-cutting

| Legacy | Status | Notes |
|---|---|---|
| Notifications | ✅ | module built |
| Calendar | ✅ | module built |
| Auth/Users/Groups | ✅ (delegated) | kalnostics owns identity |
| Permissions matrix | 🟡 | catalog+resolve ✅; admin UI ❌ |
| Payments IPN (PayPal/Skrill/Stripe webhooks) | ⛔ | **explicitly descoped by stakeholder** |
| Welcome: dashboard widgets, promotions, image_upload, downloads | 🟡 | report dashboard ✅; widgets/promotions ❌ |
| **Multi-language (7+ locales) + RTL** | ❌ | English only (L) |
| Sync (master↔branch replication) | ⛔ | legacy multi-DB artefact — obsolete under single shared DB |
| Api.php / Api_BIN.php (AJAX/BIN) | 🟡 | most covered by REST; blood-bank BIN partial |

---

## ✅ Completion status (all 10 tracked tasks delivered)

1. ✅ **Manufacturers** module (BE+FE, migration 0012)
2. ✅ **print_barcodes** multi-label sheet (BE+FE)
3. ✅ **Customer deposits** (BE+FE); portal users = N/A (kalnostics owns identity)
4. ✅ **Purchase expenses + supplier payments + payment edit/delete** (BE+FE, migration 0013)
5. ✅ **Sale edit** + products **bulk-price** + **set-rack** (BE+FE)
6. ✅ **PDF/print parity** for quotes/proformas/requisitions/transfers/materials (BE+FE)
7. ✅ **Reports expansion** — daily/monthly, top customers/suppliers, stock-by-category, sales-by-staff (BE+FE)
8. ✅ **System settings** — email-templates module (migration 0013), business profile, gateway JSON config; permission matrix UI already present
9. ✅ **Proforma clinical** line items — lab/radiology/blood types (BE+FE)
10. ✅ **i18n (7 locales) + RTL** + language switcher + translated shell; dashboard widgets present

**Remaining niche deferral:** full **drug serial-number tracking** + **homoeopathy potency** scripts (legacy niche; product drug-meta fields `genericName`/`strength` exist, but per-unit serial tracking is not built). Payment-gateway **processing/IPN** remains descoped per stakeholder. Full per-string i18n translation beyond the shell is incremental (infrastructure + fallback is in place).

## Completion plan (priority order)

1. **Manufacturers** module (S) — flagged
2. **print_barcodes** multi-label sheet (M) — flagged
3. Customer **deposits** + Customer/Supplier **portal users** (M)
4. Purchase **expenses** + **supplier payments**; purchase/sale **payment edit/delete** (M)
5. **Sale edit** (M)
6. Products: **bulk price update**, **set rack**, product view/pdf (S–M)
7. **PDF/email** parity for quotes/proformas/requisitions/transfers/materials (M)
8. **Reports** suite expansion — daily/monthly/register/staff/customer/supplier/AMC (L)
9. **System settings**: payment gateways, email templates, business settings, permission-matrix UI (L)
10. **Proforma clinical** line items (lab-test/radiology/blood) (L)
11. Multi-language + RTL (L); homoeopathy/drug-serial (L); Welcome widgets (M)
12. Confirm **Sync** obsolete; IPN descoped.

> Honest note: items 8–11 are each multi-day. The bounded module gaps (1–7) are
> being completed first; the large suites are tracked and done in sequence.

## Sync.php — confirmed OBSOLETE (no port)

Legacy `Sync.php` existed only to replicate data between the **master DB** and
each tenant's **per-tenant MySQL database** (the old one-DB-per-tenant design).
The new stack is a **single shared PostgreSQL database** with Row-Level Security
keyed on `app.current_tenant_id` — there is no master/branch DB split to
reconcile, so the entire incremental-sync mechanism has no counterpart and is
**intentionally not ported**. Per-tenant isolation that `Sync` used to achieve by
physical DB separation is now enforced by RLS policies on every `inventory_*`
table. No functional capability is lost. (Risk §12.9 resolved.)

## Document email — DONE (via kalnostics comms API)

Legacy "email this invoice/PO/quote/proforma" is now functional. The inventory
backend owns **no** mail transport; instead a new `integration` module
(`KalnosticsCommsClient`) forwards the caller's Bearer token to kalnostics-new's
`POST /communications/send` (Exchange gateway). Endpoint: `POST /print/email`
`{ type: sale|purchase|quote|proforma, id, to, message? }` — renders the document
HTML, base64-attaches it, and queues the email in the caller's tenant/branch
context. FE: shared `EmailDocumentButton` on the Sales, Purchases, Quotes and
Proformas lists. Requires `KALNOSTICS_API_BASE_URL` to point at a running
kalnostics-new (already in `.env.example`).

## Payment gateways — processing/IPN descoped (stakeholder)

Gateway **configuration** is stored (`inventory_settings.paymentGateways`) and
balances are surfaced in POS, but live **payment processing + IPN webhooks**
(PayPal/Skrill/Stripe/Authorize.net) remain **descoped by the stakeholder**. This
is the one standing, explicitly-agreed exclusion.
