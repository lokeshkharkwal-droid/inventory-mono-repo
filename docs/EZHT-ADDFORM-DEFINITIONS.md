# EZ Health Track — Exact Add-Form Definitions (parity spec)

Read-only extraction of every legacy `add` form's **exact** fields, layout, required
flags, dropdown options and (for document forms) line-item columns. Source:
`ezhealthtrack/inventory/themes/default/views/<entity>/add*.php` (+ matching
controller). This is the authoritative checklist for the "replicate exactly" pass.

Conventions: **bold** = required (legacy `required`/`data-bv-notempty`). `(dd)` =
dropdown/select. `(file)` = file upload. ~~strike~~ = present in markup but
commented-out or `.hide`n (NOT shown — exclude for exact parity). “col-N” notes the
Bootstrap column width (layout). Fields already built this session are marked ✅.

---

## 1. Address / party forms  — BUILT ✅

### Supplier (`suppliers/add.php`) — modal-lg, 2 columns ✅
Left: **Company**, **Email Address**, **Address**, Country (dd, location),
**State** (location), **City** (location), **Postal Code** (zip, maxlen 6),
**Status** (dd Active/Inactive). Right: **Name**, **Phone** (tel), Drug License,
VAT No., GST No., PAN No., GST State (dd). ~~type (company/person)~~,
~~contact_person~~, ~~cf1–6 (.hide)~~.

### Manufacturer (`manufacturers/add.php`) — modal-lg, 2 col + full-width footer ✅
Row1: Logo (dd of uploaded logos) + preview. Left: **Company**, **Name**, VAT No.,
**Email Address**, **Phone**, **Address**, City, State, **Status** (dd). Right:
Postal Code, Country, cf1–6 (visible here). Full width: Invoice Footer (textarea).
~~contact_person~~.

### Customer (`customers/add.php`) — modal-lg, 2 col ✅
Top (full): **Default Customer Group** (dd). Left: **Company**, **Name**, VAT No.,
**Email Address**, **Phone**, **Address**, City, State, **Status** (dd). Right:
Postal Code, Country, ccf1–6. ~~contact_person~~.

> City/State/Country rendered as dependent **location dropdowns** (SiteAdmin data)
> per the new requirement, replacing the legacy free-text/typeahead inputs.

---

## 2. Financial forms — BUILT ✅

### Expense (`purchases/add_expense.php`) — modal, single column ✅
**Date**, Reference (auto), Category (dd), Warehouse (dd), **Amount**, HSN Code,
GST No., Attachment (file), Note (textarea). ~~tax_method (commented)~~. No Status.

### Income (`sales/add_income.php`) — modal, single column ✅
**Date**, Reference (auto), Category (dd), Warehouse (dd), **Amount**,
**Tax Method** (dd: GST / iGST, default GST), Attachment (file), Note. No Status.

---

## 3. Material (`materials/add.php`) — modal, 3-col grid (col-md-4) — NOT built
~27 fields:
1. **Date** (datetime) · 2. Purchase Order No (reference_no) · 3. **Biller** (dd) ·
4. **Warehouse** (dd) · 5. Department (input, "select dept to load") ·
6. Department Room · 7. **Product Name** · 8. Product Category · 9. Seller Name ·
10. **Quantity** · 11. Purchase Date (date) · 12. Installation Date (date) ·
13. **Material Status** (dd: *completed, pending*) · 14. Unit Price · 15. Grand Total ·
16. AMC Cost · 17. CMC Cost · 18. Estimated Present Cost · 19. Codal Life ·
20. **AMC Status** (dd: *pending, due, expired, active*) · 21. AMC Start Date (date) ·
22. AMC End Date (date) · 23. Issue To · 24. Transfer To · 25. Document (file) ·
26. Material Note (textarea) · 27. Staff Note (textarea).

**New backend columns needed on `InventoryMaterial`:** billerId, warehouseId(branchId),
department, departmentRoom, productCategory, sellerName, purchaseDate, installationDate,
materialStatus, unitPrice, grandTotal, amcCost, cmcCost, estimatedPresentCost,
codalLife, amcStatus, amcStartDate, amcEndDate, issueTo, transferTo, documentUrl,
staffNote. (Current model has: name, code, category, unit, quantity, cost, note.)

---

## 4. Patient (`customers/add_patient.php`) — modal, 3-col — NOT built
**A full CLINICAL registration form, not an inventory customer** (≫ scope):
1. **First Name** · 2. Middle Name · 3. Last Name · 4. **Gender** (dd) · 5. Age ·
6. DOB (DD-MM-YYYY) · 7. Registration Date · 8. Email · 9. Mobile (+ hidden code) ·
10. **Patient Type** (dd) · 11. **Address** · 12. Address 2 · 13. Country (dd, location) ·
14. State (location) · 15. City (location) · 16. Area (location) · 17. **Postal/zip**
(maxlen 6) · 18. ID Type (dd uid_type) · 19. UID · 20. GST No. · 21. PAN No. ·
22. GST State (dd) · 23. Height · 24. (weight/blood group) · 25. Visible Mark.

> Recommendation: Patient belongs to the patient-registration domain. In the
> inventory app, "Patients" = customers linked to a patient. A full clinical port
> here needs many new columns + is arguably out of inventory scope — confirm intent.

---

## 5. Document (line-item) forms — large; mostly parity-migrated earlier

### Transfer (`transfers/add.php`) — NOT re-skinned
Header: **Date**, **From Warehouse** (dd), **To Warehouse** (dd), Reference No,
From Department (dd), To Department (input), add-item search.
Item columns: Product Name (Code), Expiry Date, Product Serial, Pack Size,
Pack Quantity, Rate, MRP, Product Tax, Subtotal, ✕.
Footer: Document (file), **Status** (dd), Shipping, Note.

### Requisition (`requisitions/add.php`) — NOT re-skinned
Header: **Date**, **Biller** (dd), **From/Source Warehouse** (dd), **To Warehouse**
(dd), Reference No, From Department (dd), To Department, **Order Tax** (dd), Discount,
Shipping, Supplier, **Referral**, Source Type, First/Middle/Last Name, **Customer**,
add-item.
Item columns (**required ≥1**): Product Name (Code), Net Unit Price, Quantity,
Discount, Product Tax, Subtotal, ✕. Footer: Document (file).

### Proforma (`proformas/add.php`) — NOT re-skinned
Header: Name, Date, Reference No, Biller (dd), Order Tax (dd), Discount, Shipping,
Status (dd), Supplier, Referral, Source Type, First/Middle/Last Name, Warehouse (dd),
Customer, add-item. Item columns: Product Name, Net Unit Price, Quantity,
Quantity Method, Subtotal. Footer: Note. (Per-item ptax/mtax dropdowns.)

### Quote — Sales (`quotes/add_sales.php`) / Purchase (`quotes/add_purchase.php`)
Header (sales): Date, Biller (dd), Supplier/Patient/Customer, Referral, Reference No,
Source Type, First/Middle/Last Name, Warehouse (dd), add-item. Item columns:
Product Name, Net Unit Price, Pack Size, Pack Quantity, Quantity, Subtotal.
Footer: Document, Status (dd), Discount, Order Tax (dd), Shipping, GST No., GST State
(dd), Note.

### Purchase (`purchases/add.php`) — NOT re-skinned
Header: Date, Warehouse (dd), Supplier, Tax Method (dd), Reference No, add-item.
Item columns: Product Name, Product Serial, Pack Size, Pack Quantity,
Free Pack Quantity, Rate, MRP, Subtotal. Footer: Document, Discount, Status (dd),
Order Tax (dd), Shipping, Payment Term, GST No., GST State (dd), Category (dd), Note.

### Product (`products/add.php`) — ~50 fields; parity-migrated earlier
Type (dd), **Name**, Code, Barcode Symbology (dd), Category (dd), Subcategory,
Unit (dd), Pack Size, Sales Method (dd), Pack Cost, Unit Cost, Pack MRP, Unit MRP,
Promo Price (+ start/end date), Tax Rate (dd), HSN Code, Tax Method (dd),
Tax Method Purchase (dd), Alert Quantity, Product Image, Gallery Images,
per-warehouse Quantity (wh_qty + rack), Combo products (name/quantity/unit_price),
Digital File, Manufacturer, Suppliers (×5: supplier + part_no + price), Composition,
Strength, Unit Type (dd), Formulations (dd), Route (dd), Frequency (dd),
Number of Days, Prescription Quantity, Refills (dd + times), Prescription Notes (dd),
Product Details (textarea), Details-for-invoice (textarea).

---

## Build status summary
| Form | Exact fields captured | Rebuilt pixel-match | New BE columns needed |
| --- | :--: | :--: | --- |
| Supplier | ✅ | ✅ | done (0032/0033) |
| Manufacturer | ✅ | ✅ | done (0032/0033) |
| Customer | ✅ | ✅ | done (0032/0033/0034) |
| Expense | ✅ | ✅ | done (0032) |
| Income | ✅ | ✅ | done (0032) |
| Material | ✅ | ✅ | done — all 27 fields already modeled (no line table) |
| Patient | ✅ | ✅ | done (0037 + PatientFormPage) — clinical set present |
| Transfer | ✅ | ✅ | done — +Status/Document footer, "Product Tax" label (0039) |
| Requisition | ✅ | ✅ | done — exact item headers + "Document" label |
| Proforma | ✅ | ✅ | done — name/status/quantity_method + item table (0038) |
| Quote (sales/purchase) | ✅ | ✅ | done — full page table form + header/footer (0039) |
| Purchase | ✅ | ✅ | done — serial/pack/free-pack/part-no cols + Roundoff (FE) |
| Product | ✅ | ✅ (earlier parity migration) | mostly present |

> **Status: all add forms are at field/label/table parity** (verified live at
> nginx :8080/inventory-app). Backend columns: Proforma = migration 0038;
> Quote + Transfer = migration 0039; Material/Patient/Requisition/Purchase needed
> no new columns (already present from 0032–0037).
