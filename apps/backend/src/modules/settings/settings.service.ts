import { Injectable } from '@nestjs/common';
import { Prisma, type InventorySetting } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantRegistryService } from '../alerts/tenant-registry.service';
import { UpdateSettingsDto } from './dto/settings.dto';

/**
 * Branch-scoped inventory settings (business settings + numbering), one row per
 * (tenantId, branchId). A `branchId = null` row is the tenant-level default
 * (business-admin context); a branch's first access clones that default so each
 * branch starts from the current business config. The branch is always taken
 * from the caller's JWT (never a client-supplied id), so a user can only ever
 * read/write the settings of a branch they are authorized for.
 */
@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: TenantRegistryService,
  ) {}

  /**
   * Get the settings for a (tenant, branch). Creates the row on first access:
   * a branch with no row yet is seeded by cloning the tenant-level default
   * (`branchId = null`); if no default exists either, system defaults are used.
   */
  async get(tenantId: string, branchId: string | null = null) {
    void this.registry.register(tenantId);
    const existing = await this.prisma.inventorySetting.findFirst({
      where: { tenantId, branchId },
    });
    if (existing) return this.sanitize(existing);

    // Seed a branch from the tenant-level default (clone-on-first-read).
    if (branchId !== null) {
      const template = await this.prisma.inventorySetting.findFirst({
        where: { tenantId, branchId: null },
      });
      if (template) {
        const created = await this.prisma.inventorySetting.create({
          data: this.cloneData(template, branchId),
        });
        return this.sanitize(created);
      }
    }

    const created = await this.prisma.inventorySetting.create({
      data: { tenantId, branchId },
    });
    return this.sanitize(created);
  }

  /** Update (or create on first save) the settings for a (tenant, branch). */
  async update(
    tenantId: string,
    branchId: string | null,
    dto: UpdateSettingsDto,
  ) {
    // Separate the JSON gateway config (needs Prisma's Json input type).
    const { paymentGateways, ...rest } = dto;
    const data: Prisma.InventorySettingUncheckedUpdateInput = { ...rest };
    // An empty-string PIN clears it; omitting the field leaves it unchanged.
    if (rest.posPin === '') data.posPin = null;
    if (paymentGateways !== undefined) {
      data.paymentGateways = paymentGateways as Prisma.InputJsonValue;
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.inventorySetting.findFirst({
        where: { tenantId, branchId },
        select: { id: true },
      });
      if (existing) {
        const record = await tx.inventorySetting.update({
          where: { id: existing.id },
          data,
        });
        return this.sanitize(record);
      }
      const createData: Prisma.InventorySettingUncheckedCreateInput = {
        tenantId,
        branchId,
        ...rest,
      };
      if (rest.posPin === '') createData.posPin = null;
      if (paymentGateways !== undefined) {
        createData.paymentGateways = paymentGateways as Prisma.InputJsonValue;
      }
      const record = await tx.inventorySetting.create({ data: createData });
      return this.sanitize(record);
    });
  }

  /**
   * Read the raw cashier PIN for a (tenant, branch) for server-side verification
   * only. Never expose this over the API — use {@link get} for client settings.
   */
  async getPosPin(
    tenantId: string,
    branchId: string | null = null,
  ): Promise<string | null> {
    const record = await this.prisma.inventorySetting.findFirst({
      where: { tenantId, branchId },
      select: { posPin: true },
    });
    return record?.posPin ?? null;
  }

  /** Build create-input that clones a template row's scalar config for a branch. */
  private cloneData(
    template: InventorySetting,
    branchId: string,
  ): Prisma.InventorySettingUncheckedCreateInput {
    const {
      id: _id,
      createdAt: _c,
      updatedAt: _u,
      branchId: _b,
      paymentGateways,
      ...rest
    } = template;
    const data: Prisma.InventorySettingUncheckedCreateInput = {
      ...rest,
      branchId,
    };
    if (paymentGateways != null) {
      data.paymentGateways = paymentGateways;
    }
    return data;
  }

  /** Never echo the raw cashier PIN back to the client; expose a flag instead. */
  private sanitize<T extends { posPin: string | null }>(record: T) {
    const { posPin, ...rest } = record;
    return { ...rest, hasPosPin: !!posPin };
  }
}
