import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SaleService } from '../sale/sale.service';
import { ProductService } from '../product/product.service';
import { SettingsService } from '../settings/settings.service';
import { BranchRequiredException } from '../product/exceptions/product.exceptions';
import {
  CloseSessionDto,
  CreateRegisterDto,
  OpenSessionDto,
  PosCheckoutDto,
  HoldBillDto,
} from './dto/pos.dto';
import {
  NoOpenSessionException,
  RegisterAlreadyOpenException,
  RegisterNotFoundException,
  SessionClosedException,
  SessionNotFoundException,
} from './exceptions/pos.exceptions';

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);

/**
 * Point of sale: registers (tills), open/close sessions with cash
 * reconciliation, and checkout — which reuses SaleService so a POS sale moves
 * stock and records payments exactly like a back-office sale, additionally
 * linked to the register session.
 */
@Injectable()
export class PosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly saleService: SaleService,
    private readonly productService: ProductService,
    private readonly settingsService: SettingsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Verify the POS cashier PIN against the tenant's configured PIN. If no PIN is
   * configured, access is allowed (valid=true, configured=false).
   */
  async verifyPin(
    tenantId: string,
    pin: string,
  ): Promise<{ valid: boolean; configured: boolean }> {
    const posPin = await this.settingsService.getPosPin(tenantId);
    const configured = !!posPin;
    return { configured, valid: !configured || posPin === pin };
  }

  /**
   * Report configured payment gateways and their balances. Balances require a
   * live gateway integration (not wired); `configured` reflects whether API
   * credentials are present in the environment.
   */
  gatewayBalances(): {
    gateway: string;
    configured: boolean;
    balance: number | null;
  }[] {
    return [
      {
        gateway: 'PayPal',
        configured: !!this.config.get<string>('PAYPAL_CLIENT_ID'),
        balance: null,
      },
      {
        gateway: 'Stripe',
        configured: !!this.config.get<string>('STRIPE_SECRET_KEY'),
        balance: null,
      },
    ];
  }

  // ── Held bills (suspend/resume) + serial lookup ─────────────────────────────
  /** Suspend the current cart for later pickup. */
  async holdBill(
    tenantId: string,
    branchId: string | null,
    dto: HoldBillDto,
    actorId?: string,
  ) {
    return this.prisma.inventoryPosHeldBill.create({
      data: {
        tenantId,
        branchId,
        label: dto.label,
        cart: dto.cart as Prisma.InputJsonValue,
        createdBy: actorId,
      },
    });
  }

  /** List held bills for the active branch. */
  async listHeldBills(tenantId: string, branchId: string | null) {
    return this.prisma.inventoryPosHeldBill.findMany({
      where: { tenantId, deletedAt: null, ...(branchId ? { branchId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Remove a held bill (after resuming or discarding). */
  async deleteHeldBill(id: string, tenantId: string) {
    return this.prisma.inventoryPosHeldBill.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  /** Look up a product by a serial number (scanner flow). */
  async serialLookup(tenantId: string, serial: string) {
    const found = await this.productService.findBySerial(tenantId, serial);
    if (!found) return { found: false };
    return { found: true, serial: found.serialNo, product: found.product };
  }

  // ── Registers ──────────────────────────────────────────────────────────────
  async createRegister(
    tenantId: string,
    branchId: string | null,
    dto: CreateRegisterDto,
  ) {
    if (!branchId) throw new BranchRequiredException();
    return this.prisma.inventoryPosRegister.create({
      data: { tenantId, branchId, name: dto.name },
    });
  }

  async listRegisters(tenantId: string, branchId: string | null) {
    return this.prisma.inventoryPosRegister.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(branchId ? { branchId } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  // ── Sessions ───────────────────────────────────────────────────────────────
  async openSession(
    tenantId: string,
    branchId: string | null,
    dto: OpenSessionDto,
    actorId?: string,
  ) {
    if (!branchId) throw new BranchRequiredException();
    const register = await this.prisma.inventoryPosRegister.findFirst({
      where: { id: dto.registerId, tenantId, deletedAt: null },
    });
    if (!register) throw new RegisterNotFoundException(dto.registerId);

    const open = await this.prisma.inventoryPosRegisterSession.findFirst({
      where: { tenantId, registerId: dto.registerId, status: 'OPEN' },
    });
    if (open) throw new RegisterAlreadyOpenException(dto.registerId);

    return this.prisma.inventoryPosRegisterSession.create({
      data: {
        tenantId,
        branchId,
        registerId: dto.registerId,
        status: 'OPEN',
        openingCash: D(dto.openingCash ?? 0),
        openedBy: actorId,
      },
    });
  }

  /** The current OPEN session for a branch, or null. */
  async currentSession(tenantId: string, branchId: string | null) {
    if (!branchId) return null;
    return this.prisma.inventoryPosRegisterSession.findFirst({
      where: { tenantId, branchId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });
  }

  async closeSession(
    id: string,
    tenantId: string,
    dto: CloseSessionDto,
    actorId?: string,
  ) {
    const session = await this.prisma.inventoryPosRegisterSession.findFirst({
      where: { id, tenantId },
    });
    if (!session) throw new SessionNotFoundException(id);
    if (session.status === 'CLOSED') throw new SessionClosedException(id);

    // Expected cash = opening float + cash tendered on this session's sales.
    const cashPayments = await this.prisma.inventorySalePayment.findMany({
      where: { tenantId, method: 'CASH', sale: { posSessionId: id } },
      select: { amount: true },
    });
    const cashSales = cashPayments.reduce((s, p) => s.add(p.amount), D(0));
    const expectedCash = D(session.openingCash).add(cashSales);

    return this.prisma.inventoryPosRegisterSession.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closingCash: D(dto.closingCash),
        expectedCash,
        closedBy: actorId,
        closedAt: new Date(),
        note: dto.note,
      },
    });
  }

  // ── Checkout ───────────────────────────────────────────────────────────────
  /**
   * Ring up a sale through POS: create the sale (stock out via SaleService),
   * link it to the open register session, and record the tendered payments.
   */
  async checkout(
    tenantId: string,
    branchId: string | null,
    dto: PosCheckoutDto,
    actorId?: string,
  ) {
    if (!branchId) throw new BranchRequiredException();
    const session =
      (dto.sessionId
        ? await this.prisma.inventoryPosRegisterSession.findFirst({
            where: { id: dto.sessionId, tenantId, status: 'OPEN' },
          })
        : await this.currentSession(tenantId, branchId)) ?? null;
    if (!session) throw new NoOpenSessionException();

    const sale = await this.saleService.create(
      tenantId,
      branchId,
      {
        customerId: dto.customerId,
        orderDiscount:
          dto.orderDiscount == null ? undefined : String(dto.orderDiscount),
        note: dto.note,
        items: dto.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          price: i.price,
          taxRate: i.taxRate,
          discount: i.discount == null ? undefined : String(i.discount),
        })),
      },
      actorId,
    );

    await this.prisma.inventorySale.update({
      where: { id: sale.id },
      data: { posSessionId: session.id },
    });

    for (const p of dto.payments) {
      await this.saleService.addPayment(
        sale.id,
        tenantId,
        {
          amount: p.amount,
          method: p.method ?? 'CASH',
          reference: p.reference,
        },
        actorId,
      );
    }

    return this.saleService.findById(sale.id, tenantId);
  }

  // ── Product lookup ───────────────────────────────────────────────────────────
  /** Fast product lookup for the POS grid (by code/name). */
  async lookup(tenantId: string, search?: string) {
    const result = await this.productService.findAll(tenantId, {
      page: 1,
      limit: 50,
      search,
      status: 'active',
    });
    return result.data;
  }
}
