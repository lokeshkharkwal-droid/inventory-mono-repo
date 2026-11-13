import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateMasterSettingDto } from './dto/master-setting.dto';

/**
 * SiteAdmin-managed inventory master settings. A platform-level **singleton**
 * (one row): the many settings groups are stored as a JSON blob keyed by name.
 * No tenant scope / no RLS — bare Prisma calls.
 */
@Injectable()
export class MasterSettingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Return the settings singleton, creating an empty one on first access.
   * @returns the singleton `InventoryMasterSetting` row.
   */
  async getSettings() {
    const existing = await this.prisma.inventoryMasterSetting.findFirst();
    if (existing) return existing;
    return this.prisma.inventoryMasterSetting.create({ data: { data: {} } });
  }

  /**
   * Upsert the settings singleton, shallow-merging the posted `data` object into
   * the stored JSON blob and stamping `updatedBy`.
   * @param dto `{ data }` — the partial settings to merge in.
   * @param updatedBy SiteAdmin id of the actor.
   * @returns the updated singleton row.
   */
  async updateSettings(dto: UpdateMasterSettingDto, updatedBy?: string) {
    const existing = await this.prisma.inventoryMasterSetting.findFirst();
    const current =
      existing && existing.data && typeof existing.data === 'object'
        ? (existing.data as Record<string, unknown>)
        : {};
    const merged = { ...current, ...dto.data } as Prisma.InputJsonValue;
    if (existing) {
      return this.prisma.inventoryMasterSetting.update({
        where: { id: existing.id },
        data: { data: merged, updatedBy },
      });
    }
    return this.prisma.inventoryMasterSetting.create({
      data: { data: merged, updatedBy },
    });
  }
}
