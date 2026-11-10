import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantRegistryService } from '../alerts/tenant-registry.service';
import { UpdateSettingsDto } from './dto/settings.dto';

/**
 * Per-tenant inventory settings singleton (business settings + numbering).
 * A default row is created on first read so the frontend always has a config.
 */
@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: TenantRegistryService,
  ) {}

  /** Get the tenant's settings, creating defaults on first access. */
  async get(tenantId: string) {
    void this.registry.register(tenantId);
    const existing = await this.prisma.inventorySetting.findUnique({
      where: { tenantId },
    });
    const record =
      existing ??
      (await this.prisma.inventorySetting.create({ data: { tenantId } }));
    return this.sanitize(record);
  }

  /** Update (upsert) the tenant's settings. */
  async update(tenantId: string, dto: UpdateSettingsDto) {
    // Separate the JSON gateway config (needs Prisma's Json input type).
    const { paymentGateways, ...rest } = dto;
    const base: Prisma.InventorySettingUncheckedCreateInput = {
      tenantId,
      ...rest,
    };
    // An empty-string PIN clears it; omitting the field leaves it unchanged.
    if (base.posPin === '') base.posPin = null;
    if (paymentGateways !== undefined) {
      base.paymentGateways = paymentGateways as Prisma.InputJsonValue;
    }
    const { tenantId: _ignored, ...updateData } = base;
    const record = await this.prisma.inventorySetting.upsert({
      where: { tenantId },
      create: base,
      update: updateData,
    });
    return this.sanitize(record);
  }

  /**
   * Read the tenant's raw cashier PIN for server-side verification only. Never
   * expose this over the API — use {@link get} for client-facing settings.
   */
  async getPosPin(tenantId: string): Promise<string | null> {
    const record = await this.prisma.inventorySetting.findUnique({
      where: { tenantId },
      select: { posPin: true },
    });
    return record?.posPin ?? null;
  }

  /** Never echo the raw cashier PIN back to the client; expose a flag instead. */
  private sanitize<T extends { posPin: string | null }>(record: T) {
    const { posPin, ...rest } = record;
    return { ...rest, hasPosPin: !!posPin };
  }
}
