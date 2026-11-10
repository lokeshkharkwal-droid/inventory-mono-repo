import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import {
  CreateGiftCardDto,
  RedeemGiftCardDto,
  GiftCardQueryDto,
} from './dto/gift-card.dto';

const D = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);

/** 404 — gift card not found. */
export class GiftCardNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'GIFT_CARD_NOT_FOUND',
      'Gift card not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** 409 — gift card code already exists in the tenant. */
export class GiftCardCodeConflictException extends KaltrosException {
  constructor(code: string) {
    super(
      'GIFT_CARD_CODE_CONFLICT',
      'A gift card with this code already exists',
      { code },
      HttpStatus.CONFLICT,
    );
  }
}

/** 409 — redemption exceeds the card balance / card not active. */
export class GiftCardRedeemException extends KaltrosException {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super('GIFT_CARD_REDEEM_ERROR', message, context, HttpStatus.CONFLICT);
  }
}

/** Gift cards with a redeemable balance — tenant-scoped, soft-delete aware. */
@Injectable()
export class GiftCardService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    branchId: string | null,
    dto: CreateGiftCardDto,
  ) {
    const existing = await this.prisma.inventoryGiftCard.findFirst({
      where: { tenantId, code: dto.code, deletedAt: null },
      select: { id: true },
    });
    if (existing) throw new GiftCardCodeConflictException(dto.code);
    return this.prisma.inventoryGiftCard.create({
      data: {
        tenantId,
        branchId,
        code: dto.code,
        value: D(dto.value),
        balance: D(dto.value),
        customerId: dto.customerId,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        status: 'ACTIVE',
        note: dto.note,
      },
    });
  }

  async findAll(
    tenantId: string,
    query: GiftCardQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryGiftCardWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.status) where.status = query.status;
    if (query.search)
      where.code = { contains: query.search, mode: 'insensitive' };

    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryGiftCard.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return [rows, await tx.inventoryGiftCard.count({ where })] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const row = await this.prisma.inventoryGiftCard.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!row) throw new GiftCardNotFoundException(id);
    return row;
  }

  /** Redeem an amount, decrementing the balance (marks USED at zero). */
  async redeem(id: string, tenantId: string, dto: RedeemGiftCardDto) {
    const card = await this.findById(id, tenantId);
    if (card.status !== 'ACTIVE') {
      throw new GiftCardRedeemException('Gift card is not active', {
        status: card.status,
      });
    }
    const amount = D(dto.amount);
    if (amount.gt(card.balance)) {
      throw new GiftCardRedeemException('Amount exceeds the card balance', {
        balance: card.balance.toNumber(),
        amount: dto.amount,
      });
    }
    const newBalance = D(card.balance).sub(amount);
    return this.prisma.inventoryGiftCard.update({
      where: { id },
      data: {
        balance: newBalance,
        status: newBalance.lte(0) ? 'USED' : 'ACTIVE',
      },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryGiftCard.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }
}
