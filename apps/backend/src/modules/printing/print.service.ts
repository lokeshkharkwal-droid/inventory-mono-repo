import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SaleService } from '../sale/sale.service';
import { SaleReturnService } from '../sale/sale-return.service';
import { PurchaseService } from '../purchase/purchase.service';
import { ProductService } from '../product/product.service';
import { QuoteService } from '../quote/quote.service';
import { ProformaService } from '../proforma/proforma.service';
import { RequisitionService } from '../requisition/requisition.service';
import { TransferService } from '../transfer/transfer.service';
import { MaterialService } from '../material/material.service';
import { BarcodeService } from './barcode.service';
import { KalnosticsBranchClient } from '../../integration/clients/kalnostics-branch.client';
import { KalnosticsCommsClient } from '../integration/kalnostics-comms.client';
import {
  BarcodeSheetDto,
  CombinePrintDto,
  EmailDocumentDto,
} from './dto/print.dto';

/** Escape untrusted text for HTML. */
const esc = (v: unknown): string => {
  const s =
    v == null
      ? ''
      : typeof v === 'object'
        ? JSON.stringify(v)
        : (v as string | number | boolean).toString();
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};
const money = (v: unknown): string => Number(v ?? 0).toFixed(2);
const d = (v: unknown): string =>
  v ? new Date(v as string).toLocaleDateString() : '';

const PAGE_CSS = `
  body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:24px;font-size:13px}
  h1{font-size:18px;margin:0 0 4px} .muted{color:#666}
  table{width:100%;border-collapse:collapse;margin-top:12px}
  th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
  th{background:#f5f5f5} .right{text-align:right}
  .totals{margin-top:12px;width:280px;margin-left:auto}
  .totals td{border:none;padding:2px 8px}
  @media print{.noprint{display:none}}
`;

function docShell(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(
    title,
  )}</title><style>${PAGE_CSS}</style></head><body>${body}</body></html>`;
}

/**
 * Generates printable HTML documents (invoices, receipts, purchase orders,
 * product labels). The frontend fetches the HTML (auth-aware) and prints it —
 * no server-side browser/PDF engine required. Barcodes/QR are inline.
 */
@Injectable()
export class PrintService {
  constructor(
    private readonly saleService: SaleService,
    private readonly saleReturnService: SaleReturnService,
    private readonly purchaseService: PurchaseService,
    private readonly productService: ProductService,
    private readonly quoteService: QuoteService,
    private readonly proformaService: ProformaService,
    private readonly requisitionService: RequisitionService,
    private readonly transferService: TransferService,
    private readonly materialService: MaterialService,
    private readonly barcode: BarcodeService,
    private readonly branchClient: KalnosticsBranchClient,
    private readonly comms: KalnosticsCommsClient,
  ) {}

  /** Resolve a branch display name best-effort (falls back to the id, then ''). */
  private async branchName(id: string | null): Promise<string> {
    if (!id) return '';
    try {
      const branch = await this.branchClient.findById(id);
      return (branch as { name?: string }).name ?? id;
    } catch {
      return id;
    }
  }

  /** Build the printable HTML for a sale/purchase/quote/proforma by type. */
  private documentHtml(
    type: EmailDocumentDto['type'],
    id: string,
    tenantId: string,
  ): Promise<string> {
    switch (type) {
      case 'sale':
        return this.saleInvoice(id, tenantId);
      case 'sale_return':
        return this.saleReturn(id, tenantId);
      case 'purchase':
        return this.purchaseOrder(id, tenantId);
      case 'quote':
        return this.quote(id, tenantId);
      case 'proforma':
        return this.proforma(id, tenantId);
      case 'requisition':
        return this.requisition(id, tenantId);
      case 'transfer':
        return this.transfer(id, tenantId);
    }
  }

  /**
   * Email a document as an HTML attachment through the kalnostics comms gateway.
   * The inventory backend has no mail transport of its own; the caller's Bearer
   * token is forwarded so the message is composed in their tenant/branch context.
   * @param bearerToken the caller's `Authorization` header value.
   */
  async emailDocument(
    bearerToken: string,
    tenantId: string,
    dto: EmailDocumentDto,
  ): Promise<{ sent: true }> {
    const html = await this.documentHtml(dto.type, dto.id, tenantId);
    const labels: Record<EmailDocumentDto['type'], string> = {
      sale: 'Invoice',
      sale_return: 'Sale return',
      purchase: 'Purchase order',
      quote: 'Quotation',
      proforma: 'Proforma invoice',
      requisition: 'Requisition',
      transfer: 'Stock transfer',
    };
    const label = labels[dto.type];
    // Internal movement docs aren't "from a supplier" — default to the plain label.
    const internalDoc = dto.type === 'requisition' || dto.type === 'transfer';
    const subject =
      dto.subject ?? (internalDoc ? label : `${label} from your supplier`);
    const body =
      dto.message ?? `Please find your ${label.toLowerCase()} attached.`;
    const attachments = [
      {
        name: `${dto.type}-${dto.id}.html`,
        type: 'text/html',
        data: Buffer.from(html, 'utf8').toString('base64'),
      },
    ];
    const split = (s?: string) =>
      (s ?? '')
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
    const cc = split(dto.cc);
    const bcc = split(dto.bcc);

    // Primary send: the main recipient + any CC (all visible on one message).
    await this.comms.sendEmail(bearerToken, {
      subject,
      body,
      recipients: [
        { toAddress: dto.to },
        ...cc.map((toAddress) => ({ toAddress })),
      ],
      attachments,
    });

    // BCC: the gateway can't hide recipients, so each BCC gets its own copy —
    // which keeps them hidden from each other and from the main/CC recipients.
    for (const toAddress of bcc) {
      await this.comms.sendEmail(bearerToken, {
        subject,
        body,
        recipients: [{ toAddress }],
        attachments,
      });
    }
    return { sent: true };
  }

  /** Shared line-items + totals document (quotes, proformas). */
  private lineDoc(
    title: string,
    doc: {
      reference: string;
      date: Date;
      grandTotal: Prisma.Decimal | number;
      items: {
        productName: string;
        quantity: Prisma.Decimal | number;
        unitPrice: Prisma.Decimal | number;
        subtotal: Prisma.Decimal | number;
      }[];
    },
  ): string {
    const rows = doc.items
      .map(
        (i) =>
          `<tr><td>${esc(i.productName)}</td><td class="right">${money(i.quantity)}</td><td class="right">${money(i.unitPrice)}</td><td class="right">${money(i.subtotal)}</td></tr>`,
      )
      .join('');
    const body = `
      <h1>${esc(title)}</h1>
      <div class="muted">${esc(doc.reference)} · ${d(doc.date)}</div>
      <table><thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Price</th><th class="right">Subtotal</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <table class="totals"><tr><td>Grand total</td><td class="right">${money(doc.grandTotal)}</td></tr></table>`;
    return docShell(`${title} ${doc.reference}`, body);
  }

  /**
   * A full stock-movement document (requisition / transfer), EZHT `view.php` parity:
   * header + from/to branch & department, a Code128 barcode + QR of the reference,
   * a per-line table (product+code, batch/serial, expiry, qty, and — when priced —
   * unit price, discount, tax, subtotal) and a totals block. Used for in-app Print
   * and as the emailed attachment.
   */
  private async movementDoc(opts: {
    title: string;
    reference: string;
    date: Date;
    status: string;
    fromName: string;
    toName: string;
    fromDept?: string | null;
    toDept?: string | null;
    biller?: string | null;
    items: {
      productName: string;
      productCode?: string | null;
      batchNo?: string | null;
      serialNo?: string | null;
      expiryDate?: Date | null;
      quantity: Prisma.Decimal | number;
      unitPrice?: Prisma.Decimal | number | null;
      discount?: Prisma.Decimal | number | null;
      taxAmount?: Prisma.Decimal | number | null;
      subtotal?: Prisma.Decimal | number | null;
    }[];
    totals: [string, Prisma.Decimal | number | null][];
    note?: string | null;
  }): Promise<string> {
    const barcodeSvg = this.barcode.code128Svg(opts.reference);
    const qr = await this.barcode.qrDataUrl(opts.reference);
    const priced = opts.items.some((i) => i.unitPrice != null);
    const rows = opts.items
      .map(
        (i, idx) => `<tr>
          <td>${idx + 1}</td>
          <td>${esc(i.productName)}${i.productCode ? ` <span class="muted">(${esc(i.productCode)})</span>` : ''}</td>
          <td>${esc(i.batchNo ?? i.serialNo ?? '—')}</td>
          <td>${i.expiryDate ? d(i.expiryDate) : '—'}</td>
          <td class="right">${money(i.quantity)}</td>
          ${
            priced
              ? `<td class="right">${money(i.unitPrice)}</td>
                 <td class="right">${money(i.discount)}</td>
                 <td class="right">${money(i.taxAmount)}</td>
                 <td class="right">${money(i.subtotal)}</td>`
              : ''
          }
        </tr>`,
      )
      .join('');
    const totalsList = opts.totals.filter(([, v]) => v != null);
    const totalsRows = totalsList
      .map(([label, v], i) => {
        const last = i === totalsList.length - 1;
        const cell = (s: string) => (last ? `<b>${s}</b>` : s);
        return `<tr><td>${cell(esc(label))}</td><td class="right">${cell(money(v))}</td></tr>`;
      })
      .join('');
    const body = `
      <table style="border:none;margin:0"><tr>
        <td style="border:none;padding:0;vertical-align:top">
          <h1>${esc(opts.title)} ${esc(opts.reference)}</h1>
          <div class="muted">Date: ${d(opts.date)} · Status: ${esc(opts.status)}</div>
        </td>
        <td style="border:none;padding:0;text-align:right;vertical-align:top">
          ${barcodeSvg}<br/><img src="${qr}" alt="QR" style="height:72px" />
        </td>
      </tr></table>
      <table style="margin-top:8px"><tr>
        <td style="border:none;width:50%;vertical-align:top">
          <div class="muted"><b>From</b></div><div>${esc(opts.fromName || '—')}</div>
          ${opts.fromDept ? `<div class="muted">${esc(opts.fromDept)}</div>` : ''}
          ${opts.biller ? `<div class="muted">Biller: ${esc(opts.biller)}</div>` : ''}
        </td>
        <td style="border:none;width:50%;vertical-align:top">
          <div class="muted"><b>To</b></div><div>${esc(opts.toName || '—')}</div>
          ${opts.toDept ? `<div class="muted">${esc(opts.toDept)}</div>` : ''}
        </td>
      </tr></table>
      <table>
        <thead><tr>
          <th>#</th><th>Product</th><th>Batch/Serial</th><th>Expiry</th><th class="right">Qty</th>
          ${priced ? '<th class="right">Unit Price</th><th class="right">Discount</th><th class="right">Tax</th><th class="right">Subtotal</th>' : ''}
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${totalsRows ? `<table class="totals">${totalsRows}</table>` : ''}
      ${opts.note ? `<p class="muted" style="margin-top:12px">Note: ${esc(opts.note)}</p>` : ''}`;
    return docShell(`${opts.title} ${opts.reference}`, body);
  }

  /** Quotation print. */
  async quote(id: string, tenantId: string): Promise<string> {
    const q = await this.quoteService.findById(id, tenantId);
    return this.lineDoc('Quotation', q);
  }

  /** Proforma invoice print. */
  async proforma(id: string, tenantId: string): Promise<string> {
    const p = await this.proformaService.findById(id, tenantId);
    return this.lineDoc('Proforma Invoice', p);
  }

  /** Requisition print (EZHT `requisitions/view` layout). */
  async requisition(id: string, tenantId: string): Promise<string> {
    const r = await this.requisitionService.findById(id, tenantId);
    const [fromName, toName] = await Promise.all([
      this.branchName(r.fromBranchId),
      this.branchName(r.branchId),
    ]);
    return this.movementDoc({
      title: 'Requisition',
      reference: r.reference,
      date: r.date,
      status: r.status,
      fromName,
      toName,
      fromDept: r.fromDepartmentName,
      toDept: r.toDepartmentName,
      biller: r.billerName,
      items: r.items.map((it) => ({
        productName: it.productName,
        productCode: it.productCode,
        batchNo: it.batchNo,
        serialNo: it.serialNo,
        expiryDate: it.expiryDate,
        quantity: it.quantity,
        unitPrice: it.netUnitPrice,
        discount: it.discount,
        taxAmount: it.taxAmount,
        subtotal: it.subtotal,
      })),
      totals: [
        ['Subtotal', r.subtotal],
        ['Product discount', r.productDiscount],
        ['Order discount', r.orderDiscount],
        ['Tax', r.totalTax],
        ['Shipping', r.shipping],
        ['Grand total', r.grandTotal],
      ],
      note: r.note,
    });
  }

  /** Transfer note print (EZHT `transfers/view` layout). */
  async transfer(id: string, tenantId: string): Promise<string> {
    const t = await this.transferService.findById(id, tenantId);
    const [fromName, toName] = await Promise.all([
      this.branchName(t.fromBranchId),
      this.branchName(t.toBranchId),
    ]);
    return this.movementDoc({
      title: 'Stock Transfer',
      reference: t.reference,
      date: t.date,
      status: t.status,
      fromName,
      toName,
      fromDept: t.fromDepartment,
      toDept: t.toDepartment,
      items: t.items.map((it) => ({
        productName: it.productName,
        productCode: it.productCode,
        batchNo: it.batchNo,
        serialNo: it.productSerial,
        expiryDate: it.expiryDate,
        quantity: it.quantity,
        unitPrice: it.rate,
        discount: null,
        taxAmount: it.taxAmount,
        subtotal: it.subtotal,
      })),
      totals: [
        ['Total', t.total],
        ['Product tax', t.totalTax],
        ['Shipping', t.shipping],
        ['Grand total', t.grandTotal],
      ],
      note: t.note,
    });
  }

  /** Sale-return note print (items + grand total). */
  async saleReturn(id: string, tenantId: string): Promise<string> {
    const r = await this.saleReturnService.findById(id, tenantId);
    return this.lineDoc('Sale Return', {
      reference: r.reference,
      date: r.date,
      grandTotal: r.grandTotal,
      items: r.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.price,
        subtotal: i.subtotal,
      })),
    });
  }

  /** Material detail print. */
  async material(id: string, tenantId: string): Promise<string> {
    const m = await this.materialService.findById(id, tenantId);
    const body = `
      <h1>Material</h1>
      <div class="muted">${esc(m.name)}${m.code ? ` · ${esc(m.code)}` : ''}</div>
      <table>
        <tr><th>Category</th><td>${esc(m.category ?? '—')}</td></tr>
        <tr><th>Unit</th><td>${esc(m.unit ?? '—')}</td></tr>
        <tr><th>Quantity</th><td>${money(m.quantity)}</td></tr>
        <tr><th>Cost</th><td>${money(m.cost)}</td></tr>
      </table>`;
    return docShell(`Material ${m.name}`, body);
  }

  /**
   * A full-page sales invoice. The `template` selects a layout variant (legacy
   * receipt/tax-invoice template choice):
   * - `standard` (default): full breakdown (subtotal, tax, discount, shipping).
   * - `tax`: titled "Tax Invoice" with the same breakdown.
   * - `simple`: items + grand total + paid only.
   */
  async saleInvoice(
    id: string,
    tenantId: string,
    template?: string,
  ): Promise<string> {
    const tpl = ['standard', 'tax', 'simple'].includes(template ?? '')
      ? (template as 'standard' | 'tax' | 'simple')
      : 'standard';
    const s = await this.saleService.findById(id, tenantId);
    const rows = s.items
      .map(
        (i) =>
          `<tr><td>${esc(i.productName)}</td><td class="right">${money(i.quantity)}</td><td class="right">${money(i.price)}</td><td class="right">${money(i.subtotal)}</td></tr>`,
      )
      .join('');
    const heading = tpl === 'tax' ? 'Tax Invoice' : 'Invoice';
    const totals =
      tpl === 'simple'
        ? `<table class="totals">
        <tr><td><b>Grand total</b></td><td class="right"><b>${money(s.grandTotal)}</b></td></tr>
        <tr><td>Paid</td><td class="right">${money(s.paid)}</td></tr>
      </table>`
        : `<table class="totals">
        <tr><td>Subtotal</td><td class="right">${money(s.subtotal)}</td></tr>
        <tr><td>Tax</td><td class="right">${money(s.orderTax)}</td></tr>
        <tr><td>Discount</td><td class="right">${money(s.orderDiscount)}</td></tr>
        <tr><td>Shipping</td><td class="right">${money(s.shipping)}</td></tr>
        <tr><td><b>Grand total</b></td><td class="right"><b>${money(s.grandTotal)}</b></td></tr>
        <tr><td>Paid</td><td class="right">${money(s.paid)}</td></tr>
      </table>`;
    const body = `
      <h1>${heading} ${esc(s.reference)}</h1>
      <div class="muted">Date: ${d(s.date)} · Customer: ${esc(s.customer?.name ?? '')}</div>
      <table><thead><tr><th>Product</th><th class="right">Qty</th><th class="right">Price</th><th class="right">Subtotal</th></tr></thead><tbody>${rows}</tbody></table>
      ${totals}`;
    return docShell(`${heading} ${s.reference}`, body);
  }

  /** A compact thermal-style POS receipt. */
  async saleReceipt(id: string, tenantId: string): Promise<string> {
    const s = await this.saleService.findById(id, tenantId);
    const rows = s.items
      .map(
        (i) =>
          `<tr><td>${esc(i.productName)}</td><td class="right">${money(i.quantity)}×${money(i.price)}</td><td class="right">${money(i.subtotal)}</td></tr>`,
      )
      .join('');
    const body = `
      <div style="width:280px;margin:0 auto;font-size:12px">
        <h1 style="text-align:center;font-size:15px">Receipt</h1>
        <div class="muted" style="text-align:center">${esc(s.reference)} · ${d(s.date)}</div>
        <table>${rows}</table>
        <table class="totals" style="width:100%">
          <tr><td><b>Total</b></td><td class="right"><b>${money(s.grandTotal)}</b></td></tr>
          <tr><td>Paid</td><td class="right">${money(s.paid)}</td></tr>
        </table>
        <p style="text-align:center" class="muted">Thank you!</p>
      </div>`;
    return docShell(`Receipt ${s.reference}`, body);
  }

  /**
   * A purchase-order document for the supplier (EZHT `purchases/pdf`). Mirrors the
   * legacy content: supplier + warehouse details, per-line pack columns (batch,
   * expiry, pack size/qty, rate, MRP, discount, tax), the full totals breakdown
   * (product/order discount, GST split or order tax, shipping, roundoff, grand
   * total) and the payment history with the outstanding balance.
   */
  async purchaseOrder(id: string, tenantId: string): Promise<string> {
    const p = await this.purchaseService.getDetail(id, tenantId);
    const packSize = (i: { packSize: Prisma.Decimal | number | null }) =>
      Number(i.packSize) || 1;
    const rows = p.items
      .map((i) => {
        const size = packSize(i);
        return `<tr>
          <td>${esc(i.productName)}${i.productCode ? ` (${esc(i.productCode)})` : ''}</td>
          <td>${esc(i.batchNo ?? '—')}</td>
          <td>${i.expiryDate ? d(i.expiryDate) : '—'}</td>
          <td class="right">${i.packSize != null ? money(i.packSize) : '—'}</td>
          <td class="right">${i.packQuantity != null ? money(i.packQuantity) : '—'}</td>
          <td class="right">${i.freePackQuantity != null ? money(i.freePackQuantity) : '—'}</td>
          <td class="right">${money(Number(i.cost) * size)}</td>
          <td class="right">${i.mrp != null ? money(Number(i.mrp) * size) : '—'}</td>
          <td class="right">${money(i.discount)}</td>
          <td class="right">${money(i.taxAmount)}</td>
          <td class="right">${money(i.subtotal)}</td>
        </tr>`;
      })
      .join('');
    const sup = p.supplier as {
      name?: string;
      companyName?: string | null;
      phone?: string | null;
      email?: string | null;
      address?: string | null;
      gstNo?: string | null;
    } | null;
    const supplierBlock = `
      <div><b>${esc(sup?.name ?? '')}</b></div>
      ${sup?.companyName ? `<div>${esc(sup.companyName)}</div>` : ''}
      ${sup?.address ? `<div class="muted">${esc(sup.address)}</div>` : ''}
      ${sup?.phone ? `<div class="muted">Phone: ${esc(sup.phone)}</div>` : ''}
      ${sup?.email ? `<div class="muted">Email: ${esc(sup.email)}</div>` : ''}
      ${sup?.gstNo ? `<div class="muted">GST: ${esc(sup.gstNo)}</div>` : ''}`;
    const gstRows =
      p.taxMethod === 'igst'
        ? `<tr><td>IGST</td><td class="right">${money(p.igst)}</td></tr>`
        : `<tr><td>CGST</td><td class="right">${money(p.cgst)}</td></tr>
           <tr><td>SGST</td><td class="right">${money(p.sgst)}</td></tr>`;
    const balance = Number(p.grandTotal) - Number(p.paid);
    const paymentRows = (p.payments ?? [])
      .map(
        (pay) =>
          `<tr><td>${d(pay.date)}</td><td>${esc(pay.reference ?? '—')}</td><td>${esc(pay.method)}</td><td class="right">${money(pay.amount)}</td></tr>`,
      )
      .join('');
    const body = `
      <h1>Purchase Order ${esc(p.reference)}</h1>
      <div class="muted">Date: ${d(p.date)} · Status: ${esc(p.status)} · Payment: ${esc(p.paymentStatus)}</div>
      <table style="margin-top:12px"><tr>
        <td style="vertical-align:top;border:none;padding:0 16px 0 0;width:50%">
          <div class="muted"><b>Supplier</b></div>${supplierBlock}
        </td>
        <td style="vertical-align:top;border:none;padding:0;width:50%">
          <div class="muted"><b>Warehouse</b></div>
          <div>${esc(p.warehouse?.name ?? '—')}</div>
          ${p.gstNumber ? `<div class="muted">GST: ${esc(p.gstNumber)}</div>` : ''}
        </td>
      </tr></table>
      <table>
        <thead><tr>
          <th>Product</th><th>Batch</th><th>Expiry</th>
          <th class="right">Pack Size</th><th class="right">Pack Qty</th><th class="right">Free</th>
          <th class="right">Rate</th><th class="right">MRP</th><th class="right">Discount</th>
          <th class="right">Tax</th><th class="right">Subtotal</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <table class="totals">
        <tr><td>Subtotal</td><td class="right">${money(p.subtotal)}</td></tr>
        <tr><td>Product discount</td><td class="right">${money(p.productDiscount)}</td></tr>
        <tr><td>Order discount</td><td class="right">${money(p.orderDiscount)}</td></tr>
        ${gstRows}
        <tr><td>Order tax</td><td class="right">${money(p.orderTax)}</td></tr>
        <tr><td>Shipping</td><td class="right">${money(p.shipping)}</td></tr>
        <tr><td>Roundoff</td><td class="right">${money(p.roundoff)}</td></tr>
        <tr><td><b>Grand total</b></td><td class="right"><b>${money(p.grandTotal)}</b></td></tr>
        <tr><td>Paid</td><td class="right">${money(p.paid)}</td></tr>
        <tr><td>Balance</td><td class="right">${money(balance)}</td></tr>
      </table>
      ${
        paymentRows
          ? `<h3 style="margin-top:16px">Payments</h3>
             <table><thead><tr><th>Date</th><th>Reference</th><th>Paid By</th><th class="right">Amount</th></tr></thead>
             <tbody>${paymentRows}</tbody></table>`
          : ''
      }
      ${p.note ? `<p class="muted" style="margin-top:12px">Note: ${esc(p.note)}</p>` : ''}`;
    return docShell(`PO ${p.reference}`, body);
  }

  /**
   * Combine several purchase orders or sales invoices into one printable file,
   * each on its own page (legacy Purchases/Sales "combine_pdf").
   */
  async combine(tenantId: string, dto: CombinePrintDto): Promise<string> {
    const titles: Record<CombinePrintDto['type'], string> = {
      purchase: 'Purchase Orders',
      sale: 'Invoices',
      quote: 'Quotations',
      proforma: 'Proforma Invoices',
      requisition: 'Requisitions',
      transfer: 'Stock Transfers',
    };
    const title = titles[dto.type];
    const sections: string[] = [];
    for (const id of dto.ids) {
      const html = await this.documentHtml(dto.type, id, tenantId);
      // Extract the <body> contents of each single-document render.
      const match = /<body>([\s\S]*)<\/body>/i.exec(html);
      sections.push(match?.[1] ?? html);
    }
    const body = sections
      .map(
        (s, i) =>
          `<div${i < sections.length - 1 ? ' style="page-break-after:always"' : ''}>${s}</div>`,
      )
      .join('');
    return docShell(title, body);
  }

  /** A product label with a Code 39 barcode + QR code. */
  async productLabel(id: string, tenantId: string): Promise<string> {
    const p = await this.productService.findById(id, tenantId);
    const svg = this.barcode.code39Svg(p.code);
    const qr = await this.barcode.qrDataUrl(p.code);
    const body = `
      <div style="width:300px;border:1px solid #ccc;padding:12px;text-align:center">
        <div style="font-weight:bold">${esc(p.name)}</div>
        <div class="muted">${esc(p.code)} · ${money(p.price)}</div>
        <div style="margin-top:8px">${svg}</div>
        <div class="muted">${esc(p.code)}</div>
        <img src="${qr}" alt="QR" style="margin-top:8px" />
      </div>`;
    return docShell(`Label ${p.code}`, body);
  }

  /**
   * A single product barcode strip (legacy Products::single_barcode) — just the
   * barcode + code + price, without the full label chrome.
   */
  async productBarcode(id: string, tenantId: string): Promise<string> {
    const p = await this.productService.findById(id, tenantId);
    const svg = this.barcode.code39Svg(p.code, 44);
    const body = `
      <div style="display:inline-block;border:1px solid #e5e5e5;border-radius:4px;padding:10px 14px;text-align:center">
        <div style="font-size:11px;font-weight:600">${esc(p.name)}</div>
        <div style="margin:4px 0">${svg}</div>
        <div style="font-size:10px;letter-spacing:1px">${esc(p.code)}</div>
        <div style="font-size:12px;font-weight:700">${money(p.price)}</div>
      </div>`;
    return docShell(`Barcode ${p.code}`, body);
  }

  /**
   * A printable sheet of many barcode labels (legacy Products::print_barcodes).
   * Each selected product is repeated `quantity` times. `style` is the legacy
   * per-sheet count: it fixes the page size (A4 / Letter), label dimensions,
   * columns×rows and barcode height, and the labels are chunked into pages of
   * exactly that many — e.g. 100 labels at style `10` produces 10 pages of 10.
   * Each page container breaks after itself so the print output has one sheet
   * per page. Toggles control whether the business name / product name / price
   * show on each label. Dimensions mirror EZHT `print.css`.
   */
  async barcodeSheet(tenantId: string, dto: BarcodeSheetDto): Promise<string> {
    /** Per-sheet layout, ported from EZHT print.css (.barcode / .barcodea4). */
    const STYLES = {
      '40': {
        page: 'a4',
        cols: 4,
        rows: 10,
        w: '1.95in',
        h: '1.07in',
        margin: '0 0 0 0.06in',
        pt: '0.04in',
        bh: 16,
        fs: '10px',
        lh: '12px',
        nf: '11px',
        nb: false,
      },
      '30': {
        page: 'letter',
        cols: 3,
        rows: 10,
        w: '2.63in',
        h: '1in',
        margin: '0 0.06in',
        pt: '0.04in',
        bh: 18,
        fs: '11px',
        lh: '13px',
        nf: '12px',
        nb: false,
      },
      '24': {
        page: 'a4',
        cols: 3,
        rows: 8,
        w: '2.48in',
        h: '1.335in',
        margin: '0 0 0 0.079in',
        pt: '0.05in',
        bh: 20,
        fs: '12px',
        lh: '14px',
        nf: '14px',
        nb: false,
      },
      '20': {
        page: 'letter',
        cols: 2,
        rows: 10,
        w: '4in',
        h: '1in',
        margin: '0 0.1in',
        pt: '0.05in',
        bh: 20,
        fs: '12px',
        lh: '14px',
        nf: '14px',
        nb: false,
      },
      '18': {
        page: 'a4',
        cols: 3,
        rows: 6,
        w: '2.5in',
        h: '1.835in',
        margin: '0 0 0 0.079in',
        pt: '0.05in',
        bh: 30,
        fs: '13px',
        lh: '20px',
        nf: '14px',
        nb: true,
      },
      '14': {
        page: 'letter',
        cols: 2,
        rows: 7,
        w: '4in',
        h: '1.33in',
        margin: '0 0.1in',
        pt: '0.1in',
        bh: 30,
        fs: '12px',
        lh: '14px',
        nf: '14px',
        nb: false,
      },
      '12': {
        page: 'a4',
        cols: 3,
        rows: 4,
        w: '2.5in',
        h: '2.834in',
        margin: '0 0 0 0.079in',
        pt: '0.05in',
        bh: 50,
        fs: '14px',
        lh: '20px',
        nf: '15px',
        nb: true,
      },
      '10': {
        page: 'letter',
        cols: 2,
        rows: 5,
        w: '4in',
        h: '2in',
        margin: '0 0.1in',
        pt: '0.1in',
        bh: 50,
        fs: '14px',
        lh: '20px',
        nf: '16px',
        nb: false,
      },
    } as const;

    const st = STYLES[dto.style ?? '24'] ?? STYLES['24'];
    const perSheet = st.cols * st.rows;
    const isA4 = st.page === 'a4';
    const containerClass = isA4 ? 'barcodea4' : 'barcode';
    const showName = dto.showName !== false;
    const showPrice = dto.showPrice !== false;
    const showUnit = dto.showUnit === true;
    const showCategory = dto.showCategory === true;
    const showVariants = dto.showVariants === true;
    const showImage = dto.showImage === true;
    const priceLabel = dto.showCurrency
      ? (n: number | { toString(): string }) => `₹${money(n)}`
      : (n: number | { toString(): string }) => money(n);
    const symbology = dto.symbology ?? 'CODE128';

    // Build one label HTML per unit, repeated `quantity` times per product.
    const labels: string[] = [];
    for (const item of dto.items) {
      const p = await this.productService.findById(item.productId, tenantId);
      let code: string;
      if (symbology === 'QR') {
        code = `<img src="${await this.barcode.qrDataUrl(p.code)}" alt="${esc(p.code)}" style="height:${st.bh + 20}px;max-width:100%" />`;
      } else if (symbology === 'CODE39') {
        code = this.barcode.code39Svg(p.code, st.bh);
      } else {
        code = this.barcode.code128Svg(p.code, st.bh);
      }
      const variantNames = (p.variants ?? []).map((v) => v.name).join(', ');
      const qty = Math.max(1, Math.min(item.quantity, 500));
      const label = `
        <div class="item">
          ${dto.showBusinessName && dto.businessName ? `<div class="biz">${esc(dto.businessName)}</div>` : ''}
          ${showImage && p.imageUrl ? `<div class="im"><img src="${esc(p.imageUrl)}" alt="" style="max-height:${st.bh}px;max-width:100%" /></div>` : ''}
          ${showName ? `<div class="nm">${esc(p.name)}</div>` : ''}
          ${showCategory && p.category?.name ? `<div class="ct">${esc(p.category.name)}</div>` : ''}
          <div class="bc">${code}</div>
          <div class="cd">${esc(p.code)}</div>
          ${showVariants && variantNames ? `<div class="vr">${esc(variantNames)}</div>` : ''}
          ${showPrice ? `<div class="pr">Price: ${priceLabel(p.price)}</div>` : ''}
          ${showUnit && p.unit?.name ? `<div class="un">${esc(p.unit.name)}</div>` : ''}
        </div>`;
      for (let i = 0; i < qty; i++) labels.push(label);
    }

    // Chunk into pages of exactly `perSheet` labels; each page is its own sheet.
    const pages: string[] = [];
    for (let i = 0; i < labels.length; i += perSheet) {
      pages.push(
        `<div class="${containerClass}">${labels.slice(i, i + perSheet).join('')}</div>`,
      );
    }
    if (pages.length === 0) pages.push(`<div class="${containerClass}"></div>`);

    const containerCss = isA4
      ? `.barcodea4{width:8.25in;height:11.6in;display:block;border:1px solid #ccc;margin:10px auto;padding:0.1in 0 0 0.1in;box-sizing:border-box;page-break-after:always}`
      : `.barcode{width:8.45in;height:10.3in;display:block;border:1px solid #ccc;margin:10px auto;padding-top:0.1in;box-sizing:border-box;page-break-after:always}`;

    const css = `
      *{box-sizing:border-box}
      html,body{margin:0;padding:0;background:#f3f4f6}
      .${containerClass}:last-child{page-break-after:auto}
      ${containerCss}
      .item{width:${st.w};height:${st.h};margin:${st.margin};padding-top:${st.pt};float:left;display:block;overflow:hidden;text-align:center;border:1px dotted #ccc;font-size:${st.fs};line-height:${st.lh};text-transform:uppercase;box-sizing:border-box}
      .item .biz{font-weight:bold}
      .item .nm{display:block;font-size:${st.nf}${st.nb ? ';font-weight:bold' : ''}}
      .item .bc{display:block;margin:2px 0}
      .item .bc svg,.item .bc img{display:block;margin:0 auto;max-width:100%;height:auto}
      .item .cd{display:block;letter-spacing:1px}
      .item .pr{display:inline-block;font-weight:bold}
      @page{size:${isA4 ? 'A4' : 'Letter'};margin:0}
      @media print{
        html,body{background:#fff}
        .barcode,.barcodea4{margin:0;border:none}
        .item{border:none}
      }
    `;
    const body = pages.join('<div style="clear:both"></div>');
    return `<!doctype html><html><head><meta charset="utf-8"><title>Barcodes</title><style>${css}</style></head><body>${body}</body></html>`;
  }
}
