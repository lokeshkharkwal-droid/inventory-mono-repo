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
 * One row of the EZHT 29-column "import products via CSV" sheet
 * (`sample_product_import.csv`). References arrive as human codes/names (category
 * code, subcategory code, tax-rate name, manufacturer name) and are resolved to
 * ids by {@link ProductImportService.importCsv} (created on the fly when absent).
 * `taxMethod*`/`salesMethod` arrive as the legacy lower-case words.
 */
export class ImportCsvRowDto {
  @IsString() @MaxLength(100) code: string;
  @IsString() @MaxLength(255) name: string;
  /** Category CODE (resolved to an id; created if missing). */
  @IsOptional() @IsString() @MaxLength(100) categoryCode?: string;
  /** Unit name/code (resolved to a unit id; created if missing). */
  @IsOptional() @IsString() @MaxLength(100) unit?: string;
  @IsOptional() @IsString() @MaxLength(100) packSize?: string;
  /** Legacy 'individual' | 'pack_size'. */
  @IsOptional() @IsString() @MaxLength(20) salesMethod?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) packCost?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cost?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) packMrp?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) price?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) alertQuantity?: number;
  /** Tax-rate NAME (resolved to an id when it exists). */
  @IsOptional() @IsString() @MaxLength(255) taxRateName?: string;
  @IsOptional() @IsString() @MaxLength(50) hsnCode?: string;
  /** Legacy 'inclusive' | 'exclusive'. */
  @IsOptional() @IsString() @MaxLength(20) taxMethodSales?: string;
  @IsOptional() @IsString() @MaxLength(20) taxMethodPurchase?: string;
  /** Subcategory CODE (resolved within the category; created if missing). */
  @IsOptional() @IsString() @MaxLength(100) subCategoryCode?: string;
  /** Pipe-separated variant names (e.g. "Red|Blue|Black"). */
  @IsOptional() @IsString() @MaxLength(2000) variants?: string;
  @IsOptional() @IsString() @MaxLength(1000) cf1?: string;
  @IsOptional() @IsString() @MaxLength(1000) cf2?: string;
  @IsOptional() @IsString() @MaxLength(1000) cf3?: string;
  @IsOptional() @IsString() @MaxLength(1000) cf4?: string;
  @IsOptional() @IsString() @MaxLength(1000) cf5?: string;
  @IsOptional() @IsString() @MaxLength(1000) cf6?: string;
  @IsOptional() @IsString() @MaxLength(1000) cf7?: string;
  @IsOptional() @IsString() @MaxLength(1000) cf8?: string;
  @IsOptional() @IsString() @MaxLength(1000) cf9?: string;
  @IsOptional() @IsString() @MaxLength(1000) cf10?: string;
  @IsOptional() @IsString() @MaxLength(1000) cf11?: string;
  /** Manufacturer NAME (resolved to an id; created if missing). */
  @IsOptional() @IsString() @MaxLength(255) manufacturer?: string;
}

/** Import products from the parsed 29-column EZHT CSV (preview with `dryRun`). */
export class ImportCsvProductsDto {
  @IsOptional() @IsBoolean() dryRun?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ImportCsvRowDto)
  rows: ImportCsvRowDto[];
}
