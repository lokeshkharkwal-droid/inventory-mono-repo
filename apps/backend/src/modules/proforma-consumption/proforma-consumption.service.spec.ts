import { Prisma } from '@prisma/client';
import { ProformaConsumptionService } from './proforma-consumption.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ProductStockService } from '../product/product-stock.service';

const D = (v: number) => new Prisma.Decimal(v);

/**
 * Builds a fake PrismaService whose proforma-relation / proforma / warehouse /
 * product tables are backed by in-memory fixtures. `relationFindMany` dispatches
 * on `where.entityType` so the lab-test and branch lookups return the right set.
 */
function makePrisma(fx: {
  labRelations: Array<{ proformaId: string; entityId: string }>;
  branchRelations: Array<{ proformaId: string; entityId: string }>;
  proformas: Array<{
    id: string;
    name: string | null;
    reference: string;
    items: Array<{
      productId: string;
      productName: string;
      productCode: string | null;
      quantity: number;
      unitPrice: number;
      taxRate: number;
    }>;
  }>;
  stock: Record<string, number>; // productId -> on-hand
  alerts: Record<string, number>; // productId -> alert qty
}) {
  return {
    inventoryProformaRelation: {
      findMany: jest.fn(
        ({
          where,
        }: {
          where: {
            entityType: string;
            // lab_test lookups pass `{ in: [...] }`; branch lookups pass a plain id.
            entityId?: string | { in: string[] };
            proformaId?: { in: string[] };
          };
        }) => {
          if (where.entityType === 'lab_test') {
            const ids =
              typeof where.entityId === 'object' ? where.entityId.in : [];
            return Promise.resolve(
              fx.labRelations
                .filter((r) => ids.includes(r.entityId))
                .map((r) => ({ proformaId: r.proformaId })),
            );
          }
          // branch
          const cand = where.proformaId?.in ?? [];
          return Promise.resolve(
            fx.branchRelations
              .filter(
                (r) =>
                  r.entityId === where.entityId && cand.includes(r.proformaId),
              )
              .map((r) => ({ proformaId: r.proformaId })),
          );
        },
      ),
    },
    inventoryProforma: {
      findMany: jest.fn(({ where }: { where: { id: { in: string[] } } }) =>
        Promise.resolve(
          fx.proformas
            .filter((p) => where.id.in.includes(p.id))
            .map((p) => ({
              ...p,
              items: p.items.map((it) => ({
                ...it,
                quantity: D(it.quantity),
                unitPrice: D(it.unitPrice),
                taxRate: D(it.taxRate),
              })),
            })),
        ),
      ),
    },
    inventoryWarehouseProduct: {
      findMany: jest.fn(
        ({ where }: { where: { productId: { in: string[] } } }) =>
          Promise.resolve(
            where.productId.in
              .filter((id) => id in fx.stock)
              .map((id) => ({ productId: id, quantity: D(fx.stock[id]!) })),
          ),
      ),
    },
    inventoryProduct: {
      findMany: jest.fn(({ where }: { where: { id: { in: string[] } } }) =>
        Promise.resolve(
          where.id.in.map((id) => ({
            id,
            alertQuantity: D(fx.alerts[id] ?? 0),
          })),
        ),
      ),
    },
  } as unknown as PrismaService;
}

const stockStub = {} as unknown as ProductStockService;

describe('ProformaConsumptionService.validate (matching + stock)', () => {
  const baseProforma = {
    id: 'pf1',
    name: 'X-Ray Kit',
    reference: 'PF-001',
    items: [
      {
        productId: 'prodA',
        productName: 'Film',
        productCode: 'F1',
        quantity: 2,
        unitPrice: 10,
        taxRate: 0,
      },
    ],
  };

  it('reports no mapping when the lab test is not mapped to any proforma', async () => {
    const prisma = makePrisma({
      labRelations: [],
      branchRelations: [],
      proformas: [],
      stock: {},
      alerts: {},
    });
    const svc = new ProformaConsumptionService(prisma, stockStub);
    const res = await svc.validate('t1', {
      branchId: 'b1',
      labTestSourceIds: ['lt1'],
    });
    expect(res.hasMapping).toBe(false);
    expect(res.ok).toBe(true);
    expect(res.products).toHaveLength(0);
  });

  it('does NOT apply a proforma mapped to the lab test but not to the active branch (req #13)', async () => {
    const prisma = makePrisma({
      labRelations: [{ proformaId: 'pf1', entityId: 'lt1' }],
      branchRelations: [{ proformaId: 'pf1', entityId: 'otherBranch' }],
      proformas: [baseProforma],
      stock: { prodA: 100 },
      alerts: { prodA: 5 },
    });
    const svc = new ProformaConsumptionService(prisma, stockStub);
    const res = await svc.validate('t1', {
      branchId: 'b1',
      labTestSourceIds: ['lt1'],
    });
    expect(res.hasMapping).toBe(false);
  });

  it('returns product availability + alert qty when mapped and branch-enabled', async () => {
    const prisma = makePrisma({
      labRelations: [{ proformaId: 'pf1', entityId: 'lt1' }],
      branchRelations: [{ proformaId: 'pf1', entityId: 'b1' }],
      proformas: [baseProforma],
      stock: { prodA: 100 },
      alerts: { prodA: 5 },
    });
    const svc = new ProformaConsumptionService(prisma, stockStub);
    const res = await svc.validate('t1', {
      branchId: 'b1',
      labTestSourceIds: ['lt1'],
    });
    expect(res.hasMapping).toBe(true);
    expect(res.ok).toBe(true);
    expect(res.products[0]).toMatchObject({
      productId: 'prodA',
      requiredQty: 2,
      availableQty: 100,
      alertQty: 5,
      sufficient: true,
    });
  });

  it('flags a shortage (ok=false) when stock is below the required quantity', async () => {
    const prisma = makePrisma({
      labRelations: [{ proformaId: 'pf1', entityId: 'lt1' }],
      branchRelations: [{ proformaId: 'pf1', entityId: 'b1' }],
      proformas: [baseProforma],
      stock: { prodA: 1 }, // needs 2
      alerts: { prodA: 5 },
    });
    const svc = new ProformaConsumptionService(prisma, stockStub);
    const res = await svc.validate('t1', {
      branchId: 'b1',
      labTestSourceIds: ['lt1'],
    });
    expect(res.ok).toBe(false);
    expect(res.shortages).toHaveLength(1);
    expect(res.shortages[0]).toMatchObject({
      productId: 'prodA',
      requiredQty: 2,
      availableQty: 1,
    });
  });

  it('sums required quantities across multiple matched proformas for the same product', async () => {
    const prisma = makePrisma({
      labRelations: [
        { proformaId: 'pf1', entityId: 'lt1' },
        { proformaId: 'pf2', entityId: 'lt2' },
      ],
      branchRelations: [
        { proformaId: 'pf1', entityId: 'b1' },
        { proformaId: 'pf2', entityId: 'b1' },
      ],
      proformas: [
        baseProforma,
        {
          id: 'pf2',
          name: 'Second',
          reference: 'PF-002',
          items: [
            {
              productId: 'prodA',
              productName: 'Film',
              productCode: 'F1',
              quantity: 3,
              unitPrice: 10,
              taxRate: 0,
            },
          ],
        },
      ],
      stock: { prodA: 100 },
      alerts: { prodA: 5 },
    });
    const svc = new ProformaConsumptionService(prisma, stockStub);
    const res = await svc.validate('t1', {
      branchId: 'b1',
      labTestSourceIds: ['lt1', 'lt2'],
    });
    const prodA = res.products.find((p) => p.productId === 'prodA');
    expect(prodA?.requiredQty).toBe(5); // 2 + 3
  });
});

describe('ProformaConsumptionService.info (tooltip)', () => {
  it('returns mapped=false when nothing applies', async () => {
    const prisma = makePrisma({
      labRelations: [],
      branchRelations: [],
      proformas: [],
      stock: {},
      alerts: {},
    });
    const svc = new ProformaConsumptionService(prisma, stockStub);
    const res = await svc.info('t1', 'b1', 'lt1');
    expect(res.mapped).toBe(false);
    expect(res.proformas).toHaveLength(0);
  });

  it('returns the proforma + its products when mapped at the branch', async () => {
    const prisma = makePrisma({
      labRelations: [{ proformaId: 'pf1', entityId: 'lt1' }],
      branchRelations: [{ proformaId: 'pf1', entityId: 'b1' }],
      proformas: [
        {
          id: 'pf1',
          name: 'X-Ray Kit',
          reference: 'PF-001',
          items: [
            {
              productId: 'prodA',
              productName: 'Film',
              productCode: 'F1',
              quantity: 2,
              unitPrice: 10,
              taxRate: 0,
            },
          ],
        },
      ],
      stock: { prodA: 7 },
      alerts: { prodA: 5 },
    });
    const svc = new ProformaConsumptionService(prisma, stockStub);
    const res = await svc.info('t1', 'b1', 'lt1');
    expect(res.mapped).toBe(true);
    expect(res.proformas[0]?.proformaName).toBe('X-Ray Kit');
    expect(res.proformas[0]?.products[0]).toMatchObject({
      productId: 'prodA',
      availableQty: 7,
      alertQty: 5,
    });
  });
});
