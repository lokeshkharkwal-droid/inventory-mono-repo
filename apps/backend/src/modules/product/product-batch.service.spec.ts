import { Prisma } from '@prisma/client';
import { ProductBatchService } from './product-batch.service';
import {
  BatchNotFoundException,
  ExpiredBatchException,
  InsufficientBatchQuantityException,
} from './exceptions/batch.exceptions';
import type { PrismaService } from '../../prisma/prisma.service';
import type { KalnosticsBranchClient } from '../../integration/clients/kalnostics-branch.client';

const D = (v: number) => new Prisma.Decimal(v);
const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

/**
 * Fake transaction client backed by a single in-memory batch row. Records the last
 * update's `data` so assertions can read the persisted quantity.
 */
function makeTx(batch?: {
  id: string;
  tenantId: string;
  branchId: string;
  productId: string;
  quantity: Prisma.Decimal;
  expiryDate?: Date | null;
  deletedAt?: Date | null;
}) {
  const updates: { where: unknown; data: Record<string, unknown> }[] = [];
  const creates: { data: Record<string, unknown> }[] = [];
  const tx = {
    inventoryProductBatch: {
      findFirst: jest.fn().mockImplementation(({ where }: { where: never }) => {
        if (!batch) return Promise.resolve(null);
        const w = where as Record<string, unknown>;
        // emulate the id/tenant/branch/product + deletedAt:null filter
        if (w.id && w.id !== batch.id) return Promise.resolve(null);
        if (w.tenantId && w.tenantId !== batch.tenantId)
          return Promise.resolve(null);
        if (w.branchId && w.branchId !== batch.branchId)
          return Promise.resolve(null);
        if (w.productId && w.productId !== batch.productId)
          return Promise.resolve(null);
        if (batch.deletedAt) return Promise.resolve(null);
        return Promise.resolve(batch);
      }),
      update: jest
        .fn()
        .mockImplementation((args: { where: unknown; data: never }) => {
          updates.push(args);
          return Promise.resolve({ id: batch?.id ?? 'x' });
        }),
      create: jest.fn().mockImplementation((args: { data: never }) => {
        creates.push(args);
        return Promise.resolve({ id: 'new', ...(args.data as object) });
      }),
    },
  };
  return { tx, updates, creates };
}

describe('ProductBatchService', () => {
  const service = new ProductBatchService(
    {} as unknown as PrismaService,
    {} as unknown as KalnosticsBranchClient,
  );
  const base = {
    id: 'batch1',
    tenantId: 't1',
    branchId: 'b1',
    productId: 'p1',
  };

  describe('createBatch', () => {
    it('records a batch even when batchNo/expiry are null', async () => {
      const { tx, creates } = makeTx();
      await service.createBatch(tx as never, {
        tenantId: 't1',
        branchId: 'b1',
        productId: 'p1',
        quantity: D(10),
      });
      expect(creates).toHaveLength(1);
      expect(creates[0]!.data.batchNo).toBeNull();
      expect(creates[0]!.data.expiryDate).toBeNull();
      expect((creates[0]!.data.quantity as Prisma.Decimal).toNumber()).toBe(10);
    });
  });

  describe('consume', () => {
    it('decrements the batch on a valid sale', async () => {
      const { tx, updates } = makeTx({ ...base, quantity: D(10) });
      const remaining = await service.consume(tx as never, {
        ...base,
        batchId: 'batch1',
        quantity: D(4),
      });
      expect(remaining.toNumber()).toBe(6);
      expect((updates[0]!.data.quantity as Prisma.Decimal).toNumber()).toBe(6);
    });

    it('throws InsufficientBatchQuantity when the batch is short', async () => {
      const { tx } = makeTx({ ...base, quantity: D(3) });
      await expect(
        service.consume(tx as never, {
          ...base,
          batchId: 'batch1',
          quantity: D(5),
        }),
      ).rejects.toBeInstanceOf(InsufficientBatchQuantityException);
    });

    it('throws BatchNotFound for a wrong-branch / soft-deleted batch', async () => {
      const { tx } = makeTx({
        ...base,
        branchId: 'other',
        quantity: D(10),
      });
      await expect(
        service.consume(tx as never, {
          ...base,
          batchId: 'batch1',
          quantity: D(1),
        }),
      ).rejects.toBeInstanceOf(BatchNotFoundException);
    });

    it('allows an expired batch when blockExpired is off', async () => {
      const { tx } = makeTx({
        ...base,
        quantity: D(10),
        expiryDate: daysFromNow(-5),
      });
      await expect(
        service.consume(tx as never, {
          ...base,
          batchId: 'batch1',
          quantity: D(1),
          blockExpired: false,
        }),
      ).resolves.toBeDefined();
    });

    it('throws ExpiredBatch when blockExpired is on', async () => {
      const { tx } = makeTx({
        ...base,
        quantity: D(10),
        expiryDate: daysFromNow(-5),
      });
      await expect(
        service.consume(tx as never, {
          ...base,
          batchId: 'batch1',
          quantity: D(1),
          blockExpired: true,
        }),
      ).rejects.toBeInstanceOf(ExpiredBatchException);
    });
  });

  describe('restore', () => {
    it('increments the batch quantity', async () => {
      const { tx, updates } = makeTx({ ...base, quantity: D(6) });
      await service.restore(tx as never, { batchId: 'batch1', quantity: D(4) });
      expect(updates).toHaveLength(1);
      expect(updates[0]!.data.quantity).toEqual({ increment: D(4) });
    });

    it('is a no-op for a null batchId (legacy line)', async () => {
      const { tx, updates } = makeTx({ ...base, quantity: D(6) });
      await service.restore(tx as never, { batchId: null, quantity: D(4) });
      expect(updates).toHaveLength(0);
    });
  });
});
