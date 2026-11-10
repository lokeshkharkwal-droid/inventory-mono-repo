import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import { ProductService } from '../product/product.service';
import {
  CreateProductTemplateDto,
  UpdateProductTemplateDto,
  ProductTemplateQueryDto,
  CreateFromTemplateDto,
} from './dto/product-template.dto';

class TemplateNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'PRODUCT_TEMPLATE_NOT_FOUND',
      'Product template not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/**
 * Product templates — reusable catalogue blueprints (legacy SITE master_products).
 * A template is copied into a real product via {@link createProduct}.
 */
@Injectable()
export class ProductTemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productService: ProductService,
  ) {}

  async create(tenantId: string, dto: CreateProductTemplateDto) {
    return this.prisma.inventoryProductTemplate.create({
      data: {
        tenantId,
        name: dto.name,
        code: dto.code,
        category: dto.category,
        unit: dto.unit,
        price: dto.price ?? 0,
        cost: dto.cost ?? 0,
        hsnCode: dto.hsnCode,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(
    tenantId: string,
    query: ProductTemplateQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryProductTemplateWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryProductTemplate.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return [
        rows,
        await tx.inventoryProductTemplate.count({ where }),
      ] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const row = await this.prisma.inventoryProductTemplate.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!row) throw new TemplateNotFoundException(id);
    return row;
  }

  async update(id: string, tenantId: string, dto: UpdateProductTemplateDto) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryProductTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        category: dto.category,
        unit: dto.unit,
        price: dto.price,
        cost: dto.cost,
        hsnCode: dto.hsnCode,
        description: dto.description,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryProductTemplate.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  /** Materialise a template into a real product (reuses ProductService.create). */
  async createProduct(
    id: string,
    tenantId: string,
    dto: CreateFromTemplateDto,
  ) {
    const tpl = await this.findById(id, tenantId);
    return this.productService.create(tenantId, {
      code: dto.code ?? tpl.code ?? `TPL-${tpl.id.slice(0, 6)}`,
      name: tpl.name,
      categoryId: dto.categoryId,
      price: tpl.price.toNumber(),
      cost: tpl.cost.toNumber(),
      hsnCode: tpl.hsnCode ?? undefined,
      description: tpl.description ?? undefined,
    });
  }
}
