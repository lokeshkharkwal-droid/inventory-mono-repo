import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginatedResult } from '../../common/dto/response.dto';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';
import {
  CreateDonorDto,
  UpdateDonorDto,
  DonorQueryDto,
  CreateDonationDto,
  UpdateDonationStatusDto,
  DonationQueryDto,
  CreateBloodRequestDto,
  UpdateRequestStatusDto,
  BloodRequestQueryDto,
  CreateCrossMatchDto,
  CrossMatchQueryDto,
} from './dto/bloodbank.dto';

/** 404 for a missing blood-bank record. */
class NotFound extends KaltrosException {
  constructor(code: string, label: string, id: string) {
    super(code, `${label} not found`, { id }, HttpStatus.NOT_FOUND);
  }
}

/**
 * ABO/Rh donor→recipient compatibility for red-cell transfusion.
 * O- is the universal donor; Rh- donors give to either Rh; Rh+ only to Rh+.
 */
export function isBloodCompatible(donor: string, recipient: string): boolean {
  const parse = (g: string) => ({
    abo: g.replace(/[+-]/, ''),
    rh: g.endsWith('-') ? '-' : '+',
  });
  const dn = parse(donor);
  const rc = parse(recipient);
  if (dn.rh === '+' && rc.rh === '-') return false;
  const allowed: Record<string, string[]> = {
    O: ['O', 'A', 'B', 'AB'],
    A: ['A', 'AB'],
    B: ['B', 'AB'],
    AB: ['AB'],
  };
  return (allowed[dn.abo] ?? []).includes(rc.abo);
}

/**
 * Blood bank — donors, donations (units), requests, and the available-units
 * inventory view. Tenant-scoped and branch-level; patients are referenced by id
 * (resolved via the kalnostics API when needed).
 */
@Injectable()
export class BloodBankService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Donors ───────────────────────────────────────────────────────────────
  async createDonor(
    tenantId: string,
    branchId: string | null,
    dto: CreateDonorDto,
  ) {
    return this.prisma.inventoryBloodDonor.create({
      data: {
        tenantId,
        branchId,
        name: dto.name,
        bloodGroup: dto.bloodGroup,
        patientId: dto.patientId,
        phone: dto.phone,
        email: dto.email,
        lastDonationDate: dto.lastDonationDate
          ? new Date(dto.lastDonationDate)
          : null,
        status: dto.status ?? 'ACTIVE',
        note: dto.note,
      },
    });
  }

  async listDonors(
    tenantId: string,
    query: DonorQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryBloodDonorWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.bloodGroup) where.bloodGroup = query.bloodGroup;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryBloodDonor.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return [rows, await tx.inventoryBloodDonor.count({ where })] as const;
    });
    return { data, total, page, limit };
  }

  async getDonor(id: string, tenantId: string) {
    const donor = await this.prisma.inventoryBloodDonor.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        donations: {
          where: { deletedAt: null },
          orderBy: { collectedAt: 'desc' },
        },
      },
    });
    if (!donor) throw new NotFound('DONOR_NOT_FOUND', 'Donor', id);
    return donor;
  }

  async updateDonor(id: string, tenantId: string, dto: UpdateDonorDto) {
    await this.ensureDonor(id, tenantId);
    return this.prisma.inventoryBloodDonor.update({
      where: { id },
      data: {
        name: dto.name,
        bloodGroup: dto.bloodGroup,
        patientId: dto.patientId,
        phone: dto.phone,
        email: dto.email,
        lastDonationDate: dto.lastDonationDate
          ? new Date(dto.lastDonationDate)
          : undefined,
        status: dto.status,
        note: dto.note,
      },
    });
  }

  async removeDonor(id: string, tenantId: string) {
    await this.ensureDonor(id, tenantId);
    return this.prisma.inventoryBloodDonor.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  // ── Donations (units) ──────────────────────────────────────────────────────
  async createDonation(
    tenantId: string,
    branchId: string | null,
    dto: CreateDonationDto,
  ) {
    await this.ensureDonor(dto.donorId, tenantId);
    return this.prisma.withTenant(tenantId, async (tx) => {
      const donation = await tx.inventoryBloodDonation.create({
        data: {
          tenantId,
          branchId,
          donorId: dto.donorId,
          bloodGroup: dto.bloodGroup,
          component: dto.component ?? 'WHOLE_BLOOD',
          volumeMl: dto.volumeMl,
          bagNumber: dto.bagNumber,
          collectedAt: dto.collectedAt ? new Date(dto.collectedAt) : new Date(),
          expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
          status: 'COLLECTED',
          note: dto.note,
        },
      });
      await tx.inventoryBloodDonor.update({
        where: { id: dto.donorId },
        data: { lastDonationDate: donation.collectedAt },
      });
      return donation;
    });
  }

  async listDonations(
    tenantId: string,
    query: DonationQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryBloodDonationWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.bloodGroup) where.bloodGroup = query.bloodGroup;
    if (query.status) where.status = query.status;
    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryBloodDonation.findMany({
        where,
        include: { donor: { select: { id: true, name: true } } },
        orderBy: { collectedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return [rows, await tx.inventoryBloodDonation.count({ where })] as const;
    });
    return { data, total, page, limit };
  }

  async updateDonationStatus(
    id: string,
    tenantId: string,
    dto: UpdateDonationStatusDto,
  ) {
    const donation = await this.prisma.inventoryBloodDonation.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!donation) throw new NotFound('DONATION_NOT_FOUND', 'Donation', id);
    return this.prisma.inventoryBloodDonation.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  /** Available units grouped by blood group + component. */
  async inventory(tenantId: string) {
    const rows = await this.prisma.inventoryBloodDonation.groupBy({
      by: ['bloodGroup', 'component'],
      where: { tenantId, deletedAt: null, status: 'AVAILABLE' },
      _count: true,
    });
    return rows.map((r) => ({
      bloodGroup: r.bloodGroup,
      component: r.component,
      units: r._count,
    }));
  }

  // ── Requests ───────────────────────────────────────────────────────────────
  async createRequest(
    tenantId: string,
    branchId: string | null,
    dto: CreateBloodRequestDto,
  ) {
    return this.prisma.inventoryBloodRequest.create({
      data: {
        tenantId,
        branchId,
        bloodGroup: dto.bloodGroup,
        component: dto.component ?? 'WHOLE_BLOOD',
        units: dto.units ?? 1,
        patientId: dto.patientId,
        patientName: dto.patientName,
        status: 'PENDING',
        note: dto.note,
      },
    });
  }

  async listRequests(
    tenantId: string,
    query: BloodRequestQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryBloodRequestWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (query.status) where.status = query.status;
    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryBloodRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return [rows, await tx.inventoryBloodRequest.count({ where })] as const;
    });
    return { data, total, page, limit };
  }

  async updateRequestStatus(
    id: string,
    tenantId: string,
    dto: UpdateRequestStatusDto,
  ) {
    const req = await this.prisma.inventoryBloodRequest.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!req)
      throw new NotFound('BLOOD_REQUEST_NOT_FOUND', 'Blood request', id);
    return this.prisma.inventoryBloodRequest.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  // ── Cross-matching ───────────────────────────────────────────────────────────
  /**
   * Cross-match a request (recipient) against a donation unit (donor). The ABO/Rh
   * result is computed automatically unless an explicit `result` is supplied.
   */
  async createCrossMatch(
    tenantId: string,
    branchId: string | null,
    dto: CreateCrossMatchDto,
    actorId?: string,
  ) {
    const request = await this.prisma.inventoryBloodRequest.findFirst({
      where: { id: dto.requestId, tenantId, deletedAt: null },
      select: { bloodGroup: true },
    });
    if (!request)
      throw new NotFound(
        'BLOOD_REQUEST_NOT_FOUND',
        'Blood request',
        dto.requestId,
      );
    const donation = await this.prisma.inventoryBloodDonation.findFirst({
      where: { id: dto.donationId, tenantId, deletedAt: null },
      select: { bloodGroup: true },
    });
    if (!donation)
      throw new NotFound('DONATION_NOT_FOUND', 'Donation', dto.donationId);

    const autoResult = isBloodCompatible(
      donation.bloodGroup,
      request.bloodGroup,
    )
      ? 'COMPATIBLE'
      : 'INCOMPATIBLE';
    const result = dto.result ?? autoResult;

    return this.prisma.inventoryBloodCrossMatch.create({
      data: {
        tenantId,
        branchId,
        requestId: dto.requestId,
        donationId: dto.donationId,
        result,
        isAutoResult: !dto.result,
        note: dto.note,
        crossMatchedBy: actorId,
        date: new Date(),
      },
    });
  }

  async listCrossMatches(
    tenantId: string,
    query: CrossMatchQueryDto,
  ): Promise<PaginatedResult<unknown>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.InventoryBloodCrossMatchWhereInput = {
      tenantId,
      deletedAt: null,
      ...(query.requestId ? { requestId: query.requestId } : {}),
    };
    const [data, total] = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.inventoryBloodCrossMatch.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return [
        rows,
        await tx.inventoryBloodCrossMatch.count({ where }),
      ] as const;
    });
    return { data, total, page, limit };
  }

  private async ensureDonor(id: string, tenantId: string) {
    const donor = await this.prisma.inventoryBloodDonor.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!donor) throw new NotFound('DONOR_NOT_FOUND', 'Donor', id);
    return donor;
  }
}
