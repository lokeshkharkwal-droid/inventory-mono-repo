import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * One row of the EZHT 16-column "update products via CSV" sheet
 * (`sample_product_update.csv`). Matched to an existing product by `code`; the
 * remaining (optional) fields overwrite the product. Reference columns arrive as
 * codes/names (category code, subcategory code, unit, tax-rate name) and are
 * resolved to ids by {@link ProductImportService.updateImport}; `salesMethod` /
 * `taxMethod*` arrive as the legacy lower-case words.
 */
export class UpdateImportRowDto {
  @IsString() @MaxLength(100) code: string;
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  /** Category CODE. */
  @IsOptional() @IsString() @MaxLength(100) categoryCode?: string;
  /** Unit name/code. */
  @IsOptional() @IsString() @MaxLength(100) unit?: string;
  @IsOptional() @IsString() @MaxLength(100) packSize?: string;
  /** Legacy 'individual' | 'pack_size'. */
  @IsOptional() @IsString() @MaxLength(20) salesMethod?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) packCost?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cost?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) packMrp?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) price?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) alertQuantity?: number;
  /** Tax-rate NAME. */
  @IsOptional() @IsString() @MaxLength(255) taxRateName?: string;
  @IsOptional() @IsString() @MaxLength(50) hsnCode?: string;
  /** Legacy 'inclusive' | 'exclusive'. */
  @IsOptional() @IsString() @MaxLength(20) taxMethodSales?: string;
  @IsOptional() @IsString() @MaxLength(20) taxMethodPurchase?: string;
  /** Subcategory CODE. */
  @IsOptional() @IsString() @MaxLength(100) subCategoryCode?: string;
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
