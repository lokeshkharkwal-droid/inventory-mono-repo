/**
 * Demo-data seed for the inventory reports migration.
 *
 * Populates a single tenant/branch with internally-consistent, report-exercising
 * data so every migrated EZHealthTrack report shows real numbers: products with
 * varied stock (some below reorder), batches (expired / near-expiry / healthy),
 * suppliers & customers (incl. patients), purchases & sales with items + tax +
 * part/full payments, transfers between two branches, expenses, incomes,
 * materials + tools & plants (+ damages/repairs), IPD admissions + department
 * charges, a POS register with open/closed sessions, and supplier payments.
 *
 * Idempotent: wipes all inventory_* rows for the target tenant first, then
 * reseeds. Runs inside an RLS tenant transaction (set_config app.current_tenant_id)
 * so FORCE ROW LEVEL SECURITY WITH CHECK passes.
 *
 * Run:  pnpm seed:demo
 * Env:  SEED_TENANT_ID (default demo-tenant-0000-0000-000000000001)
 *       SEED_BRANCH_ID  (default demo-branch-0000-0000-000000000001)
 */
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';

// Load apps/backend/.env (raw PrismaClient does not auto-load it at runtime).
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[1] && !process.env[m[1]]) {
      process.env[m[1]] = m[2]!.replace(/^["']|["']$/g, '');
    }
  }
}

const prisma = new PrismaClient();

const TENANT = process.env.SEED_TENANT_ID ?? 'demo-tenant-0000-0000-000000000001';
const BRANCH = process.env.SEED_BRANCH_ID ?? 'demo-branch-0000-0000-000000000001';
const BRANCH2 = 'demo-branch-0000-0000-000000000002';

/** Synthetic staff person-ids (identity lives in kalnostics; reports group by these). */
const STAFF = [
  'aaaa1111-0000-0000-0000-000000000001',
  'bbbb2222-0000-0000-0000-000000000002',
  'cccc3333-0000-0000-0000-000000000003',
];

const now = new Date();
const daysAgo = (n: number): Date => new Date(now.getTime() - n * 86_400_000);
const daysAhead = (n: number): Date => new Date(now.getTime() + n * 86_400_000);
const round2 = (n: number): number => Math.round(n * 100) / 100;
const id = (): string => randomUUID();

async function main(): Promise<void> {
  console.log(`Seeding demo inventory data for tenant=${TENANT} branch=${BRANCH}`);

  await prisma.$transaction(
    async (tx) => {
      // RLS context so FORCE RLS WITH CHECK passes for every write below.
      await tx.$executeRawUnsafe(
        `select set_config('app.current_tenant_id', $1, true)`,
        TENANT,
      );

      // ── 0. Wipe existing rows for this tenant (children → parents) ──────────
      const w = { where: { tenantId: TENANT } };
      await tx.inventorySalePayment.deleteMany(w);
      await tx.inventorySaleItem.deleteMany(w);
      await tx.inventorySale.deleteMany(w);
      await tx.inventoryPurchasePayment.deleteMany(w);
      await tx.inventoryPurchaseItem.deleteMany(w);
      await tx.inventoryPurchaseExpense.deleteMany(w);
      await tx.inventoryPurchase.deleteMany(w);
      await tx.inventoryTransferItem.deleteMany(w);
      await tx.inventoryTransfer.deleteMany(w);
      await tx.inventoryMaterialDamage.deleteMany(w);
      await tx.inventoryMaterialRepair.deleteMany(w);
      await tx.inventoryMaterial.deleteMany(w);
      await tx.inventoryIpdCharge.deleteMany(w);
      await tx.inventoryIpdAdmission.deleteMany(w);
      await tx.inventoryExpense.deleteMany(w);
      await tx.inventoryIncome.deleteMany(w);
      await tx.inventorySupplierPayment.deleteMany(w);
      await tx.inventoryCustomerDeposit.deleteMany(w);
      await tx.inventoryPosRegisterSession.deleteMany(w);
      await tx.inventoryPosRegister.deleteMany(w);
      await tx.inventoryProductBatch.deleteMany(w);
      await tx.inventoryWarehouseProduct.deleteMany(w);
      await tx.inventoryStockAdjustment.deleteMany(w);
      await tx.inventoryProductVariant.deleteMany(w);
      await tx.inventoryProductDrug.deleteMany(w);
      await tx.inventoryProduct.deleteMany(w);
      await tx.inventoryCustomer.deleteMany(w);
      await tx.inventorySupplier.deleteMany(w);
      await tx.inventoryTaxRate.deleteMany(w);
      await tx.inventoryBrand.deleteMany(w);
      await tx.inventoryUnit.deleteMany(w);
      await tx.inventorySubCategory.deleteMany(w);
      await tx.inventoryCategory.deleteMany(w);
      await tx.inventoryExpenseCategory.deleteMany(w);
      await tx.inventoryIncomeCategory.deleteMany(w);

      // ── 1. Master data ──────────────────────────────────────────────────────
      const cat = {
        analgesics: id(), antibiotics: id(), vitamins: id(),
        surgical: id(), diabetes: id(), general: id(),
      };
      await tx.inventoryCategory.createMany({
        data: [
          { id: cat.analgesics, tenantId: TENANT, code: 'ANLG', name: 'Analgesics', sortOrder: 1 },
          { id: cat.antibiotics, tenantId: TENANT, code: 'ANTB', name: 'Antibiotics', sortOrder: 2 },
          { id: cat.vitamins, tenantId: TENANT, code: 'VITM', name: 'Vitamins', sortOrder: 3 },
          { id: cat.surgical, tenantId: TENANT, code: 'SURG', name: 'Surgical', sortOrder: 4 },
          { id: cat.diabetes, tenantId: TENANT, code: 'DIAB', name: 'Diabetes Care', sortOrder: 5 },
          { id: cat.general, tenantId: TENANT, code: 'GEN', name: 'General', sortOrder: 6 },
        ],
      });

      const brand = { cipla: id(), sun: id(), gsk: id() };
      await tx.inventoryBrand.createMany({
        data: [
          { id: brand.cipla, tenantId: TENANT, code: 'CIP', name: 'Cipla' },
          { id: brand.sun, tenantId: TENANT, code: 'SUN', name: 'Sun Pharma' },
          { id: brand.gsk, tenantId: TENANT, code: 'GSK', name: 'GSK' },
        ],
      });

      const unit = { pcs: id(), box: id(), bottle: id() };
      await tx.inventoryUnit.createMany({
        data: [
          { id: unit.pcs, tenantId: TENANT, code: 'PCS', name: 'Pieces' },
          { id: unit.box, tenantId: TENANT, code: 'BOX', name: 'Box' },
          { id: unit.bottle, tenantId: TENANT, code: 'BTL', name: 'Bottle' },
        ],
      });

      const tax = { t0: id(), t5: id(), t12: id(), t18: id() };
      await tx.inventoryTaxRate.createMany({
        data: [
          { id: tax.t0, tenantId: TENANT, code: 'GST0', name: 'GST 0%', rate: 0, hsnCode: '3004' },
          { id: tax.t5, tenantId: TENANT, code: 'GST5', name: 'GST 5%', rate: 5, hsnCode: '3004' },
          { id: tax.t12, tenantId: TENANT, code: 'GST12', name: 'GST 12%', rate: 12, hsnCode: '3004' },
          { id: tax.t18, tenantId: TENANT, code: 'GST18', name: 'GST 18%', rate: 18, hsnCode: '9018' },
        ],
      });

      const expCat = { rent: id(), salary: id(), utilities: id() };
      await tx.inventoryExpenseCategory.createMany({
        data: [
          { id: expCat.rent, tenantId: TENANT, code: 'RENT', name: 'Rent' },
          { id: expCat.salary, tenantId: TENANT, code: 'SAL', name: 'Salaries' },
          { id: expCat.utilities, tenantId: TENANT, code: 'UTIL', name: 'Utilities' },
        ],
      });
      const incCat = { consult: id(), misc: id() };
      await tx.inventoryIncomeCategory.createMany({
        data: [
          { id: incCat.consult, tenantId: TENANT, code: 'CONS', name: 'Consultation' },
          { id: incCat.misc, tenantId: TENANT, code: 'MISC', name: 'Miscellaneous' },
        ],
      });

      // ── 2. Suppliers & customers ────────────────────────────────────────────
      const suppliers = [
        { id: id(), code: 'SUP-001', name: 'MedSupply Distributors', companyName: 'MedSupply Pvt Ltd', phone: '9800000001', openingBalance: 5000 },
        { id: id(), code: 'SUP-002', name: 'PharmaWholesale Co', companyName: 'PharmaWholesale', phone: '9800000002', openingBalance: 0 },
        { id: id(), code: 'SUP-003', name: 'HealthLine Traders', companyName: 'HealthLine', phone: '9800000003', openingBalance: 12000 },
        { id: id(), code: 'SUP-004', name: 'Surgicare Imports', companyName: 'Surgicare', phone: '9800000004', openingBalance: 0 },
        { id: id(), code: 'SUP-005', name: 'BioMed Agencies', companyName: 'BioMed', phone: '9800000005', openingBalance: 3500 },
      ];
      await tx.inventorySupplier.createMany({
        data: suppliers.map((s) => ({ ...s, tenantId: TENANT, isActive: true })),
      });

      const customers = [
        { id: id(), code: 'CUS-001', name: 'Walk-in Customer', phone: '9900000001', patientId: null as string | null },
        { id: id(), code: 'CUS-002', name: 'Rajesh Kumar', phone: '9900000002', patientId: null },
        { id: id(), code: 'CUS-003', name: 'Priya Sharma', phone: '9900000003', patientId: 'patient-0000-0000-0000-000000000003' },
        { id: id(), code: 'CUS-004', name: 'Apollo Clinic', companyName: 'Apollo Clinic', phone: '9900000004', patientId: null },
        { id: id(), code: 'CUS-005', name: 'Sunita Patel', phone: '9900000005', patientId: 'patient-0000-0000-0000-000000000005' },
        { id: id(), code: 'CUS-006', name: 'Mohammed Ali', phone: '9900000006', patientId: 'patient-0000-0000-0000-000000000006' },
        { id: id(), code: 'CUS-007', name: 'City Hospital', companyName: 'City Hospital', phone: '9900000007', patientId: null },
      ];
      await tx.inventoryCustomer.createMany({
        data: customers.map((c) => ({
          id: c.id, tenantId: TENANT, code: c.code, name: c.name,
          companyName: (c as { companyName?: string }).companyName ?? null,
          phone: c.phone, patientId: c.patientId, loyaltyPoints: 0, isActive: true,
        })),
      });

      // ── 3. Products + stock + batches ───────────────────────────────────────
      type P = {
        id: string; code: string; name: string; categoryId: string; brandId: string;
        unitId: string; taxRateId: string; rate: number; cost: number; price: number;
        alert: number; qty: number; hsn: string;
      };
      const products: P[] = [
        { id: id(), code: 'P-0001', name: 'Paracetamol 500mg Tablet', categoryId: cat.analgesics, brandId: brand.cipla, unitId: unit.pcs, taxRateId: tax.t12, rate: 12, cost: 0.8, price: 1.5, alert: 50, qty: 420, hsn: '3004' },
        { id: id(), code: 'P-0002', name: 'Amoxicillin 250mg Capsule', categoryId: cat.antibiotics, brandId: brand.sun, unitId: unit.pcs, taxRateId: tax.t12, rate: 12, cost: 1.2, price: 2.5, alert: 40, qty: 260, hsn: '3004' },
        { id: id(), code: 'P-0003', name: 'Azithromycin 500mg Tablet', categoryId: cat.antibiotics, brandId: brand.cipla, unitId: unit.pcs, taxRateId: tax.t12, rate: 12, cost: 8, price: 15, alert: 20, qty: 12, hsn: '3004' },
        { id: id(), code: 'P-0004', name: 'Vitamin C 1000mg Tablet', categoryId: cat.vitamins, brandId: brand.gsk, unitId: unit.pcs, taxRateId: tax.t5, rate: 5, cost: 2, price: 4, alert: 30, qty: 180, hsn: '3004' },
        { id: id(), code: 'P-0005', name: 'Ibuprofen 400mg Tablet', categoryId: cat.analgesics, brandId: brand.sun, unitId: unit.pcs, taxRateId: tax.t12, rate: 12, cost: 1, price: 2, alert: 60, qty: 340, hsn: '3004' },
        { id: id(), code: 'P-0006', name: 'Surgical Gloves (Box)', categoryId: cat.surgical, brandId: brand.gsk, unitId: unit.box, taxRateId: tax.t18, rate: 18, cost: 120, price: 180, alert: 15, qty: 8, hsn: '9018' },
        { id: id(), code: 'P-0007', name: 'Syringe 5ml (Box)', categoryId: cat.surgical, brandId: brand.gsk, unitId: unit.box, taxRateId: tax.t18, rate: 18, cost: 90, price: 140, alert: 25, qty: 70, hsn: '9018' },
        { id: id(), code: 'P-0008', name: 'Cough Syrup 100ml', categoryId: cat.analgesics, brandId: brand.cipla, unitId: unit.bottle, taxRateId: tax.t12, rate: 12, cost: 25, price: 45, alert: 20, qty: 55, hsn: '3004' },
        { id: id(), code: 'P-0009', name: 'Insulin Pen', categoryId: cat.diabetes, brandId: brand.sun, unitId: unit.pcs, taxRateId: tax.t5, rate: 5, cost: 250, price: 380, alert: 10, qty: 6, hsn: '3004' },
        { id: id(), code: 'P-0010', name: 'Multivitamin Syrup', categoryId: cat.vitamins, brandId: brand.gsk, unitId: unit.bottle, taxRateId: tax.t5, rate: 5, cost: 40, price: 70, alert: 18, qty: 90, hsn: '3004' },
        { id: id(), code: 'P-0011', name: 'Hand Sanitizer 500ml', categoryId: cat.surgical, brandId: brand.cipla, unitId: unit.bottle, taxRateId: tax.t18, rate: 18, cost: 60, price: 95, alert: 22, qty: 130, hsn: '3808' },
        { id: id(), code: 'P-0012', name: 'ORS Sachet', categoryId: cat.general, brandId: brand.sun, unitId: unit.pcs, taxRateId: tax.t0, rate: 0, cost: 3, price: 6, alert: 100, qty: 600, hsn: '3004' },
      ];
      await tx.inventoryProduct.createMany({
        data: products.map((p) => ({
          id: p.id, tenantId: TENANT, code: p.code, name: p.name, categoryId: p.categoryId,
          brandId: p.brandId, unitId: p.unitId, taxRateId: p.taxRateId, type: 'STANDARD',
          cost: p.cost, price: p.price, alertQuantity: p.alert, hsnCode: p.hsn,
          isStockTracked: true, isActive: true, galleryImageUrls: [],
        })),
      });

      await tx.inventoryWarehouseProduct.createMany({
        data: products.map((p) => ({
          id: id(), tenantId: TENANT, branchId: BRANCH, productId: p.id,
          quantity: p.qty, avgCost: p.cost,
          rack: `R-${p.code.slice(-2)}`,
        })),
      });
      // A little stock also at the second branch (for transfers context).
      await tx.inventoryWarehouseProduct.createMany({
        data: products.slice(0, 5).map((p) => ({
          id: id(), tenantId: TENANT, branchId: BRANCH2, productId: p.id,
          quantity: Math.round(p.qty / 4), avgCost: p.cost,
        })),
      });

      // Batches: expired, near-expiry, healthy.
      const batchPlan: { p: P; batchNo: string; expiry: Date; qty: number }[] = [
        { p: products[2]!, batchNo: 'AZ-2401', expiry: daysAgo(10), qty: 8 },   // expired
        { p: products[8]!, batchNo: 'IN-2403', expiry: daysAgo(3), qty: 4 },    // expired
        { p: products[7]!, batchNo: 'CS-2407', expiry: daysAhead(18), qty: 20 }, // near-expiry
        { p: products[0]!, batchNo: 'PC-2409', expiry: daysAhead(45), qty: 200 }, // near-ish
        { p: products[1]!, batchNo: 'AM-2412', expiry: daysAhead(300), qty: 150 }, // healthy
        { p: products[3]!, batchNo: 'VC-2411', expiry: daysAhead(120), qty: 180 }, // healthy
      ];
      await tx.inventoryProductBatch.createMany({
        data: batchPlan.map((b) => ({
          id: id(), tenantId: TENANT, branchId: BRANCH, productId: b.p.id,
          batchNo: b.batchNo, expiryDate: b.expiry, quantity: b.qty, cost: b.p.cost,
        })),
      });

      // ── 4. Purchases (items + payments) ─────────────────────────────────────
      let purSeq = 0;
      for (let i = 0; i < 8; i++) {
        const supplier = suppliers[i % suppliers.length]!;
        const date = daysAgo(95 - i * 13);
        const picks = [products[i % products.length]!, products[(i + 3) % products.length]!];
        let subtotal = 0;
        let orderTax = 0;
        const items = picks.map((p) => {
          const quantity = 20 + ((i * 7) % 40);
          const lineSub = round2(quantity * p.cost);
          const lineTax = round2(lineSub * (p.rate / 100));
          subtotal = round2(subtotal + lineSub);
          orderTax = round2(orderTax + lineTax);
          return {
            id: id(), tenantId: TENANT, productId: p.id, productName: p.name,
            productCode: p.code, quantity, cost: p.cost, taxRate: p.rate,
            taxAmount: lineTax, discount: 0, subtotal: lineSub,
          };
        });
        const grandTotal = round2(subtotal + orderTax);
        // Payment pattern: full, partial, none, full…
        const payFactor = [1, 0.5, 0, 1, 0.75, 1, 0, 0.5][i] ?? 1;
        const paid = round2(grandTotal * payFactor);
        const purchaseId = id();
        purSeq++;
        await tx.inventoryPurchase.create({
          data: {
            id: purchaseId, tenantId: TENANT, branchId: BRANCH, supplierId: supplier.id,
            reference: `PO-${String(purSeq).padStart(4, '0')}`, date, status: 'RECEIVED',
            subtotal, orderTax, orderDiscount: 0, shipping: 0, grandTotal, paid,
            paymentStatus: paid >= grandTotal ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING',
            createdBy: STAFF[i % STAFF.length]!,
            items: { create: items.map(({ id: _id, ...rest }) => rest) },
            payments: paid > 0
              ? { create: [{ tenantId: TENANT, amount: paid, method: 'BANK_TRANSFER', date, reference: `PP-${purSeq}` }] }
              : undefined,
          },
        });
      }

      // ── 5. Sales (items + payments) ─────────────────────────────────────────
      let saleSeq = 0;
      for (let i = 0; i < 24; i++) {
        const customer = customers[(i % (customers.length - 1)) + 0]!;
        const date = daysAgo(100 - i * 4);
        const nItems = 1 + (i % 4);
        let subtotal = 0;
        let orderTax = 0;
        const items = Array.from({ length: nItems }, (_, k) => {
          const p = products[(i + k * 2) % products.length]!;
          const quantity = 1 + ((i + k) % 10);
          const lineSub = round2(quantity * p.price);
          const lineTax = round2(lineSub * (p.rate / 100));
          subtotal = round2(subtotal + lineSub);
          orderTax = round2(orderTax + lineTax);
          return {
            tenantId: TENANT, productId: p.id, productName: p.name, productCode: p.code,
            quantity, price: p.price, cost: p.cost, taxRate: p.rate, taxAmount: lineTax,
            discount: 0, subtotal: lineSub,
          };
        });
        const orderDiscount = i % 5 === 0 ? round2(subtotal * 0.05) : 0;
        const grandTotal = round2(subtotal + orderTax - orderDiscount);
        const payFactor = [1, 1, 0.5, 1, 0, 1, 0.75, 1, 1, 0.3][i % 10] ?? 1;
        const paid = round2(grandTotal * payFactor);
        saleSeq++;
        await tx.inventorySale.create({
          data: {
            tenantId: TENANT, branchId: BRANCH, customerId: customer.id,
            billerName: 'Main Counter', reference: `INV-${String(saleSeq).padStart(4, '0')}`,
            date, status: 'COMPLETED', subtotal, orderTax, orderDiscount, shipping: 0,
            grandTotal, paid,
            paymentStatus: paid >= grandTotal ? 'PAID' : paid > 0 ? 'PARTIAL' : 'PENDING',
            createdBy: STAFF[i % STAFF.length]!,
            items: { create: items },
            payments: paid > 0
              ? { create: [{ tenantId: TENANT, amount: paid, method: i % 2 === 0 ? 'CASH' : 'CARD', date, reference: `RC-${saleSeq}` }] }
              : undefined,
          },
        });
      }

      // ── 6. Transfers ────────────────────────────────────────────────────────
      let trSeq = 0;
      for (let i = 0; i < 3; i++) {
        trSeq++;
        const picks = [products[i]!, products[i + 4]!];
        await tx.inventoryTransfer.create({
          data: {
            tenantId: TENANT, fromBranchId: BRANCH, toBranchId: BRANCH2,
            reference: `TR-${String(trSeq).padStart(4, '0')}`, date: daysAgo(30 - i * 7),
            status: i === 0 ? 'COMPLETED' : i === 1 ? 'IN_TRANSIT' : 'PENDING',
            createdBy: STAFF[0]!,
            items: {
              create: picks.map((p) => ({
                tenantId: TENANT, productId: p.id, productName: p.name,
                productCode: p.code, quantity: 10 + i * 5, cost: p.cost,
              })),
            },
          },
        });
      }

      // ── 7. Expenses & incomes ───────────────────────────────────────────────
      const expCatIds = [expCat.rent, expCat.salary, expCat.utilities];
      await tx.inventoryExpense.createMany({
        data: Array.from({ length: 6 }, (_, i) => ({
          id: id(), tenantId: TENANT, branchId: BRANCH, categoryId: expCatIds[i % 3]!,
          reference: `EXP-${String(i + 1).padStart(4, '0')}`,
          amount: [15000, 42000, 8500, 16000, 44000, 9200][i]!, date: daysAgo(100 - i * 15),
          note: ['Shop rent', 'Staff salary', 'Electricity', 'Shop rent', 'Staff salary', 'Water + internet'][i]!,
          createdBy: STAFF[i % STAFF.length]!,
        })),
      });
      const incCatIds = [incCat.consult, incCat.misc];
      await tx.inventoryIncome.createMany({
        data: Array.from({ length: 4 }, (_, i) => ({
          id: id(), tenantId: TENANT, branchId: BRANCH, categoryId: incCatIds[i % 2]!,
          reference: `INC-${String(i + 1).padStart(4, '0')}`,
          amount: [5000, 1200, 6500, 800][i]!, date: daysAgo(90 - i * 20),
          note: ['Consultation fees', 'Scrap sale', 'Consultation fees', 'Misc income'][i]!,
          createdBy: STAFF[0]!,
        })),
      });

      // ── 8. Materials, tools & plants (+ damages / repairs) ──────────────────
      const materials = [
        { id: id(), name: 'Cotton Rolls', category: 'Materials', unit: 'Box', quantity: 40, cost: 120 },
        { id: id(), name: 'Gauze Pads', category: 'Materials', unit: 'Box', quantity: 25, cost: 90 },
        { id: id(), name: 'Disinfectant Solution', category: 'Materials', unit: 'Litre', quantity: 60, cost: 75 },
        { id: id(), name: 'BP Monitor', category: 'Tools & Plants', unit: 'Pcs', quantity: 6, cost: 1800 },
        { id: id(), name: 'Autoclave Machine', category: 'Tools & Plants', unit: 'Pcs', quantity: 2, cost: 45000 },
        { id: id(), name: 'Examination Table', category: 'Material & Plants', unit: 'Pcs', quantity: 4, cost: 12000 },
        { id: id(), name: 'Wheelchair', category: 'Material & Plants', unit: 'Pcs', quantity: 3, cost: 8500 },
      ];
      await tx.inventoryMaterial.createMany({
        data: materials.map((m) => ({
          id: m.id, tenantId: TENANT, branchId: BRANCH, code: `MAT-${m.name.slice(0, 3).toUpperCase()}`,
          name: m.name, category: m.category, unit: m.unit, quantity: m.quantity, cost: m.cost, isActive: true,
        })),
      });
      await tx.inventoryMaterialDamage.createMany({
        data: [
          { id: id(), tenantId: TENANT, materialId: materials[0]!.id, quantity: 3, reason: 'Water damage', date: daysAgo(20), createdBy: STAFF[0]! },
          { id: id(), tenantId: TENANT, materialId: materials[3]!.id, quantity: 1, reason: 'Dropped', date: daysAgo(12), createdBy: STAFF[1]! },
        ],
      });
      await tx.inventoryMaterialRepair.createMany({
        data: [
          { id: id(), tenantId: TENANT, materialId: materials[4]!.id, cost: 3500, status: 'COMPLETED', date: daysAgo(15), note: 'Heating element replaced', createdBy: STAFF[0]! },
          { id: id(), tenantId: TENANT, materialId: materials[6]!.id, cost: 800, status: 'PENDING', date: daysAgo(5), note: 'Wheel alignment', createdBy: STAFF[1]! },
        ],
      });

      // ── 9. IPD admissions + department charges ──────────────────────────────
      const departments = ['Cardiology', 'Orthopedics', 'General Medicine'];
      const admissions = [
        { id: id(), patientName: 'Ramesh Gupta', admissionNo: 'IPD-0001', ward: 'Cardiology', dept: 'Cardiology', admitted: daysAgo(40), status: 'DISCHARGED' },
        { id: id(), patientName: 'Lakshmi Narayan', admissionNo: 'IPD-0002', ward: 'Orthopedics', dept: 'Orthopedics', admitted: daysAgo(22), status: 'DISCHARGED' },
        { id: id(), patientName: 'Fatima Begum', admissionNo: 'IPD-0003', ward: 'General Ward', dept: 'General Medicine', admitted: daysAgo(6), status: 'ADMITTED' },
      ];
      await tx.inventoryIpdAdmission.createMany({
        data: admissions.map((a, i) => ({
          id: a.id, tenantId: TENANT, branchId: BRANCH,
          patientId: `patient-ipd-${i + 1}`, patientName: a.patientName,
          admissionNo: a.admissionNo, ward: a.ward, bed: `B-${i + 1}`,
          referringDoctor: ['Dr. Mehta', 'Dr. Rao', 'Dr. Singh'][i]!,
          admittedAt: a.admitted, dischargedAt: a.status === 'DISCHARGED' ? daysAhead(0) : null,
          status: a.status,
        })),
      });
      const charges: { admissionId: string; description: string; category: string; amount: number; date: Date }[] = [];
      admissions.forEach((a) => {
        charges.push(
          { admissionId: a.id, description: 'Room charges', category: a.dept, amount: 4500, date: a.admitted },
          { admissionId: a.id, description: 'Procedure', category: a.dept, amount: 7800, date: a.admitted },
          { admissionId: a.id, description: 'Consumables', category: 'Pharmacy', amount: 2300, date: a.admitted },
        );
      });
      await tx.inventoryIpdCharge.createMany({
        data: charges.map((c) => ({
          id: id(), tenantId: TENANT, admissionId: c.admissionId, description: c.description,
          category: c.category, amount: c.amount, date: c.date, createdBy: STAFF[0]!,
        })),
      });
      void departments;

      // ── 10. POS register + sessions ─────────────────────────────────────────
      const registerId = id();
      await tx.inventoryPosRegister.create({
        data: { id: registerId, tenantId: TENANT, branchId: BRANCH, name: 'Front Desk Register', isActive: true },
      });
      await tx.inventoryPosRegisterSession.createMany({
        data: [
          { id: id(), tenantId: TENANT, branchId: BRANCH, registerId, status: 'CLOSED', openingCash: 2000, closingCash: 18500, expectedCash: 18500, openedBy: STAFF[0]!, closedBy: STAFF[0]!, openedAt: daysAgo(2), closedAt: daysAgo(2) },
          { id: id(), tenantId: TENANT, branchId: BRANCH, registerId, status: 'CLOSED', openingCash: 2000, closingCash: 14200, expectedCash: 14000, openedBy: STAFF[1]!, closedBy: STAFF[1]!, openedAt: daysAgo(1), closedAt: daysAgo(1) },
          { id: id(), tenantId: TENANT, branchId: BRANCH, registerId, status: 'OPEN', openingCash: 2000, openedBy: STAFF[0]!, openedAt: now },
        ],
      });

      // ── 11. Supplier payments + customer deposits ───────────────────────────
      await tx.inventorySupplierPayment.createMany({
        data: [
          { id: id(), tenantId: TENANT, supplierId: suppliers[0]!.id, amount: 5000, method: 'BANK_TRANSFER', date: daysAgo(18), reference: 'SP-0001' },
          { id: id(), tenantId: TENANT, supplierId: suppliers[2]!.id, amount: 8000, method: 'CASH', date: daysAgo(9), reference: 'SP-0002' },
          { id: id(), tenantId: TENANT, supplierId: suppliers[4]!.id, amount: 2500, method: 'CHEQUE', date: daysAgo(4), reference: 'SP-0003' },
        ],
      });
      await tx.inventoryCustomerDeposit.createMany({
        data: [
          { id: id(), tenantId: TENANT, customerId: customers[3]!.id, type: 'DEPOSIT', amount: 10000, date: daysAgo(25), note: 'Advance' },
          { id: id(), tenantId: TENANT, customerId: customers[6]!.id, type: 'DEPOSIT', amount: 5000, date: daysAgo(14), note: 'Advance' },
        ],
      });

      console.log('Seed complete:');
      console.log(`  categories=6 brands=3 units=3 taxRates=4`);
      console.log(`  suppliers=${suppliers.length} customers=${customers.length} products=${products.length}`);
      console.log(`  purchases=8 sales=24 transfers=3 materials=${materials.length}`);
      console.log(`  ipdAdmissions=${admissions.length} ipdCharges=${charges.length} posSessions=3`);
    },
    { timeout: 180_000, maxWait: 30_000 },
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
