import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SaleService } from '../sale/sale.service';
import { PurchaseService } from '../purchase/purchase.service';
import { ProductService } from '../product/product.service';
import { QuoteService } from '../quote/quote.service';
import { ProformaService } from '../proforma/proforma.service';
import { RequisitionService } from '../requisition/requisition.service';
import { TransferService } from '../transfer/transfer.service';
import { MaterialService } from '../material/material.service';
import { BarcodeService } from './barcode.service';
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
    private readonly purchaseService: PurchaseService,
    private readonly productService: ProductService,
    private readonly quoteService: QuoteService,
    private readonly proformaService: ProformaService,
    private readonly requisitionService: RequisitionService,
    private readonly transferService: TransferService,
    private readonly materialService: MaterialService,
    private readonly barcode: BarcodeService,
    private readonly comms: KalnosticsCommsClient,
  ) {}

  /** Build the printable HTML for a sale/purchase/quote/proforma by type. */
  private documentHtml(
    type: EmailDocumentDto['type'],
    id: string,
    tenantId: string,
  ): Promise<string> {
    switch (type) {
      case 'sale':
        return this.saleInvoice(id, tenantId);
      case 'purchase':
        return this.purchaseOrder(id, tenantId);
      case 'quote':
        return this.quote(id, tenantId);
      case 'proforma':
        return this.proforma(id, tenantId);
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
    const label =
      dto.type === 'sale'
        ? 'Invoice'
        : dto.type === 'purchase'
          ? 'Purchase order'
          : dto.type === 'quote'
            ? 'Quotation'
            : 'Proforma invoice';
    const subject = dto.subject ?? `${label} from your supplier`;
    const body =
      dto.message ?? `Please find your ${label.toLowerCase()} attached.`;
    await this.comms.sendEmail(bearerToken, {
      subject,
      body,
      recipients: [{ toAddress: dto.to }],
      attachments: [
        {
          name: `${dto.type}-${dto.id}.html`,
          type: 'text/html',
          data: Buffer.from(html, 'utf8').toString('base64'),
        },
      ],
    });
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

  /** Simple qty-only movement document (requisitions, transfers). */
  private qtyDoc(
    title: string,
    doc: {
      reference: string;
      date: Date;
      items: { productName: string; quantity: Prisma.Decimal | number }[];
    },
  ): string {
    const rows = doc.items
      .map(
        (i) =>
          `<tr><td>${esc(i.productName)}</td><td class="right">${money(i.quantity)}</td></tr>`,
      )
      .join('');
    const body = `
      <h1>${esc(title)}</h1>
      <div class="muted">${esc(doc.reference)} · ${d(doc.date)}</div>
      <table><thead><tr><th>Item</th><th class="right">Qty</th></tr></thead>
      <tbody>${rows}</tbody></table>`;
    return docShell(`${title} ${doc.reference}`, body);
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

  /** Requisition print. */
  async requisition(id: string, tenantId: string): Promise<string> {
    const r = await this.requisitionService.findById(id, tenantId);
    return this.qtyDoc('Requisition', r);
  }

  /** Transfer note print. */
  async transfer(id: string, tenantId: string): Promise<string> {
    const t = await this.transferService.findById(id, tenantId);
    return this.qtyDoc('Stock Transfer', t);
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

  /** A purchase-order document for the supplier. */
  async purchaseOrder(id: string, tenantId: string): Promise<string> {
    const p = await this.purchaseService.findById(id, tenantId);
    const rows = p.items
      .map(
        (i) =>
          `<tr><td>${esc(i.productName)}</td><td class="right">${money(i.quantity)}</td><td class="right">${money(i.cost)}</td><td class="right">${money(i.subtotal)}</td></tr>`,
      )
      .join('');
    const body = `
      <h1>Purchase order ${esc(p.reference)}</h1>
      <div class="muted">Date: ${d(p.date)} · Supplier: ${esc(p.supplier?.name ?? '')}</div>
      <table><thead><tr><th>Product</th><th class="right">Qty</th><th class="right">Cost</th><th class="right">Subtotal</th></tr></thead><tbody>${rows}</tbody></table>
      <table class="totals">
        <tr><td>Subtotal</td><td class="right">${money(p.subtotal)}</td></tr>
        <tr><td>Tax</td><td class="right">${money(p.orderTax)}</td></tr>
        <tr><td><b>Grand total</b></td><td class="right"><b>${money(p.grandTotal)}</b></td></tr>
      </table>`;
    return docShell(`PO ${p.reference}`, body);
  }

  /**
   * Combine several purchase orders or sales invoices into one printable file,
   * each on its own page (legacy Purchases/Sales "combine_pdf").
   */
  async combine(tenantId: string, dto: CombinePrintDto): Promise<string> {
    const title = dto.type === 'purchase' ? 'Purchase Orders' : 'Invoices';
    const sections: string[] = [];
    for (const id of dto.ids) {
      const html =
        dto.type === 'purchase'
          ? await this.purchaseOrder(id, tenantId)
          : await this.saleInvoice(id, tenantId);
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
   * A printable sheet of many barcode labels (legacy Products::print_barcodes).
   * Each selected product is repeated `quantity` times; `style` sets the label
   * size; toggles control whether the business name / product name / price show.
   */
  async barcodeSheet(tenantId: string, dto: BarcodeSheetDto): Promise<string> {
    const SIZES: Record<string, { w: number; bh: number }> = {
      '20': { w: 140, bh: 24 },
      '30': { w: 170, bh: 32 },
      '40': { w: 210, bh: 42 },
      '50': { w: 250, bh: 52 },
    };
    const sz = SIZES[dto.style ?? '40'] ?? SIZES['40']!;
    const showName = dto.showName !== false;
    const showPrice = dto.showPrice !== false;
    const useQr = dto.symbology === 'QR';

    const labels: string[] = [];
    for (const item of dto.items) {
      const p = await this.productService.findById(item.productId, tenantId);
      const code = useQr
        ? `<img src="${await this.barcode.qrDataUrl(p.code)}" alt="${esc(p.code)}" style="height:${sz.bh + 20}px" />`
        : this.barcode.code39Svg(p.code, sz.bh);
      const qty = Math.max(1, Math.min(item.quantity, 500));
      const label = `
        <div class="lbl" style="width:${sz.w}px">
          ${dto.showBusinessName && dto.businessName ? `<div class="biz">${esc(dto.businessName)}</div>` : ''}
          ${showName ? `<div class="nm">${esc(p.name)}</div>` : ''}
          <div class="bc">${code}</div>
          <div class="cd">${esc(p.code)}</div>
          ${showPrice ? `<div class="pr">${money(p.price)}</div>` : ''}
        </div>`;
      for (let i = 0; i < qty; i++) labels.push(label);
    }

    const css = `
      body{font-family:Arial,Helvetica,sans-serif;margin:12px;color:#111}
      .sheet{display:flex;flex-wrap:wrap;gap:6px}
      .lbl{border:1px solid #e5e5e5;border-radius:4px;padding:6px 8px;text-align:center;box-sizing:border-box}
      .lbl .biz{font-size:9px;color:#555}
      .lbl .nm{font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .lbl .bc{margin:3px 0}
      .lbl .cd{font-size:10px;letter-spacing:1px}
      .lbl .pr{font-size:12px;font-weight:700}
      @media print{.lbl{border-color:#fff}}
    `;
    const body = `<div class="sheet">${labels.join('')}</div>`;
    return `<!doctype html><html><head><meta charset="utf-8"><title>Barcodes</title><style>${css}</style></head><body>${body}</body></html>`;
  }
}
