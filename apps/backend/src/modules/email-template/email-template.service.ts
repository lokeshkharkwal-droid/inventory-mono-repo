import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  EmailTemplateQueryDto,
} from './dto/email-template.dto';

class EmailTemplateNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'EMAIL_TEMPLATE_NOT_FOUND',
      'Email template not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** Reusable email/message templates — tenant-scoped, soft-delete aware. */
@Injectable()
export class EmailTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateEmailTemplateDto) {
    return this.prisma.inventoryEmailTemplate.create({
      data: {
        tenantId,
        name: dto.name,
        subject: dto.subject,
        body: dto.body,
        type: dto.type,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(
    tenantId: string,
    query: EmailTemplateQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryEmailTemplateWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { type: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryEmailTemplate.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return [rows, await tx.inventoryEmailTemplate.count({ where })] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const row = await this.prisma.inventoryEmailTemplate.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!row) throw new EmailTemplateNotFoundException(id);
    return row;
  }

  async update(id: string, tenantId: string, dto: UpdateEmailTemplateDto) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryEmailTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        subject: dto.subject,
        body: dto.body,
        type: dto.type,
        isActive: dto.isActive,
      },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryEmailTemplate.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }
}
