import { Prisma } from '@prisma/client';
import { PurchaseService } from './purchase.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { SupplierService } from '../supplier/supplier.service';
import type { ProductService } from '../product/product.service';
import type { ProductStockService } from '../product/product-stock.service';
import type { ProductBatchService } from '../product/product-batch.service';
import type { NumberingService } from '../settings/numbering.service';
import type { KalnosticsBranchClient } from '../../integration/clients/kalnostics-branch.client';
import type { KalnosticsUsersClient } from '../../integration/clients/kalnostics-users.client';

/** Build a PurchaseService with mocked collaborators; `isStockTracked` toggles the product flag. */
function makeService(isStockTracked = true) {
  const applyDelta = jest.fn().mockResolvedValue(new Prisma.Decimal(0));
  const createBatch = jest.fn().mockResolvedValue({ id: 'batch1' });
  const tx = {
    inventoryPurchase: {
      create: jest.fn().mockResolvedValue({ id: 'pur1', items: [] }),
    },
    inventoryPurchasePayment: { create: jest.fn() },
    inventoryProductBatch: { updateMany: jest.fn() },
  };
  const prisma = {
    withTenant: jest.fn((_t: string, cb: (tx: unknown) => unknown) => cb(tx)),
  } as unknown as PrismaService;

  const service = new PurchaseService(
    prisma,
    {
      findById: jest.fn().mockResolvedValue({ id: 's1' }),
    } as unknown as SupplierService,
    {
      findById: jest.fn().mockResolvedValue({
        id: 'p1',
        name: 'Widget',
        code: 'W1',
        isStockTracked,
      }),
    } as unknown as ProductService,
    { applyDelta } as unknown as ProductStockService,
    { createBatch } as unknown as ProductBatchService,
    {
      next: jest.fn().mockResolvedValue('PO-1'),
    } as unknown as NumberingService,
    {} as unknown as KalnosticsBranchClient,
    {} as unknown as KalnosticsUsersClient,
  );
  return { service, applyDelta, createBatch };
}

const baseDto = {
  supplierId: 's1',
  status: 'RECEIVED' as const,
  items: [{ productId: 'p1', quantity: 10, cost: 5 }],
};

describe('PurchaseService.create (batch ledger)', () => {
  it('creates a batch for a received line even with no batchNo/expiry', async () => {
    const { service, applyDelta, createBatch } = makeService(true);
    await service.create('t1', 'b1', baseDto);
    expect(applyDelta).toHaveBeenCalledTimes(1);
    expect(createBatch).toHaveBeenCalledTimes(1);
    const calls = createBatch.mock.calls as unknown as Array<
      [unknown, { quantity: Prisma.Decimal; sourcePurchaseId: string }]
    >;
    const arg = calls[0]![1];
    expect(arg.quantity.toNumber()).toBe(10);
    expect(arg.sourcePurchaseId).toBe('pur1');
  });

  it('skips stock + batch for a non-stock-tracked product', async () => {
    const { service, applyDelta, createBatch } = makeService(false);
    await service.create('t1', 'b1', baseDto);
    expect(applyDelta).not.toHaveBeenCalled();
    expect(createBatch).not.toHaveBeenCalled();
  });
});
