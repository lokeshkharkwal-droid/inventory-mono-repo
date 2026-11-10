import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { CreatePurchaseDto } from './create-purchase.dto';

/**
 * Bulk CSV/Excel import of purchases. Each row is a full purchase document
 * (header + line items) — the frontend groups CSV line rows by reference into
 * documents before posting. Preview with `dryRun`, then commit.
 */
export class ImportPurchasesDto {
  @IsOptional() @IsBoolean() dryRun?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseDto)
  rows: CreatePurchaseDto[];
}
