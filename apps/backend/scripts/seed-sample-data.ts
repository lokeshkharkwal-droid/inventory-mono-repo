/**
 * Seed sample data for every inventory feature into ONE branch, via the real
 * module services (stock movements, numbering, totals all run as in the app).
 *
 *   SEED_TENANT_ID=… SEED_BRANCH_ID=… SEED_ACTOR_ID=… SEED_OTHER_BRANCH_ID=… \
 *   SEED_BEARER_TOKEN=… SEED_MANIFEST=/path/manifest.json \
 *   npx ts-node --transpile-only -r tsconfig-paths/register scripts/seed-sample-data.ts
 *
 * SEED_BEARER_TOKEN is the user's kalnostics access token — only used for the
 * branch-ownership checks kalnostics performs on transfers/requisitions.
 * Every created row id is written to SEED_MANIFEST for later cleanup.
 * Transactional records carry a "SAMPLE-" reference and/or "[SAMPLE]" note.
 */
import { NestFactory } from '@nestjs/core';
import { writeFileSync, existsSync } from 'node:fs';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { requestTokenContext } from '../src/integration/context/request-token.context';
import { BloodBankService } from '../src/modules/bloodbank/bloodbank.service';
import { CalendarService } from '../src/modules/calendar/calendar.service';
import { CurrencyService } from '../src/modules/currency/currency.service';
import { BillerService } from '../src/modules/biller/biller.service';
import { CustomerService } from '../src/modules/customer/customer.service';
import { ExpenseCategoryService } from '../src/modules/expense-category/expense-category.service';
import { BrandService } from '../src/modules/brand/brand.service';
import { CategoryService } from '../src/modules/category/category.service';
import { GiftCardService } from '../src/modules/gift-card/gift-card.service';
import { CustomerGroupService } from '../src/modules/customer-group/customer-group.service';
import { IncomeService } from '../src/modules/income/income.service';
import { EmailTemplateService } from '../src/modules/email-template/email-template.service';
import { ManufacturerService } from '../src/modules/manufacturer/manufacturer.service';
import { NotificationService } from '../src/modules/notification/notification.service';
import { PosService } from '../src/modules/pos/pos.service';
import { ExpenseService } from '../src/modules/expense/expense.service';
import { IncomeCategoryService } from '../src/modules/income-category/income-category.service';
import { IpdService } from '../src/modules/ipd/ipd.service';
import { MaterialService } from '../src/modules/material/material.service';
import { ProductService } from '../src/modules/product/product.service';
import { PromotionService } from '../src/modules/promotion/promotion.service';
import { PurchaseService } from '../src/modules/purchase/purchase.service';
import { ProductTemplateService } from '../src/modules/product-template/product-template.service';
import { ProductStockService } from '../src/modules/product/product-stock.service';
import { ProformaService } from '../src/modules/proforma/proforma.service';
import { DeliveryService } from '../src/modules/sale/delivery.service';
import { PurchaseReturnService } from '../src/modules/purchase/purchase-return.service';
import { SaleService } from '../src/modules/sale/sale.service';
import { SettingsService } from '../src/modules/settings/settings.service';
import { QuoteService } from '../src/modules/quote/quote.service';
import { RequisitionService } from '../src/modules/requisition/requisition.service';
import { SaleReturnService } from '../src/modules/sale/sale-return.service';
import { SupplierService } from '../src/modules/supplier/supplier.service';
import { TransferService } from '../src/modules/transfer/transfer.service';
import { SubCategoryService } from '../src/modules/sub-category/sub-category.service';
import { VariantService } from '../src/modules/variant/variant.service';
import { TaxRateService } from '../src/modules/tax-rate/tax-rate.service';
import { UnitService } from '../src/modules/unit/unit.service';

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is required`);
  return v;
}

const T = env('SEED_TENANT_ID');
const BR = env('SEED_BRANCH_ID');
const ACTOR = env('SEED_ACTOR_ID');
const OTHER_BR = env('SEED_OTHER_BRANCH_ID');
const TOKEN = env('SEED_BEARER_TOKEN');
const MANIFEST = env('SEED_MANIFEST');

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString();
const daysAhead = (n: number) => daysAgo(-n);
const NOTE = '[SAMPLE] seeded demo data';

const manifest: Record<string, string[]> = {};
const failures: string[] = [];
function track(kind: string, row: unknown): void {
  if (!kind) return;
  const id = (row as { id?: string } | null)?.id;
  if (id) (manifest[kind] ??= []).push(id);
}
async function step<R>(kind: string, label: string, fn: () => Promise<R>) {
  try {
    const r = await fn();
    track(kind, r);
    return r;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    failures.push(`${kind} ${label}: ${msg}`);
    console.error(`  ✗ ${kind} ${label}: ${msg}`);
    return undefined;
  }
}
const idOf = (r: unknown) => (r as { id: string }).id;

async function main() {
  if (existsSync(MANIFEST)) {
    throw new Error(`${MANIFEST} exists — sample data already seeded.`);
  }
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const g = <S>(c: new (...a: never[]) => S) => app.get(c);
  const prisma = g(PrismaService);

  await requestTokenContext.run({ bearerToken: TOKEN }, () =>
    prisma.runWithTenant(T, async () => {
      // ── Settings ──
      await g(SettingsService).update(T, { defaultCurrencyCode: 'INR' });

      // ── Master data ──
      console.log('Master data…');
      for (const c of [
        { code: 'INR', name: 'Indian Rupee', symbol: '₹', exchangeRate: 1 },
        { code: 'USD', name: 'US Dollar', symbol: '$', exchangeRate: 0.012 },
      ])
        await step('currency', c.code, () => g(CurrencyService).create(T, c));

      const taxes: Record<string, string> = {};
      for (const t of [
        { name: 'GST 0%', code: 'GST0', rate: 0 },
        { name: 'GST 5%', code: 'GST5', rate: 5 },
        { name: 'GST 12%', code: 'GST12', rate: 12 },
        { name: 'GST 18%', code: 'GST18', rate: 18 },
      ]) {
        const r = await step('taxRate', t.code, () =>
          g(TaxRateService).create(T, { ...t, type: 'percentage' }),
        );
        if (r) taxes[t.code] = idOf(r);
      }

      const units: Record<string, string> = {};
      for (const u of [
        { name: 'Piece', code: 'PCS' },
        { name: 'Strip', code: 'STRIP' },
        { name: 'Bottle', code: 'BTL' },
        { name: 'Box', code: 'BOX' },
        { name: 'Kit', code: 'KIT' },
      ]) {
        const r = await step('unit', u.code, () => g(UnitService).create(T, u));
        if (r) units[u.code] = idOf(r);
      }
      if (units.STRIP)
        await step('unit', 'Box of 10 strips', () =>
          g(UnitService).create(T, {
            name: 'Box (10 strips)',
            code: 'BOX10',
            baseUnitId: units.STRIP,
            operator: '*',
            operationValue: 10,
          }),
        );

      const cats: Record<string, string> = {};
      for (const [i, c] of [
        ['MED', 'Medicines'],
        ['LAB', 'Lab Consumables'],
        ['SURG', 'Surgical Supplies'],
        ['OTC', 'OTC & Wellness'],
      ].entries()) {
        const r = await step('category', c[0], () =>
          g(CategoryService).create(T, {
            code: c[0],
            name: c[1],
            sortOrder: i,
          }),
        );
        if (r) cats[c[0]] = idOf(r);
      }
      const subs: Record<string, string> = {};
      for (const [cat, code, name] of [
        ['MED', 'MED-ABX', 'Antibiotics'],
        ['MED', 'MED-ANL', 'Analgesics'],
        ['MED', 'MED-DIA', 'Antidiabetics'],
        ['LAB', 'LAB-REA', 'Reagents & Kits'],
        ['LAB', 'LAB-COL', 'Sample Collection'],
        ['SURG', 'SURG-PPE', 'PPE'],
        ['OTC', 'OTC-VIT', 'Vitamins & Supplements'],
      ]) {
        if (!cats[cat]) continue;
        const r = await step('subCategory', code, () =>
          g(SubCategoryService).create(T, {
            categoryId: cats[cat],
            code,
            name,
          }),
        );
        if (r) subs[code] = idOf(r);
      }

      const brands: Record<string, string> = {};
      for (const [code, name] of [
        ['CIPLA', 'Cipla'],
        ['SUNP', 'Sun Pharma'],
        ['GSK', 'GSK'],
        ['BD', 'BD (Becton Dickinson)'],
        ['ROCHE', 'Roche Diagnostics'],
      ]) {
        const r = await step('brand', code, () =>
          g(BrandService).create(T, { code, name }),
        );
        if (r) brands[code] = idOf(r);
      }
      for (const m of [
        { code: 'MFR-CIP', name: 'Cipla Ltd', companyName: 'Cipla Ltd', phone: '+91 22 2482 6000', website: 'https://www.cipla.com', address: 'Mumbai, MH' },
        { code: 'MFR-SUN', name: 'Sun Pharmaceutical Industries', companyName: 'Sun Pharma', phone: '+91 22 4324 4324', address: 'Mumbai, MH' },
        { code: 'MFR-ROC', name: 'Roche Diagnostics India', companyName: 'Roche', address: 'Mumbai, MH' },
      ])
        await step('manufacturer', m.code, () =>
          g(ManufacturerService).create(T, { ...m, note: NOTE }),
        );
      for (const v of [
        { name: 'Pack Size', values: ['10s', '15s', '30s'] },
        { name: 'Size', values: ['S', 'M', 'L', 'XL'] },
      ])
        await step('variant', v.name, () => g(VariantService).create(T, v));

      for (const cg of [
        { code: 'GEN', name: 'General', percentage: 0 },
        { code: 'SNR', name: 'Senior Citizen', percentage: 10 },
        { code: 'CORP', name: 'Corporate Panel', percentage: 15 },
      ])
        await step('customerGroup', cg.code, () =>
          g(CustomerGroupService).create(T, cg),
        );

      await step('biller', 'main', () =>
        g(BillerService).create(T, {
          code: 'BILL-NB',
          name: 'New Branch Pharmacy Counter',
          companyName: 'New Branch Diagnostics',
          phone: '+91 98100 00001',
          email: 'billing.newbranch@example.com',
          address: '12 MG Road, Bengaluru, KA 560001',
          taxNumber: '29ABCDE1234F1Z5',
        }),
      );

      const suppliers: string[] = [];
      for (const s of [
        { code: 'SUP-001', name: 'MedLine Distributors', companyName: 'MedLine Distributors Pvt Ltd', phone: '+91 98450 11111', email: 'orders@medline.example.com', address: 'Peenya, Bengaluru', taxNumber: '29AAACM1111A1Z1', openingBalance: 0 },
        { code: 'SUP-002', name: 'Apex Pharma Wholesale', companyName: 'Apex Pharma', phone: '+91 98450 22222', email: 'sales@apexpharma.example.com', address: 'Chickpet, Bengaluru', taxNumber: '29AAACA2222B1Z2', openingBalance: 5000 },
        { code: 'SUP-003', name: 'LabCare Scientific', companyName: 'LabCare Scientific Co', phone: '+91 98450 33333', email: 'support@labcare.example.com', address: 'Whitefield, Bengaluru', taxNumber: '29AAACL3333C1Z3', openingBalance: 0 },
      ]) {
        const r = await step('supplier', s.code, () =>
          g(SupplierService).create(T, s),
        );
        if (r) suppliers.push(idOf(r));
      }

      const customers: string[] = [];
      for (const c of [
        { code: 'CUS-WALKIN', name: 'Walk-in Customer' },
        { code: 'CUS-001', name: 'Ramesh Kumar', phone: '+91 99000 10001', email: 'ramesh.k@example.com', address: 'Indiranagar, Bengaluru', creditLimit: 5000 },
        { code: 'CUS-002', name: 'Priya Sharma', phone: '+91 99000 10002', email: 'priya.s@example.com', address: 'Koramangala, Bengaluru', creditLimit: 3000 },
        { code: 'CUS-003', name: 'Anita Desai', phone: '+91 99000 10003', address: 'Jayanagar, Bengaluru' },
        { code: 'CUS-004', name: 'Sunrise Clinic', companyName: 'Sunrise Clinic LLP', phone: '+91 80 4000 1004', email: 'accounts@sunrise.example.com', address: 'HSR Layout, Bengaluru', taxNumber: '29AAFCS4444D1Z4', creditLimit: 25000 },
      ]) {
        const r = await step('customer', c.code, () =>
          g(CustomerService).create(T, c),
        );
        if (r) customers.push(idOf(r));
      }

      const expCats: string[] = [];
      for (const [code, name] of [
        ['RENT', 'Rent'],
        ['UTIL', 'Electricity & Utilities'],
        ['SAL', 'Staff Salaries'],
        ['MAINT', 'Equipment Maintenance'],
      ]) {
        const r = await step('expenseCategory', code, () =>
          g(ExpenseCategoryService).create(T, { code, name }),
        );
        if (r) expCats.push(idOf(r));
      }
      const incCats: string[] = [];
      for (const [code, name] of [
        ['CONSULT', 'Consultation Fees'],
        ['HOMECOL', 'Home Collection Charges'],
        ['MISC', 'Miscellaneous Income'],
      ]) {
        const r = await step('incomeCategory', code, () =>
          g(IncomeCategoryService).create(T, { code, name }),
        );
        if (r) incCats.push(idOf(r));
      }

      // ── Products ──
      console.log('Products…');
      type P = Parameters<ProductService['create']>[1];
      const productDefs: Array<P & { _sub?: string; _brand?: string; _tax: string; _unit: string; _cat: string }> = [
        { code: 'P-AMOX500', name: 'Amoxicillin 500mg Capsule', genericName: 'Amoxicillin', strength: '500mg', hsnCode: '30041010', cost: 65, price: 98, alertQuantity: 20, _cat: 'MED', _sub: 'MED-ABX', _brand: 'CIPLA', _tax: 'GST12', _unit: 'STRIP', categoryId: '' },
        { code: 'P-AZI500', name: 'Azithromycin 500mg Tablet', genericName: 'Azithromycin', strength: '500mg', hsnCode: '30042019', cost: 72, price: 115, alertQuantity: 15, _cat: 'MED', _sub: 'MED-ABX', _brand: 'CIPLA', _tax: 'GST12', _unit: 'STRIP', categoryId: '' },
        { code: 'P-PCM650', name: 'Paracetamol 650mg Tablet', genericName: 'Paracetamol', strength: '650mg', hsnCode: '30049099', cost: 18, price: 32, alertQuantity: 50, _cat: 'MED', _sub: 'MED-ANL', _brand: 'GSK', _tax: 'GST12', _unit: 'STRIP', categoryId: '' },
        { code: 'P-IBU400', name: 'Ibuprofen 400mg Tablet', genericName: 'Ibuprofen', strength: '400mg', hsnCode: '30049099', cost: 22, price: 38, alertQuantity: 30, _cat: 'MED', _sub: 'MED-ANL', _brand: 'SUNP', _tax: 'GST12', _unit: 'STRIP', categoryId: '' },
        { code: 'P-MET500', name: 'Metformin 500mg Tablet', genericName: 'Metformin', strength: '500mg', hsnCode: '30049099', cost: 25, price: 42, alertQuantity: 40, _cat: 'MED', _sub: 'MED-DIA', _brand: 'SUNP', _tax: 'GST12', _unit: 'STRIP', categoryId: '' },
        { code: 'P-GLU-STRIP', name: 'Glucometer Test Strips (50)', hsnCode: '38220090', cost: 520, price: 799, alertQuantity: 10, _cat: 'LAB', _sub: 'LAB-REA', _brand: 'ROCHE', _tax: 'GST12', _unit: 'BOX', categoryId: '' },
        { code: 'P-CBC-REA', name: 'CBC Reagent Kit', hsnCode: '38220090', cost: 3200, price: 4500, alertQuantity: 3, _cat: 'LAB', _sub: 'LAB-REA', _brand: 'ROCHE', _tax: 'GST12', _unit: 'KIT', categoryId: '' },
        { code: 'P-EDTA', name: 'EDTA Vacutainer Tube 3ml (100)', hsnCode: '90183100', cost: 480, price: 690, alertQuantity: 5, _cat: 'LAB', _sub: 'LAB-COL', _brand: 'BD', _tax: 'GST12', _unit: 'BOX', categoryId: '' },
        { code: 'P-SYR5', name: 'Disposable Syringe 5ml (100)', hsnCode: '90183100', cost: 350, price: 520, alertQuantity: 5, _cat: 'SURG', _brand: 'BD', _tax: 'GST12', _unit: 'BOX', categoryId: '' },
        { code: 'P-GLOVE', name: 'Nitrile Examination Gloves (100)', hsnCode: '40151900', cost: 390, price: 599, alertQuantity: 8, _cat: 'SURG', _sub: 'SURG-PPE', _tax: 'GST12', _unit: 'BOX', categoryId: '', variants: [{ name: 'M' }, { name: 'L' }] },
        { code: 'P-MASK', name: 'N95 Face Mask', hsnCode: '63079090', cost: 28, price: 60, alertQuantity: 50, _cat: 'SURG', _sub: 'SURG-PPE', _tax: 'GST5', _unit: 'PCS', categoryId: '' },
        { code: 'P-VITD3', name: 'Vitamin D3 60000 IU Capsule', genericName: 'Cholecalciferol', strength: '60000 IU', hsnCode: '30045020', cost: 95, price: 145, alertQuantity: 10, _cat: 'OTC', _sub: 'OTC-VIT', _brand: 'SUNP', _tax: 'GST12', _unit: 'STRIP', categoryId: '' },
        { code: 'P-ORS', name: 'ORS Electrolyte Powder', hsnCode: '30049099', cost: 14, price: 22, alertQuantity: 30, _cat: 'OTC', _tax: 'GST5', _unit: 'PCS', categoryId: '' },
        { code: 'P-BPMON', name: 'Digital BP Monitor', hsnCode: '90189011', cost: 1450, price: 2199, alertQuantity: 2, _cat: 'SURG', _tax: 'GST18', _unit: 'PCS', categoryId: '', isSerialized: true },
        { code: 'P-HOMECOL', name: 'Home Sample Collection Service', hsnCode: '999316', cost: 0, price: 150, _cat: 'LAB', _tax: 'GST18', _unit: 'PCS', categoryId: '', type: 'SERVICE', isStockTracked: false },
      ];
      const prod: Record<string, { id: string; cost: number; price: number; tax: number }> = {};
      const taxPct: Record<string, number> = { GST0: 0, GST5: 5, GST12: 12, GST18: 18 };
      for (const d of productDefs) {
        const { _sub, _brand, _tax, _unit, _cat, ...dto } = d;
        if (!cats[_cat]) continue;
        const r = await step('product', d.code, () =>
          g(ProductService).create(T, {
            ...dto,
            categoryId: cats[_cat],
            subCategoryId: _sub ? subs[_sub] : undefined,
            brandId: _brand ? brands[_brand] : undefined,
            taxRateId: taxes[_tax],
            unitId: units[_unit],
            description: NOTE,
          }),
        );
        if (r)
          prod[d.code] = { id: idOf(r), cost: d.cost ?? 0, price: d.price ?? 0, tax: taxPct[_tax] };
      }
      const P = (code: string) => prod[code];
      const has = (...codes: string[]) => codes.every((c) => prod[c]);

      // NOTE: SaleService deducts stock even for isStockTracked=false (SERVICE)
      // products, so P-HOMECOL is not sold here.
      // ── Opening stock via adjustments (+ rack locations) ──
      console.log('Stock…');
      const opening: Record<string, number> = {
        'P-AMOX500': 40, 'P-AZI500': 30, 'P-PCM650': 120, 'P-IBU400': 60,
        'P-MET500': 80, 'P-GLU-STRIP': 12, 'P-CBC-REA': 4, 'P-EDTA': 10,
        'P-SYR5': 8, 'P-GLOVE': 15, 'P-MASK': 200, 'P-VITD3': 25,
        'P-ORS': 100, 'P-BPMON': 5,
      };
      for (const [code, qty] of Object.entries(opening)) {
        if (!P(code)) continue;
        await step('stockAdjustment', code, () =>
          g(ProductStockService).recordAdjustment(T, BR, P(code).id, {
            quantity: qty, cost: P(code).cost, reason: 'Opening stock', note: NOTE,
          }, ACTOR),
        );
      }
      if (P('P-MASK'))
        await step('stockAdjustment', 'damaged masks', () =>
          g(ProductStockService).recordAdjustment(T, BR, P('P-MASK').id, {
            quantity: -10, reason: 'Damaged', note: `${NOTE} — water damage`,
          }, ACTOR),
        );
      const racks: Record<string, string> = { 'P-AMOX500': 'A1', 'P-AZI500': 'A1', 'P-PCM650': 'A2', 'P-IBU400': 'A2', 'P-MET500': 'A3', 'P-CBC-REA': 'COLD-1', 'P-EDTA': 'LAB-2' };
      for (const [code, rack] of Object.entries(racks))
        if (P(code))
          await step('rack', code, () => g(ProductService).setRack(P(code).id, T, BR, rack));
      if (P('P-BPMON'))
        await step('serials', 'P-BPMON', () =>
          g(ProductService).addSerials(P('P-BPMON').id, T, BR, [
            'BPM-24A-0001', 'BPM-24A-0002', 'BPM-24A-0003', 'BPM-24A-0004', 'BPM-24A-0005',
          ]),
        );

      // ── Purchases (+ payments, expenses, return) ──
      console.log('Purchases…');
      const pItem = (code: string, qty: number, batch?: string, expiryDays?: number) => ({
        productId: P(code).id, quantity: qty, cost: P(code).cost, taxRate: P(code).tax,
        batchNo: batch, expiryDate: expiryDays ? daysAhead(expiryDays) : undefined,
      });
      const purchases: Array<{ id: string } | undefined> = [];
      if (suppliers[0] && has('P-AMOX500', 'P-PCM650', 'P-MET500'))
        purchases.push(await step('purchase', 'PO1', () =>
          g(PurchaseService).create(T, BR, {
            supplierId: suppliers[0], reference: 'SAMPLE-PO-0001', date: daysAgo(28), status: 'RECEIVED', shipping: 150, note: NOTE,
            items: [pItem('P-AMOX500', 50, 'AMX24B01', 540), pItem('P-PCM650', 100, 'PCM24C11', 720), pItem('P-MET500', 60, 'MET24A07', 25)],
          }, ACTOR)));
      if (suppliers[2] && has('P-CBC-REA', 'P-EDTA', 'P-GLU-STRIP'))
        purchases.push(await step('purchase', 'PO2', () =>
          g(PurchaseService).create(T, BR, {
            supplierId: suppliers[2], reference: 'SAMPLE-PO-0002', date: daysAgo(20), status: 'RECEIVED', orderDiscount: 200, note: NOTE,
            items: [pItem('P-CBC-REA', 3, 'CBC-R-2411', 180), pItem('P-EDTA', 10, 'EDTA-2409', 900), pItem('P-GLU-STRIP', 10, 'GS-2410', 365)],
          }, ACTOR)));
      if (suppliers[1] && has('P-VITD3', 'P-AZI500', 'P-IBU400'))
        purchases.push(await step('purchase', 'PO3', () =>
          g(PurchaseService).create(T, BR, {
            supplierId: suppliers[1], reference: 'SAMPLE-PO-0003', date: daysAgo(12), status: 'RECEIVED', note: NOTE,
            items: [pItem('P-VITD3', 20, 'VD3-2412', 600), pItem('P-AZI500', 30, 'AZI24D02', 500), pItem('P-IBU400', 40, 'IBU24E05', 20)],
          }, ACTOR)));
      if (suppliers[0] && has('P-GLOVE', 'P-SYR5'))
        purchases.push(await step('purchase', 'PO4 (ordered)', () =>
          g(PurchaseService).create(T, BR, {
            supplierId: suppliers[0], reference: 'SAMPLE-PO-0004', date: daysAgo(2), status: 'ORDERED', note: `${NOTE} — awaiting delivery`,
            items: [pItem('P-GLOVE', 20), pItem('P-SYR5', 10)],
          }, ACTOR)));
      const po = purchases.filter(Boolean) as Array<{ id: string; grandTotal?: unknown }>;
      if (po[0]) {
        const total = Number((po[0] as { grandTotal?: unknown }).grandTotal ?? 0);
        await step('purchasePayment', 'PO1 full', () =>
          g(PurchaseService).addPayment(po[0].id, T, { amount: total || 9000, method: 'BANK_TRANSFER', reference: 'SAMPLE-NEFT-1001', date: daysAgo(26), note: NOTE }, ACTOR));
        await step('purchaseExpense', 'PO1 freight', () =>
          g(PurchaseService).addExpense(po[0].id, T, { amount: 150, category: 'Freight', reference: 'SAMPLE-FRT-01', date: daysAgo(28), note: NOTE }, ACTOR));
      }
      if (po[1])
        await step('purchasePayment', 'PO2 partial', () =>
          g(PurchaseService).addPayment(po[1].id, T, { amount: 10000, method: 'UPI', reference: 'SAMPLE-UPI-2001', date: daysAgo(18), note: `${NOTE} — partial` }, ACTOR));
      if (po[2] && P('P-IBU400'))
        await step('purchaseReturn', 'PO3 ibuprofen', () =>
          g(PurchaseReturnService).create(T, {
            purchaseId: po[2].id, reference: 'SAMPLE-PR-0001', date: daysAgo(10), note: `${NOTE} — damaged strips`,
            items: [{ productId: P('P-IBU400').id, quantity: 5, cost: P('P-IBU400').cost }],
          }, ACTOR));
      if (suppliers[1])
        await step('supplierPayment', 'opening balance', () =>
          g(SupplierService).addPayment(suppliers[1], T, { amount: 5000, method: 'CHEQUE', reference: 'SAMPLE-CHQ-3001', date: daysAgo(15), note: NOTE }, ACTOR));

      // ── Sales (+ payments, delivery, return) ──
      console.log('Sales…');
      const sItem = (code: string, qty: number, discount = 0) => ({
        productId: P(code).id, quantity: qty, price: P(code).price, taxRate: P(code).tax, discount,
      });
      const sales: Record<string, { id: string; grandTotal?: unknown }> = {};
      const saleDefs = [
        { c: 0, d: 25, ref: 'SAMPLE-SALE-0001', items: [['P-PCM650', 3], ['P-ORS', 5]], pay: 'full', method: 'CASH' },
        { c: 1, d: 21, ref: 'SAMPLE-SALE-0002', items: [['P-AMOX500', 2], ['P-PCM650', 2], ['P-VITD3', 1]], pay: 'full', method: 'UPI' },
        { c: 2, d: 17, ref: 'SAMPLE-SALE-0003', items: [['P-MET500', 6], ['P-GLU-STRIP', 1]], pay: 'full', method: 'CARD' },
        { c: 4, d: 14, ref: 'SAMPLE-SALE-0004', items: [['P-EDTA', 2], ['P-SYR5', 2], ['P-GLOVE', 3], ['P-MASK', 50]], pay: 'partial', method: 'BANK_TRANSFER' },
        { c: 3, d: 9, ref: 'SAMPLE-SALE-0005', items: [['P-AZI500', 1], ['P-IBU400', 2]], pay: 'full', method: 'UPI' },
        { c: 1, d: 6, ref: 'SAMPLE-SALE-0006', items: [['P-BPMON', 1], ['P-GLU-STRIP', 1]], pay: 'full', method: 'CARD' },
        { c: 0, d: 3, ref: 'SAMPLE-SALE-0007', items: [['P-PCM650', 4], ['P-MASK', 10], ['P-ORS', 4]], pay: 'full', method: 'CASH' },
        { c: 4, d: 1, ref: 'SAMPLE-SALE-0008', items: [['P-CBC-REA', 1], ['P-EDTA', 1]], pay: 'none', method: '' },
      ] as const;
      for (const s of saleDefs) {
        if (!customers[s.c] || !has(...s.items.map((i) => i[0]))) continue;
        const r = await step('sale', s.ref, () =>
          g(SaleService).create(T, BR, {
            customerId: customers[s.c], billerName: 'New Branch Pharmacy Counter', reference: s.ref,
            date: daysAgo(s.d), status: 'COMPLETED', note: NOTE,
            items: s.items.map(([code, q]) => sItem(code, q)),
          }, ACTOR));
        if (!r) continue;
        sales[s.ref] = r as never;
        const total = Number((r as { grandTotal?: unknown }).grandTotal ?? 0);
        if (s.pay !== 'none' && total > 0)
          await step('salePayment', s.ref, () =>
            g(SaleService).addPayment(idOf(r), T, {
              amount: s.pay === 'full' ? total : Math.round(total / 2), method: s.method,
              reference: `${s.ref}-PAY`, date: daysAgo(s.d), note: NOTE,
            }, ACTOR));
      }
      if (sales['SAMPLE-SALE-0004'])
        await step('delivery', 'SALE-0004', () =>
          g(DeliveryService).create(T, BR, {
            saleId: sales['SAMPLE-SALE-0004'].id, reference: 'SAMPLE-DLV-0001', status: 'DELIVERED', trackingNo: 'DLV-BLR-88213',
            deliveredTo: 'Sunrise Clinic front desk', address: 'HSR Layout, Bengaluru', date: daysAgo(13), note: NOTE,
          }, ACTOR));
      if (sales['SAMPLE-SALE-0008'])
        await step('delivery', 'SALE-0008', () =>
          g(DeliveryService).create(T, BR, {
            saleId: sales['SAMPLE-SALE-0008'].id, reference: 'SAMPLE-DLV-0002', status: 'DISPATCHED', trackingNo: 'DLV-BLR-88290',
            deliveredTo: 'Sunrise Clinic lab', address: 'HSR Layout, Bengaluru', date: daysAgo(1), note: NOTE,
          }, ACTOR));
      if (sales['SAMPLE-SALE-0002'] && P('P-VITD3'))
        await step('saleReturn', 'SALE-0002', () =>
          g(SaleReturnService).create(T, {
            saleId: sales['SAMPLE-SALE-0002'].id, reference: 'SAMPLE-SR-0001', date: daysAgo(19), refundAmount: Math.round(P('P-VITD3').price * 1.12),
            note: `${NOTE} — customer returned unopened`, items: [{ productId: P('P-VITD3').id, quantity: 1, price: P('P-VITD3').price }],
          }, ACTOR));
      if (customers[4])
        await step('customerDeposit', 'Sunrise advance', () =>
          g(CustomerService).addDeposit(customers[4], T, { amount: 10000, type: 'DEPOSIT', note: `${NOTE} — advance`, date: daysAgo(7) }, ACTOR));

      // ── Quotes & proformas ──
      console.log('Quotes / proformas…');
      const qItem = (code: string, qty: number) => ({ productId: P(code).id, quantity: qty, unitPrice: P(code).price, taxRate: P(code).tax });
      if (customers[4] && has('P-GLOVE', 'P-SYR5', 'P-MASK')) {
        const q = await step('quote', 'sale quote approved', () =>
          g(QuoteService).create(T, BR, { type: 'SALE', customerId: customers[4], reference: 'SAMPLE-QT-0001', date: daysAgo(5), note: NOTE,
            items: [qItem('P-GLOVE', 5), qItem('P-SYR5', 3), qItem('P-MASK', 100)] }, ACTOR));
        if (q) await step('', 'approve quote', () => g(QuoteService).updateStatus(idOf(q), T, { status: 'APPROVED' }));
      }
      if (customers[1] && has('P-BPMON', 'P-GLU-STRIP')) {
        const q = await step('quote', 'sale quote sent', () =>
          g(QuoteService).create(T, BR, { type: 'SALE', customerId: customers[1], reference: 'SAMPLE-QT-0002', date: daysAgo(2), note: NOTE,
            items: [qItem('P-BPMON', 1), qItem('P-GLU-STRIP', 2)] }, ACTOR));
        if (q) await step('', 'send quote', () => g(QuoteService).updateStatus(idOf(q), T, { status: 'SENT' }));
      }
      if (suppliers[2] && has('P-CBC-REA', 'P-EDTA'))
        await step('quote', 'purchase quote draft', () =>
          g(QuoteService).create(T, BR, { type: 'PURCHASE', supplierId: suppliers[2], reference: 'SAMPLE-QT-0003', date: daysAgo(1), note: NOTE,
            items: [{ ...qItem('P-CBC-REA', 2), unitPrice: P('P-CBC-REA').cost }, { ...qItem('P-EDTA', 5), unitPrice: P('P-EDTA').cost }] }, ACTOR));
      if (customers[4] && has('P-EDTA')) {
        const pf = await step('proforma', 'PF1', () =>
          g(ProformaService).create(T, BR, {
            customerId: customers[4], reference: 'SAMPLE-PF-0001', date: daysAgo(4), note: NOTE,
            labTests: [{ name: 'Complete Blood Count (CBC)', price: 350, type: 'LAB_TEST' }, { name: 'HbA1c', price: 450, type: 'LAB_TEST' }, { name: 'Chest X-Ray PA View', price: 600, type: 'RADIOLOGY' }],
            items: [qItem('P-EDTA', 1)],
          }, ACTOR));
        if (pf) await step('', 'send proforma', () => g(ProformaService).updateStatus(idOf(pf), T, { status: 'SENT' }));
      }
      if (customers[2] && has('P-MET500'))
        await step('proforma', 'PF2', () =>
          g(ProformaService).create(T, BR, { customerId: customers[2], reference: 'SAMPLE-PF-0002', date: daysAgo(1), note: NOTE,
            labTests: [{ name: 'Lipid Profile', price: 550, type: 'LAB_TEST' }], items: [qItem('P-MET500', 3)] }, ACTOR));

      // ── Transfers & requisitions (to/from the user's other branch) ──
      // Kept PENDING / IN_TRANSIT so no stock lands in the other branch.
      console.log('Transfers / requisitions…');
      if (has('P-MASK', 'P-ORS')) {
        const t1 = await step('transfer', 'TR1 in transit', () =>
          g(TransferService).create(T, { fromBranchId: BR, toBranchId: OTHER_BR, reference: 'SAMPLE-TR-0001', date: daysAgo(3), note: NOTE,
            items: [{ productId: P('P-MASK').id, quantity: 20 }, { productId: P('P-ORS').id, quantity: 10 }] }, ACTOR));
        if (t1) await step('', 'send TR1', () => g(TransferService).send(idOf(t1), T));
      }
      if (has('P-PCM650'))
        await step('transfer', 'TR2 pending', () =>
          g(TransferService).create(T, { fromBranchId: BR, toBranchId: OTHER_BR, reference: 'SAMPLE-TR-0002', date: daysAgo(0), note: NOTE,
            items: [{ productId: P('P-PCM650').id, quantity: 10 }] }, ACTOR));
      if (has('P-CBC-REA', 'P-EDTA'))
        await step('requisition', 'RQ1 pending', () =>
          g(RequisitionService).create(T, BR, { fromBranchId: OTHER_BR, reference: 'SAMPLE-RQ-0001', date: daysAgo(1), note: `${NOTE} — reagent top-up`,
            items: [{ productId: P('P-CBC-REA').id, quantity: 1 }, { productId: P('P-EDTA').id, quantity: 2 }] }, ACTOR));
      if (has('P-GLOVE')) {
        const rq = await step('requisition', 'RQ2 rejected', () =>
          g(RequisitionService).create(T, BR, { fromBranchId: OTHER_BR, reference: 'SAMPLE-RQ-0002', date: daysAgo(6), note: NOTE,
            items: [{ productId: P('P-GLOVE').id, quantity: 5 }] }, ACTOR));
        if (rq) await step('', 'reject RQ2', () => g(RequisitionService).reject(idOf(rq), T, ACTOR));
      }

      // ── Expenses & incomes ──
      console.log('Finance…');
      const expenses: Array<[number, number, number, string]> = [[0, 35000, 27, 'November rent'], [1, 6200, 20, 'BESCOM electricity bill'], [2, 48000, 15, 'Lab technician salaries'], [3, 2800, 8, 'Centrifuge servicing'], [1, 1100, 4, 'Internet']];
      for (const [ci, amount, d, label] of expenses)
        await step('expense', label, () =>
          g(ExpenseService).create(T, BR, { amount, categoryId: expCats[ci], reference: `SAMPLE-EXP-${d}`, date: daysAgo(d), note: `${NOTE} — ${label}` }, ACTOR));
      const incomes: Array<[number, number, number, string]> = [[0, 4500, 22, 'Doctor consultations'], [1, 1800, 11, 'Home collection visits'], [2, 750, 5, 'Report courier charges']];
      for (const [ci, amount, d, label] of incomes)
        await step('income', label, () =>
          g(IncomeService).create(T, BR, { amount, categoryId: incCats[ci], reference: `SAMPLE-INC-${d}`, date: daysAgo(d), note: `${NOTE} — ${label}` }, ACTOR));

      // ── Gift cards & promotions ──
      await step('giftCard', 'GC1', () => g(GiftCardService).create(T, BR, { code: 'SAMPLE-GC-500', value: 500, customerId: customers[1], expiryDate: daysAhead(180), note: NOTE }));
      const gc2 = await step('giftCard', 'GC2', () => g(GiftCardService).create(T, BR, { code: 'SAMPLE-GC-1000', value: 1000, customerId: customers[4], expiryDate: daysAhead(365), note: NOTE }));
      if (gc2) await step('', 'redeem GC2', () => g(GiftCardService).redeem(idOf(gc2), T, { amount: 250 } as never));
      await step('promotion', 'winter', () => g(PromotionService).create(T, { title: 'Winter Wellness – 10% off Vitamins', description: `${NOTE}. Valid on all vitamin & supplement products.`, startsAt: daysAgo(5), endsAt: daysAhead(25), isActive: true }));
      await step('promotion', 'senior', () => g(PromotionService).create(T, { title: 'Senior Citizen Health Checkup Package', description: `${NOTE}. CBC + HbA1c + Lipid at ₹999.`, startsAt: daysAgo(10), endsAt: daysAhead(50), isActive: true }));

      // ── POS: register, session, checkouts, held bill ──
      console.log('POS…');
      const reg = await step('posRegister', 'Counter 1', () => g(PosService).createRegister(T, BR, { name: 'Counter 1' }));
      await step('posRegister', 'Counter 2', () => g(PosService).createRegister(T, BR, { name: 'Counter 2' }));
      if (reg && customers[0] && has('P-PCM650', 'P-MASK', 'P-ORS')) {
        const sess = await step('posSession', 'Counter 1', () => g(PosService).openSession(T, BR, { registerId: idOf(reg), openingCash: 2000 }, ACTOR));
        if (sess) {
          for (const [i, items, method] of [
            [1, [['P-PCM650', 2], ['P-ORS', 2]], 'CASH'],
            [2, [['P-MASK', 5]], 'UPI'],
            [3, [['P-PCM650', 1], ['P-MASK', 2]], 'CARD'],
          ] as const) {
            const lines = items.map(([c, q]) => ({ productId: P(c).id, quantity: q, price: P(c).price, taxRate: P(c).tax }));
            const amt = lines.reduce((s, l) => s + l.quantity * l.price * (1 + (l.taxRate ?? 0) / 100), 0);
            await step('posCheckout', `#${i}`, () =>
              g(PosService).checkout(T, BR, { customerId: customers[0], sessionId: idOf(sess), note: NOTE, items: lines, payments: [{ amount: Math.round(amt * 100) / 100, method }] }, ACTOR));
          }
          await step('posHeldBill', 'held', () => g(PosService).holdBill(T, BR, { label: 'Priya – ORS x3 (held)', cart: { customerId: customers[2], items: [{ productId: P('P-ORS').id, quantity: 3, price: P('P-ORS').price }], note: NOTE } }, ACTOR));
        }
      }

      // ── Materials (non-sale assets) ──
      const mat1 = await step('material', 'centrifuge', () => g(MaterialService).create(T, BR, { code: 'MAT-CENT', name: 'Lab Centrifuge (8 place)', category: 'Lab Equipment', unit: 'PCS', quantity: 2, cost: 38000, note: NOTE }));
      await step('material', 'wheelchair', () => g(MaterialService).create(T, BR, { code: 'MAT-WCHR', name: 'Wheelchair', category: 'Patient Care', unit: 'PCS', quantity: 3, cost: 7500, note: NOTE }));
      const mat3 = await step('material', 'tourniquet', () => g(MaterialService).create(T, BR, { code: 'MAT-TOUR', name: 'Phlebotomy Tourniquet', category: 'Lab Consumable', unit: 'PCS', quantity: 25, cost: 120, note: NOTE }));
      if (mat3) await step('', 'material damage', () => g(MaterialService).addDamage(idOf(mat3), T, { quantity: 3, reason: 'Torn', date: daysAgo(6), note: NOTE }, ACTOR));
      if (mat1) await step('', 'material repair', () => g(MaterialService).addRepair(idOf(mat1), T, { cost: 1800, status: 'COMPLETED', date: daysAgo(8), note: `${NOTE} — rotor balance` }, ACTOR));

      // ── Product templates ──
      await step('productTemplate', 'cetirizine', () => g(ProductTemplateService).create(T, { code: 'TPL-CET10', name: 'Cetirizine 10mg Tablet', category: 'Medicines', unit: 'Strip', price: 25, cost: 12, hsnCode: '30049099', description: NOTE }));
      await step('productTemplate', 'urine container', () => g(ProductTemplateService).create(T, { code: 'TPL-URINE', name: 'Sterile Urine Container 60ml', category: 'Lab Consumables', unit: 'Piece', price: 15, cost: 6, hsnCode: '39233090', description: NOTE }));

      // ── Email templates ──
      await step('emailTemplate', 'invoice', () => g(EmailTemplateService).create(T, { name: 'Sale Invoice', type: 'sale', subject: 'Your invoice {{reference}} from New Branch', body: '<p>Dear {{customer_name}},</p><p>Please find attached invoice {{reference}} for ₹{{grand_total}}.</p><p>Thank you!</p>' }));
      await step('emailTemplate', 'po', () => g(EmailTemplateService).create(T, { name: 'Purchase Order', type: 'purchase', subject: 'Purchase order {{reference}}', body: '<p>Hello {{supplier_name}},</p><p>Please find our purchase order {{reference}} attached.</p>' }));
      await step('emailTemplate', 'quote', () => g(EmailTemplateService).create(T, { name: 'Quotation', type: 'quote', subject: 'Quotation {{reference}}', body: '<p>Dear {{customer_name}},</p><p>As requested, please find quotation {{reference}} attached.</p>' }));

      // ── Calendar ──
      await step('calendarEvent', 'audit', () => g(CalendarService).create(T, BR, { title: 'Monthly stock audit', description: NOTE, color: '#2563eb', startAt: daysAhead(3), endAt: daysAhead(3.1) }, ACTOR));
      await step('calendarEvent', 'supplier', () => g(CalendarService).create(T, BR, { title: 'MedLine Distributors – order review', description: NOTE, color: '#16a34a', startAt: daysAhead(6), endAt: daysAhead(6.05) }, ACTOR));
      await step('calendarEvent', 'camp', () => g(CalendarService).create(T, BR, { title: 'Blood donation camp', description: NOTE, color: '#dc2626', startAt: daysAhead(12), isAllDay: true }, ACTOR));

      // ── Blood bank ──
      console.log('Blood bank…');
      const donors: string[] = [];
      for (const d of [
        { name: 'Vikram Singh', bloodGroup: 'O+', phone: '+91 99001 20001', lastDonationDate: daysAgo(30) },
        { name: 'Meera Nair', bloodGroup: 'A+', phone: '+91 99001 20002', lastDonationDate: daysAgo(20) },
        { name: 'Arjun Reddy', bloodGroup: 'B-', phone: '+91 99001 20003', lastDonationDate: daysAgo(10) },
        { name: 'Fatima Sheikh', bloodGroup: 'AB+', phone: '+91 99001 20004', status: 'DEFERRED' },
      ]) {
        const r = await step('bloodDonor', d.name, () => g(BloodBankService).createDonor(T, BR, { ...d, note: NOTE }));
        if (r) donors.push(idOf(r));
      }
      const donations: string[] = [];
      for (const [i, bg, comp, d, bag] of [[0, 'O+', 'WHOLE_BLOOD', 30, 'SAMPLE-BAG-0001'], [1, 'A+', 'RBC', 20, 'SAMPLE-BAG-0002'], [2, 'B-', 'PLASMA', 10, 'SAMPLE-BAG-0003']] as const) {
        if (!donors[i]) continue;
        const r = await step('bloodDonation', bag, () =>
          g(BloodBankService).createDonation(T, BR, { donorId: donors[i], bloodGroup: bg, component: comp, volumeMl: 450, bagNumber: bag, collectedAt: daysAgo(d), expiryDate: daysAhead(42 - d), note: NOTE }));
        if (r) donations.push(idOf(r));
      }
      for (const id of donations.slice(0, 2))
        await step('', 'donation AVAILABLE', () => g(BloodBankService).updateDonationStatus(id, T, { status: 'AVAILABLE' }));
      const req = await step('bloodRequest', 'O+', () => g(BloodBankService).createRequest(T, BR, { bloodGroup: 'O+', component: 'WHOLE_BLOOD', units: 1, patientName: 'Suresh Patil', note: `${NOTE} — scheduled surgery` }));
      await step('bloodRequest', 'A+', () => g(BloodBankService).createRequest(T, BR, { bloodGroup: 'A+', component: 'RBC', units: 2, patientName: 'Lakshmi Iyer', note: NOTE }));
      if (req && donations[0])
        await step('crossMatch', 'O+', () => g(BloodBankService).createCrossMatch(T, BR, { requestId: idOf(req), donationId: donations[0], result: 'COMPATIBLE', note: NOTE }, ACTOR));

      // ── IPD ──
      console.log('IPD…');
      const adm1 = await step('ipdAdmission', 'A1', () => g(IpdService).admit(T, BR, { patientName: 'Suresh Patil', admissionNo: 'SAMPLE-IPD-0001', ward: 'General Ward', bed: 'G-04', referringDoctor: 'Dr. K. Rao', admittedAt: daysAgo(4), note: NOTE }));
      if (adm1)
        for (const c of [
          { description: 'Bed charges (4 days)', category: 'ROOM', amount: 6000 },
          { description: 'CBC + LFT panel', category: 'LAB', amount: 1150 },
          { description: 'IV fluids & consumables', category: 'PHARMACY', amount: 1800 },
        ])
          await step('', `charge ${c.description}`, () => g(IpdService).addCharge(idOf(adm1), T, { ...c, date: daysAgo(2) }, ACTOR));
      const adm2 = await step('ipdAdmission', 'A2', () => g(IpdService).admit(T, BR, { patientName: 'Lakshmi Iyer', admissionNo: 'SAMPLE-IPD-0002', ward: 'Semi-Private', bed: 'SP-02', referringDoctor: 'Dr. A. Menon', admittedAt: daysAgo(9), note: NOTE }));
      if (adm2) {
        await step('', 'charge A2', () => g(IpdService).addCharge(idOf(adm2), T, { description: 'Room charges (5 days)', category: 'ROOM', amount: 12500, date: daysAgo(5) }, ACTOR));
        await step('', 'discharge A2', () => g(IpdService).discharge(idOf(adm2), T));
      }

      // ── Notifications ──
      for (const n of [
        { type: 'LOW_STOCK', title: 'Low stock: CBC Reagent Kit', body: `${NOTE}. Only a few kits left at New Branch.`, link: '/reports/low-stock' },
        { type: 'EXPIRY', title: 'Metformin batch MET24A07 expires in 25 days', body: NOTE, link: '/reports/expiry' },
        { type: 'INFO', title: 'Sample data loaded for New Branch', body: 'Demo records were seeded across all inventory modules.' },
      ])
        await step('notification', n.title, () => g(NotificationService).create(T, n));
    }),
  );

  writeFileSync(MANIFEST, JSON.stringify({ tenantId: T, branchId: BR, createdAt: new Date().toISOString(), ids: manifest }, null, 2));
  console.log('\nCreated:');
  for (const [k, v] of Object.entries(manifest)) if (k) console.log(`  ${k.padEnd(18)} ${v.length}`);
  console.log(`\nFailures: ${failures.length}`);
  for (const f of failures) console.log(`  - ${f}`);
  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
