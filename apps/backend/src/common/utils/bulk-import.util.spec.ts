import { runBulkImport } from './bulk-import.util';

interface Row {
  code: string;
  ok: boolean;
}

describe('runBulkImport (CSV import pipeline)', () => {
  const handlers = (created: string[]) => ({
    ref: (r: Row) => r.code,
    validate: (r: Row) => {
      if (!r.ok) throw new Error('invalid row');
    },
    create: (r: Row) => {
      created.push(r.code);
      return Promise.resolve();
    },
  });

  it('dry-run validates without creating and reports per-row status', async () => {
    const created: string[] = [];
    const rows: Row[] = [
      { code: 'A', ok: true },
      { code: 'B', ok: false },
      { code: 'C', ok: true },
    ];
    const summary = await runBulkImport(rows, true, handlers(created));
    expect(created).toHaveLength(0);
    expect(summary.dryRun).toBe(true);
    expect(summary.total).toBe(3);
    expect(summary.validated).toBe(2);
    expect(summary.errors).toBe(1);
    expect(summary.results[1]).toMatchObject({ ref: 'B', status: 'error' });
  });

  it('commit creates valid rows and isolates failures', async () => {
    const created: string[] = [];
    const rows: Row[] = [
      { code: 'A', ok: true },
      { code: 'B', ok: true },
    ];
    const summary = await runBulkImport(rows, false, handlers(created));
    expect(created).toEqual(['A', 'B']);
    expect(summary.created).toBe(2);
    expect(summary.errors).toBe(0);
    expect(summary.results.every((r) => r.status === 'created')).toBe(true);
  });

  it('a throwing create does not abort the batch', async () => {
    const rows: Row[] = [
      { code: 'A', ok: true },
      { code: 'B', ok: true },
    ];
    let calls = 0;
    const summary = await runBulkImport(rows, false, {
      ref: (r) => r.code,
      create: () => {
        calls++;
        if (calls === 1) throw new Error('boom');
        return Promise.resolve();
      },
    });
    expect(summary.created).toBe(1);
    expect(summary.errors).toBe(1);
    expect(summary.results[0]).toMatchObject({
      status: 'error',
      error: 'boom',
    });
    expect(summary.results[1]).toMatchObject({ status: 'created' });
  });
});
