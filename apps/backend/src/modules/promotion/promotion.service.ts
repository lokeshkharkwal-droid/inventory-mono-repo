import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import {
  CreatePromotionDto,
  UpdatePromotionDto,
  PromotionQueryDto,
} from './dto/promotion.dto';

class PromotionNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'PROMOTION_NOT_FOUND',
      'Promotion not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** Marketing promotions / banners (legacy Welcome promotions) — tenant-scoped. */
@Injectable()
export class PromotionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreatePromotionDto) {
    return this.prisma.inventoryPromotion.create({
      data: {
        tenantId,
        title: dto.title,
        description: dto.description,
        imageUrl: dto.imageUrl,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(
    tenantId: string,
    query: PromotionQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryPromotionWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }
    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryPromotion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return [rows, await tx.inventoryPromotion.count({ where })] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const row = await this.prisma.inventoryPromotion.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!row) throw new PromotionNotFoundException(id);
    return row;
  }

  async update(id: string, tenantId: string, dto: UpdatePromotionDto) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryPromotion.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        imageUrl: dto.imageUrl,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryPromotion.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }
}
