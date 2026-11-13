import { IsObject } from 'class-validator';

/**
 * Upsert the inventory master-settings singleton. The posted `data` object is
 * shallow-merged into the stored JSON blob.
 */
export class UpdateMasterSettingDto {
  @IsObject() data: Record<string, unknown>;
}
