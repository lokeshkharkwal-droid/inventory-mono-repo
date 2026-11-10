import { Prisma } from '@prisma/client';
import { ProductStockService } from './product-stock.service';
import { InsufficientStockException } from './exceptions/product.exceptions';
import type { PrismaService } from '../../prisma/prisma.service';
import type { ProductService } from './product.service';

const D = (v: number) => new Prisma.Decimal(v);

/**
 * Build a fake transaction client whose warehouse-product table is backed by a
 * single in-memory row (or none). Records the last write so assertions can read
 * the persisted quantity/avgCost.
 */
function makeTx(existing?: {
  id: string;
  quantity: Prisma.Decimal;
  avgCost: Prisma.Decimal;
}) {
  const writes: { quantity: Prisma.Decimal; avgCost: Prisma.Decimal }[] = [];
  const tx = {
    inventoryWarehouseProduct: {
      findUnique: jest.fn().mockResolvedValue(existing ?? null),
      update: jest
        .fn()
        .mockImplementation(
          ({
            data,
          }: {
            data: { quantity: Prisma.Decimal; avgCost: Prisma.Decimal };
          }) => {
            writes.push(data);
            return Promise.resolve({ id: existing?.id ?? 'x', ...data });
          },
        ),
      create: jest
        .fn()
        .mockImplementation(
          ({
            data,
          }: {
            data: { quantity: Prisma.Decimal; avgCost: Prisma.Decimal };
          }) => {
            writes.push({ quantity: data.quantity, avgCost: data.avgCost });
            return Promise.resolve({ id: 'new', ...data });
          },
        ),
    },
  };
  return { tx, writes };
}

describe('ProductStockService.applyDelta (stock math)', () => {
  const service = new ProductStockService(
    {} as unknown as PrismaService,
    {} as unknown as ProductService,
  );

  const base = { tenantId: 't1', branchId: 'b1', productId: 'p1' };

  it('creates a new warehouse row on first inbound with the given cost', async () => {
    const { tx, writes } = makeTx();
    const qty = await service.applyDelta(tx as never, {
      ...base,
      delta: D(10),
      cost: D(5),
    });
    expect(qty.toNumber()).toBe(10);
    expect(tx.inventoryWarehouseProduct.create).toHaveBeenCalled();
    expect(writes[0]!.quantity.toNumber()).toBe(10);
    expect(writes[0]!.avgCost.toNumber()).toBe(5);
  });

  it('recomputes AVCO on a subsequent inbound', async () => {
    // 10 @ 5 then +10 @ 7 → avg (50+70)/20 = 6
    const { tx, writes } = makeTx({ id: 'w1', quantity: D(10), avgCost: D(5) });
    const qty = await service.applyDelta(tx as never, {
      ...base,
      delta: D(10),
      cost: D(7),
    });
    expect(qty.toNumber()).toBe(20);
    expect(writes[0]!.avgCost.toNumber()).toBe(6);
  });

  it('leaves average cost unchanged on an outbound move', async () => {
    const { tx, writes } = makeTx({ id: 'w1', quantity: D(10), avgCost: D(5) });
    const qty = await service.applyDelta(tx as never, {
      ...base,
      delta: D(-4),
    });
    expect(qty.toNumber()).toBe(6);
    expect(writes[0]!.avgCost.toNumber()).toBe(5);
  });

  it('rejects an outbound move that would drive stock negative', async () => {
    const { tx } = makeTx({ id: 'w1', quantity: D(3), avgCost: D(5) });
    await expect(
      service.applyDelta(tx as never, { ...base, delta: D(-5) }),
    ).rejects.toBeInstanceOf(InsufficientStockException);
  });

  it('does not change AVCO on inbound when no cost is supplied', async () => {
    const { tx, writes } = makeTx({ id: 'w1', quantity: D(10), avgCost: D(5) });
    const qty = await service.applyDelta(tx as never, { ...base, delta: D(5) });
    expect(qty.toNumber()).toBe(15);
    expect(writes[0]!.avgCost.toNumber()).toBe(5);
  });
});
