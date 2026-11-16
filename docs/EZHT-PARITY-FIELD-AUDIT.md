# EZ Health Track → Inventory Monorepo — Add/Edit Field Audit (Phase 0)

Source of truth: `ezhealthtrack/inventory/themes/default/views/<entity>/add.php`.
Monorepo: `inventory/apps/frontend/src/pages/**` + `features/**`.
Backend tables: `inventory/apps/backend/prisma/schema.prisma`.

Legend: **bold** = field missing in the monorepo form today. `(col?)` = no backend
column yet (needs a Phase 3 migration). Monorepo-only fields are noted separately.

---

## Supplier  (monorepo 9 ⇄ EZHT ~22)
EZHT `suppliers/add.php`:
1. **type** (company/person) `(col?)`
2. company → companyName
3. email
4. **contact_person** `(col?)`
5. name
6. address
7. **country** `(col?)`
8. **state** `(col?)`
9. **city** `(col?)`
10. **postal_code / zip** (maxlen 6) `(col?)`
11. status → isActive
12. phone
13. **drug_license** `(col?)`
14. **vat_no** `(col?)`
15. **gst_no** `(col?)`
16. **pan_no** `(col?)`
17. **gst_state** (dropdown) `(col?)`
18–23. **cf1–cf6** (custom fields) `(col?)`

Monorepo today: name, code, companyName, phone, email, address, taxNumber,
openingBalance, isActive. (`code`, `openingBalance`, `taxNumber` are monorepo extras
to keep.)

**Phase 3 cols on `InventorySupplier`:** type, contactPerson, country, state, city,
postalCode, drugLicense, vatNo, gstNo, panNo, gstState, cf1…cf6.

---

## Manufacturer  (monorepo 10 ⇄ EZHT ~20)
EZHT `manufacturers/add.php`:
1. logo (dropdown) → imageUrl
2. company → companyName
3. name
4. **vat_no** `(col?)`
5. **contact_person** `(col?)`
6. email
7. phone
8. address
9. **city** `(col?)`
10. **state** `(col?)`
11. status → isActive
12. **postal_code** `(col?)`
13. **country** `(col?)`
14–19. **cf1–cf6** `(col?)`
20. **invoice_footer** `(col?)`

Monorepo today: companyName, name, code, email, phone, website, imageUrl, address,
note, isActive. (`code`, `website`, `note` monorepo extras.)

**Phase 3 cols on `InventoryManufacturer`:** vatNo, contactPerson, city, state,
postalCode, country, cf1…cf6, invoiceFooter.

---

## Customer  (monorepo 9 ⇄ EZHT ~18)
EZHT `customers/add.php`: company, name, **vat_no**, **contact_person**, email, phone,
address, **city**, **state**, status, **postal_code**, **country**, **ccf1–ccf6**.
EZHT `customers/add_patient.php` additionally: **gst_no**, **pan_no**, **gst_state**.

Monorepo today: name, code, companyName, phone, email, address, taxNumber, creditLimit,
referredByCustomerId, isActive.

**Phase 3 cols on `InventoryCustomer`:** contactPerson, vatNo, gstNo, panNo, gstState,
country, state, city, postalCode, ccf1…ccf6. (Patient variant reuses the same table.)

---

## Material  (monorepo 8 ⇄ EZHT ~30 — an asset/plant record)
EZHT `materials/add.php`: date, purchase_order_no, biller, warehouse, department,
department_room, product_name, product_category, seller_name, quantity, purchase_date,
installation_date, material_status, unit_price, grand_total, amc_cost, cmc_cost,
estimated_present_cost, codal_life, amc_status, amc_start_date, amc_end_date, issue_to,
transfer_to, document (file), material_note, staff_note. (+ Repairs and Damages are
separate sub-records — see Phase 5.)

Monorepo today: name, code, category, unit, quantity, cost, note, isActive.

**Phase 3 cols on `InventoryMaterial`:** large gap — purchaseOrderNo, billerId,
warehouseId, departmentId, departmentRoom, sellerName, purchaseDate, installationDate,
materialStatus, unitPrice, grandTotal, amcCost, cmcCost, estimatedPresentCost,
codalLife, amcStatus, amcStartDate, amcEndDate, issueTo, transferTo, documentUrl,
materialNote, staffNote. (Review which EZHT fields are in scope with the user — this is
a far larger form than the monorepo's simple material.)

---

## Expense  (monorepo 5 ⇄ EZHT ~9)
EZHT `purchases/add_expense.php`: date, reference, warehouse, amount, **hsn_code**,
**tax_method**, **gst_no**, **attachment** (file), note.
Monorepo today: amount, categoryId, reference, date, note.
**Phase 3 cols on `InventoryExpense`:** warehouseId, hsnCode, taxMethod, gstNo,
attachmentUrl.

## Income  (monorepo 5 ⇄ EZHT ~8)
EZHT `sales/add_income.php`: date, reference, warehouse, amount, **tax_method**,
**attachment** (file), note.
Monorepo today: amount, categoryId, reference, date, note.
**Phase 3 cols on `InventoryIncome`:** warehouseId, taxMethod, attachmentUrl.

---

## Document-style entities (line-item forms — convert FormDialog → page)
- **Proforma** (`proformas/add.php`): header (customer, date, branch, warehouse…) +
  line items (lab tests / products) + totals. Monorepo `ProformaFormDialog`.
- **Transfer** (`transfers/add.php`): from/to warehouse, date, status, note + items.
  Monorepo `TransferFormDialog`.
- **Quote — Sales & Purchase** (`quotes/add_sales.php`, `quotes/add_purchase.php`):
  customer/supplier, date, warehouse, tax/discount + items. Monorepo `QuoteFormDialog`.
These keep their existing field set in Phase 2 (structure only → full-page); detailed
line-item parity is Phase 4.

---

## Notes
- Custom fields `cf1–cf6` / `ccf1–ccf6` in EZHT are generic extra-attribute columns;
  reproduce as nullable text columns + optional form inputs (labels come from EZHT
  settings in the legacy app — default to "Custom field N" unless configured).
- `status` (EZHT active/inactive dropdown) maps to the existing `isActive` boolean.
- Keep monorepo-only niceties (`code`, `openingBalance`, `creditLimit`, `website`,
  `note`, `referredBy`) — they are additive, not conflicting.
