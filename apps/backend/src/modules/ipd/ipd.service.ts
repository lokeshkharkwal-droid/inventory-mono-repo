import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import { generateReference } from '../../common/utils/reference.util';
import {
  AdmissionQueryDto,
  CreateAdmissionDto,
  CreateChargeDto,
  UpdateAdmissionDto,
} from './dto/ipd.dto';

/** 404 — admission not found in this tenant. */
export class AdmissionNotFoundException extends KaltrosException {
  constructor(id: string) {
    super(
      'ADMISSION_NOT_FOUND',
      'Admission not found',
      { id },
      HttpStatus.NOT_FOUND,
    );
  }
}

/** 409 — the admission is already discharged. */
export class AlreadyDischargedException extends KaltrosException {
  constructor(id: string) {
    super(
      'ALREADY_DISCHARGED',
      'This admission is already discharged',
      { id },
      HttpStatus.CONFLICT,
    );
  }
}

/** Inpatient admissions — admit/discharge workflow. */
@Injectable()
export class IpdService {
  constructor(private readonly prisma: PrismaService) {}

  async admit(
    tenantId: string,
    branchId: string | null,
    dto: CreateAdmissionDto,
  ) {
    return this.prisma.inventoryIpdAdmission.create({
      data: {
        tenantId,
        branchId,
        patientName: dto.patientName,
        admissionNo: dto.admissionNo ?? generateReference('IPD'),
        patientId: dto.patientId,
        ward: dto.ward,
        bed: dto.bed,
        referringDoctor: dto.referringDoctor,
        admittedAt: dto.admittedAt ? new Date(dto.admittedAt) : new Date(),
        status: 'ADMITTED',
        note: dto.note,
      },
    });
  }

  async findAll(
    tenantId: string,
    query: AdmissionQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryIpdAdmissionWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { patientName: { contains: query.search, mode: 'insensitive' } },
        { admissionNo: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryIpdAdmission.findMany({
        where,
        orderBy: { admittedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return [rows, await tx.inventoryIpdAdmission.count({ where })] as const;
    });
    return { data, total, page, limit };
  }

  async findById(id: string, tenantId: string) {
    const admission = await this.prisma.inventoryIpdAdmission.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!admission) throw new AdmissionNotFoundException(id);
    return admission;
  }

  async update(id: string, tenantId: string, dto: UpdateAdmissionDto) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryIpdAdmission.update({
      where: { id },
      data: {
        patientName: dto.patientName,
        ward: dto.ward,
        bed: dto.bed,
        referringDoctor: dto.referringDoctor,
        note: dto.note,
      },
    });
  }

  async discharge(id: string, tenantId: string) {
    const admission = await this.findById(id, tenantId);
    if (admission.status === 'DISCHARGED') {
      throw new AlreadyDischargedException(id);
    }
    return this.prisma.inventoryIpdAdmission.update({
      where: { id },
      data: { status: 'DISCHARGED', dischargedAt: new Date() },
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryIpdAdmission.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  // ── Billing (charges) ────────────────────────────────────────────────────────
  /** Add a billable charge to an admission. */
  async addCharge(
    id: string,
    tenantId: string,
    dto: CreateChargeDto,
    actorId?: string,
  ) {
    await this.findById(id, tenantId);
    return this.prisma.inventoryIpdCharge.create({
      data: {
        tenantId,
        admissionId: id,
        description: dto.description,
        category: dto.category,
        amount: dto.amount,
        date: dto.date ? new Date(dto.date) : new Date(),
        createdBy: actorId,
      },
    });
  }

  /** List an admission's charges with a running total. */
  async listCharges(id: string, tenantId: string) {
    await this.findById(id, tenantId);
    const charges = await this.prisma.inventoryIpdCharge.findMany({
      where: { admissionId: id, tenantId, deletedAt: null },
      orderBy: { date: 'desc' },
    });
    const total = charges.reduce(
      (s, c) => s.add(c.amount),
      new Prisma.Decimal(0),
    );
    return { charges, total };
  }
}
