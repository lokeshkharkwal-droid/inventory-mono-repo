import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * One row of an "update products via CSV" upload (EZHT `update_csv`). Matched to
 * an existing product by `code`; the remaining (optional) scalar fields overwrite
 * the product. Reference changes by code are out of scope — pricing/core fields
 * only, mirroring the legacy price/stock update sheet.
 */
export class UpdateImportRowDto {
  @IsString() @MaxLength(100) code: string;
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(100) packSize?: string;
  @IsOptional() @IsIn(['INDIVIDUAL', 'PACK']) salesMethod?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) packCost?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cost?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) packMrp?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) price?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) alertQuantity?: number;
  @IsOptional() @IsString() @MaxLength(50) hsnCode?: string;
  @IsOptional() @IsIn(['INCLUSIVE', 'EXCLUSIVE']) taxMethod?: string;
  @IsOptional() @IsIn(['INCLUSIVE', 'EXCLUSIVE']) taxMethodPurchase?: string;
}

/** Update existing products from parsed CSV rows (preview with `dryRun`). */
export class UpdateImportProductsDto {
  @IsOptional() @IsBoolean() dryRun?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => UpdateImportRowDto)
  rows: UpdateImportRowDto[];
}
