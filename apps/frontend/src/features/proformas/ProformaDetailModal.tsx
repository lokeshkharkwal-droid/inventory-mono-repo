import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LottieLoader } from '@/components/LottieLoader';
import { normalizeEmpty } from '@/components/shared/NotesRichTextEditor/html';
import { sanitizeRichTextHTML } from '@/lib/rich-text';
import { cn } from '@/lib/utils';
import {
  useProformaDetail,
  useProformaRelations,
  type ProformaDetail,
  type ProformaRelation,
} from './api';

interface Props {
  proformaId: string;
  proformaName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Friendly labels for the mapping kinds (Proforma Relations → Type). */
const RELATION_TYPE_LABEL: Record<string, string> = {
  lab_test: 'Lab Test',
  radiology: 'Radiology',
  blood_donation_type: 'Blood Donation Type',
  blood_request_type: 'Blood Request Type',
  branch: 'Branch',
};
/** Lab tests first (as the legacy modal lists them), then the other kinds. */
const RELATION_ORDER = Object.keys(RELATION_TYPE_LABEL);

const num = (v: number | string | null | undefined) => Number(v ?? 0) || 0;
const money = (v: number) => v.toFixed(2);

/** `dd.mm.yyyy hh:mm AM` in local time — the legacy modal's date format. */
function fmtDateTime(v: string | null | undefined): string {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = d.getHours();
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(
    h % 12 || 12,
  )}:${pad(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
}

/**
 * Proforma Details — EZ Health Track `proformas/modal_view` parity, opened by
 * clicking a proforma row (or Actions → Proforma Details). Laid out like the
 * legacy modal: the Name / Date / Status well, the Proforma Items table with its
 * Total Amount, the Proforma Relations (mapped lab tests, branches…), the Note
 * (only when set), the Created by box and a full-width Edit button — styled in
 * the kaltros design language. Read-only; Edit opens the edit page.
 */
export function ProformaDetailModal({
  proformaId,
  proformaName,
  open,
  onOpenChange,
}: Props) {
  const navigate = useNavigate();
  const detail = useProformaDetail(proformaId, open);
  const relations = useProformaRelations(open ? proformaId : '');
  const p = detail.data;

  const onEdit = () => {
    onOpenChange(false);
    navigate(`/proformas/${proformaId}/edit`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base text-gray-800">
            Proforma Details
          </DialogTitle>
        </DialogHeader>

        {detail.isLoading ? (
          <div className="py-8">
            <LottieLoader size={64} className="py-0" />
          </div>
        ) : detail.isError || !p ? (
          <div className="space-y-3 py-8 text-center text-sm text-slate-500">
            <p>Could not load the details of {proformaName}.</p>
            <Button
              variant="outline"
              size="sm"
              className="rounded-md"
              onClick={() => void detail.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <DetailBody
            p={p}
            relations={relations.data}
            relationsLoading={relations.isLoading}
            onEdit={onEdit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailBody({
  p,
  relations,
  relationsLoading,
  onEdit,
}: {
  p: ProformaDetail;
  relations?: ProformaRelation[];
  relationsLoading: boolean;
  onEdit: () => void;
}) {
  const items = p.items ?? [];
  const showDiscount = items.some((it) => num(it.discount) !== 0);
  const showTax = items.some((it) => num(it.taxRate) !== 0);
  const columns = 6 + (showDiscount ? 1 : 0) + (showTax ? 1 : 0);

  /** The legacy "Total Amount": the sum of the line subtotals. */
  const totalAmount = items.reduce((s, it) => s + num(it.subtotal), 0);
  const labLines = Array.isArray(p.labTests)
    ? p.labTests.filter((l) => l?.name)
    : [];
  const labTotal = labLines.reduce((s, l) => s + num(l.price), 0);
  const orderTax = num(p.orderTax);
  const orderDiscount = num(p.orderDiscount);
  const shipping = num(p.shipping);
  const grandTotal = num(p.grandTotal);
  /** Order-level amounts on top of the lines (older proformas / line tax). */
  const extras = [
    { label: 'Lab Tests', value: labTotal },
    { label: 'Tax', value: orderTax },
    { label: 'Order Discount', value: -orderDiscount },
    { label: 'Shipping', value: shipping },
  ].filter((e) => e.value !== 0);

  const sortedRelations = [...(relations ?? [])].sort(
    (a, b) => rank(a.entityType) - rank(b.entityType),
  );
  const note = normalizeEmpty((p.note ?? '').trim());

  return (
    <div className="min-w-0 space-y-5 text-sm text-gray-800">
      {/* ── Name / Date / Status well ── */}
      <div className="grid gap-x-6 gap-y-1.5 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Info label="Name">{p.name || '—'}</Info>
          <Info label="Date">{fmtDateTime(p.date)}</Info>
          <Info label="Status">
            <StatusPill status={p.status} />
          </Info>
        </div>
        <div className="space-y-1.5 sm:text-right">
          <Info label="Reference" right>
            <span className="font-mono text-xs">{p.reference}</span>
          </Info>
          {p.customerName && (
            <Info label="Customer" right>
              {p.customerName}
            </Info>
          )}
        </div>
      </div>

      {/* ── Proforma Items ── */}
      <section>
        <SectionTitle>Proforma Items</SectionTitle>
        <div className="relative overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[640px] border-collapse text-xs">
            <thead>
              <tr className="bg-blue-50">
                <Th className="w-10 text-center">No</Th>
                <Th>Description</Th>
                <Th className="text-right">Quantity</Th>
                <Th className="text-center">Quantity Method</Th>
                <Th className="text-right">Unit Price</Th>
                {showDiscount && <Th className="text-right">Discount</Th>}
                {showTax && <Th className="text-right">Tax</Th>}
                <Th className="text-right">Subtotal</Th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns}
                    className="px-3 py-6 text-center text-slate-400"
                  >
                    No products.
                  </td>
                </tr>
              ) : (
                items.map((it, i) => (
                  <tr
                    key={it.id}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <Td className="text-center text-slate-500">{i + 1}</Td>
                    <Td>
                      <span className="font-medium">{it.productName}</span>
                      {it.productCode && (
                        <span className="text-slate-500">
                          {' '}
                          ({it.productCode})
                        </span>
                      )}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {num(it.quantity).toFixed(2)}
                    </Td>
                    <Td className="text-center">
                      {Number(it.quantityMethod) === 2 ? 'Combined' : 'Single'}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {money(num(it.unitPrice))}
                    </Td>
                    {showDiscount && (
                      <Td className="text-right tabular-nums">
                        {money(num(it.discount))}
                      </Td>
                    )}
                    {showTax && (
                      <Td className="whitespace-nowrap text-right tabular-nums">
                        {money(num(it.taxAmount))}
                        {num(it.taxRate) !== 0 && (
                          <span className="text-slate-400">
                            {' '}
                            ({num(it.taxRate)}%)
                          </span>
                        )}
                      </Td>
                    )}
                    <Td className="text-right font-medium tabular-nums">
                      {money(num(it.subtotal))}
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50 font-semibold">
              <TotalRow
                colSpan={columns - 1}
                label="Total Amount"
                value={money(totalAmount)}
              />
              {extras.length > 0 && (
                <>
                  {extras.map((e) => (
                    <TotalRow
                      key={e.label}
                      colSpan={columns - 1}
                      label={e.label}
                      value={money(e.value)}
                      muted
                    />
                  ))}
                  <TotalRow
                    colSpan={columns - 1}
                    label="Grand Total"
                    value={money(grandTotal)}
                    highlight
                  />
                </>
              )}
            </tfoot>
          </table>
        </div>
      </section>

      {/* ── Lab test lines carried on older proformas ── */}
      {labLines.length > 0 && (
        <section>
          <SectionTitle>Lab Test Lines</SectionTitle>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-blue-50">
                  <Th className="w-10 text-center">No</Th>
                  <Th>Name</Th>
                  <Th>Type</Th>
                  <Th className="text-right">Price</Th>
                </tr>
              </thead>
              <tbody>
                {labLines.map((l, i) => (
                  <tr
                    key={`${l.name}-${i}`}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <Td className="text-center text-slate-500">{i + 1}</Td>
                    <Td>{l.name}</Td>
                    <Td>{typeLabel(l.type?.toLowerCase())}</Td>
                    <Td className="text-right tabular-nums">
                      {money(num(l.price))}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Proforma Relations ── */}
      <section>
        <SectionTitle>Proforma Relations</SectionTitle>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-blue-50">
                <Th className="w-10 text-center">No</Th>
                <Th>Name</Th>
                <Th className="w-40 text-center">Type</Th>
              </tr>
            </thead>
            <tbody>
              {relationsLoading ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-4 text-center text-slate-400"
                  >
                    Loading…
                  </td>
                </tr>
              ) : sortedRelations.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-4 text-center text-slate-400"
                  >
                    No relations.
                  </td>
                </tr>
              ) : (
                sortedRelations.map((r, i) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <Td className="text-center text-slate-500">{i + 1}</Td>
                    <Td>{r.label ?? r.entityId}</Td>
                    <Td className="text-center">{typeLabel(r.entityType)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Note (only when set) ── */}
      {note && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-xs font-semibold text-gray-700">Note:</p>
          <div
            className="notes-rte-content max-w-full text-sm text-slate-700"
            dangerouslySetInnerHTML={{ __html: sanitizeRichTextHTML(note) }}
          />
        </div>
      )}

      {/* ── Created by ── */}
      <div className="flex justify-end">
        <div className="w-full space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs sm:w-1/2">
          <p>
            <span className="text-slate-500">Created by: </span>
            <span className="font-medium">{p.createdByName || '—'}</span>
          </p>
          <p>
            <span className="text-slate-500">Date: </span>
            <span className="font-medium">
              {fmtDateTime(p.createdAt ?? p.date)}
            </span>
          </p>
        </div>
      </div>

      {/* ── Edit (the legacy modal's only action) ── */}
      <Button
        type="button"
        className="w-full rounded-md bg-amber-500 text-white hover:bg-amber-600"
        onClick={onEdit}
      >
        <Pencil className="h-4 w-4" /> Edit
      </Button>
    </div>
  );
}

function rank(type: string): number {
  const i = RELATION_ORDER.indexOf(type);
  return i < 0 ? RELATION_ORDER.length : i;
}

function typeLabel(type: string | undefined): string {
  if (!type) return '—';
  return (
    RELATION_TYPE_LABEL[type] ??
    type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-blue-700">
      <List className="h-4 w-4" aria-hidden="true" />
      {children}
    </h3>
  );
}

function Info({
  label,
  right,
  children,
}: {
  label: string;
  right?: boolean;
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        'flex items-center gap-1.5 text-sm',
        right && 'sm:justify-end',
      )}
    >
      <span className="font-semibold text-gray-700">{label}:</span>
      <span className="text-gray-800">{children}</span>
    </p>
  );
}

/** Same pill as the list's Status column. */
function StatusPill({ status }: { status: string }) {
  const s = status?.toUpperCase();
  const tone =
    s === 'ACTIVE'
      ? 'bg-green-100 text-green-700'
      : s === 'INACTIVE'
        ? 'bg-red-100 text-red-700'
        : 'bg-yellow-100 text-yellow-700';
  return (
    <span
      className={cn(
        'inline-block rounded px-2 py-0.5 text-[10px] font-semibold',
        tone,
      )}
    >
      {s ? s.charAt(0) + s.slice(1).toLowerCase() : '—'}
    </span>
  );
}

function Th({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <th
      className={cn(
        'whitespace-nowrap border-b border-slate-100 px-3 py-2.5 text-left font-semibold text-slate-700',
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <td className={cn('px-3 py-2', className)}>{children}</td>;
}

function TotalRow({
  colSpan,
  label,
  value,
  muted,
  highlight,
}: {
  colSpan: number;
  label: string;
  value: string;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <tr
      className={cn(
        highlight && 'bg-blue-50 text-blue-900',
        muted && 'font-normal text-slate-600',
      )}
    >
      <td colSpan={colSpan} className="px-3 py-2 text-right">
        {label}
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
        {value}
      </td>
    </tr>
  );
}
