import { Prisma } from '@prisma/client';
import { SaleService } from './sale.service';
import type { PrismaService } from '../../prisma/prisma.service';
import type { CustomerService } from '../customer/customer.service';
import type { ProductService } from '../product/product.service';
import type { ProductStockService } from '../product/product-stock.service';
import type { ProductBatchService } from '../product/product-batch.service';
import type { NumberingService } from '../settings/numbering.service';
import type { SettingsService } from '../settings/settings.service';
import type { KalnosticsBranchClient } from '../../integration/clients/kalnostics-branch.client';
import type { KalnosticsUsersClient } from '../../integration/clients/kalnostics-users.client';
import type { KalnosticsPrintTemplateClient } from '../../integration/clients/kalnostics-print-template.client';

const D = (v: number) => new Prisma.Decimal(v);

function setup(opts: { isStockTracked?: boolean } = {}) {
  const isStockTracked = opts.isStockTracked ?? true;
  const applyDelta = jest.fn().mockResolvedValue(D(0));
  const consume = jest.fn().mockResolvedValue(D(0));
  const restore = jest.fn().mockResolvedValue(undefined);

  const tx = {
    inventorySale: {
      create: jest.fn().mockResolvedValue({ id: 'sale1', items: [] }),
      update: jest.fn().mockResolvedValue({ id: 'sale1', items: [] }),
    },
    inventorySalePayment: { create: jest.fn() },
    inventoryCustomer: { updateMany: jest.fn() },
    inventorySaleItem: { deleteMany: jest.fn() },
  };

  const prisma = {
    withTenant: jest.fn((_t: string, cb: (tx: unknown) => unknown) => cb(tx)),
    inventoryWarehouseProduct: {
      findUnique: jest.fn().mockResolvedValue({ avgCost: D(5) }),
    },
    inventoryProductBatch: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'batch1',
        batchNo: 'B1',
        serialNo: null,
        expiryDate: null,
        cost: D(5),
      }),
    },
    inventoryProduct: {
      findMany: jest.fn().mockResolvedValue([{ id: 'p1', isStockTracked }]),
    },
  } as unknown as PrismaService;

  const service = new SaleService(
    prisma,
    {
      findById: jest.fn().mockResolvedValue({ id: 'c1' }),
    } as unknown as CustomerService,
    {
      findById: jest.fn().mockResolvedValue({
        id: 'p1',
        name: 'Widget',
        code: 'W1',
        cost: 5,
        isStockTracked,
      }),
    } as unknown as ProductService,
    { applyDelta } as unknown as ProductStockService,
    { consume, restore } as unknown as ProductBatchService,
    {
      next: jest.fn().mockResolvedValue('SALE-1'),
    } as unknown as NumberingService,
    {
      get: jest.fn().mockResolvedValue({ isExpiredSaleBlocked: false }),
    } as unknown as SettingsService,
    {} as unknown as KalnosticsBranchClient,
    {} as unknown as KalnosticsUsersClient,
    {} as unknown as KalnosticsPrintTemplateClient,
  );

  return { service, prisma, applyDelta, consume, restore };
}

const dto = {
  customerId: 'c1',
  status: 'COMPLETED' as const,
  items: [{ productId: 'p1', quantity: 4, price: 10, batchId: 'batch1' }],
};

describe('SaleService.create (batch-aware outbound)', () => {
  it('consumes the chosen batch AND decrements the aggregate', async () => {
    const { service, applyDelta, consume } = setup();
    await service.create('t1', 'b1', dto);
    expect(consume).toHaveBeenCalledTimes(1);
    const consumeCalls = consume.mock.calls as unknown as Array<
      [unknown, { batchId: string; quantity: Prisma.Decimal }]
    >;
    const cArg = consumeCalls[0]![1];
    expect(cArg.batchId).toBe('batch1');
    expect(cArg.quantity.toNumber()).toBe(4);
    expect(applyDelta).toHaveBeenCalledTimes(1);
    const applyCalls = applyDelta.mock.calls as unknown as Array<
      [unknown, { delta: Prisma.Decimal }]
    >;
    expect(applyCalls[0]![1].delta.toNumber()).toBe(-4);
  });

  it('does not touch stock for a non-stock-tracked product', async () => {
    const { service, applyDelta, consume } = setup({ isStockTracked: false });
    await service.create('t1', 'b1', dto);
    expect(consume).not.toHaveBeenCalled();
    expect(applyDelta).not.toHaveBeenCalled();
  });

  it('rejects (and never decrements the aggregate) when the batch is short', async () => {
    const { service, applyDelta, consume } = setup();
    consume.mockRejectedValueOnce(new Error('INSUFFICIENT_BATCH_QUANTITY'));
    await expect(service.create('t1', 'b1', dto as never)).rejects.toThrow();
    expect(applyDelta).not.toHaveBeenCalled();
  });
});

describe('SaleService.update (batch re-sync)', () => {
  it('restores the old batch then consumes the new one', async () => {
    const { service, consume, restore } = setup();
    jest.spyOn(service, 'findById').mockResolvedValue({
      id: 'sale1',
      branchId: 'b1',
      status: 'COMPLETED',
      paid: D(0),
      items: [{ productId: 'p1', quantity: D(2), batchId: 'oldBatch' }],
    } as never);

    await service.update('sale1', 't1', 'b1', dto);

    expect(restore).toHaveBeenCalledTimes(1);
    const restoreCalls = restore.mock.calls as unknown as Array<
      [unknown, { batchId: string; quantity: Prisma.Decimal }]
    >;
    const rArg = restoreCalls[0]![1];
    expect(rArg.batchId).toBe('oldBatch');
    expect(rArg.quantity.toNumber()).toBe(2);
    expect(consume).toHaveBeenCalledTimes(1);
    const consumeCalls2 = consume.mock.calls as unknown as Array<
      [unknown, { batchId: string }]
    >;
    expect(consumeCalls2[0]![1].batchId).toBe('batch1');
  });
});
