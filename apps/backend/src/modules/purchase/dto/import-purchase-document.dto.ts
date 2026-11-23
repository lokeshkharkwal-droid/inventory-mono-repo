import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/**
 * One parsed CSV line of the EZHT purchase import (`sample_purchase_import.csv`).
 * Numeric columns arrive as strings and are parsed in the service so blank cells
 * are tolerated; the first three (code, name, expiry) are required at import time.
 */
export class PurchaseImportRowDto {
  @IsOptional() @IsString() @MaxLength(100) code?: string;
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(20) expiry?: string;
  @IsOptional() @IsString() @MaxLength(100) serial?: string;
  @IsOptional() @IsString() @MaxLength(255) manufacturer?: string;
  @IsOptional() @IsString() @MaxLength(100) masterProductId?: string;
  @IsOptional() @IsString() @MaxLength(20) hsnCode?: string;
  @IsOptional() @IsString() packQuantity?: string;
  @IsOptional() @IsString() freePackQuantity?: string;
  @IsOptional() @IsString() quantity?: string;
  @IsOptional() @IsString() packSize?: string;
  @IsOptional() @IsString() @MaxLength(50) packUnit?: string;
  @IsOptional() @IsString() packMrp?: string;
  @IsOptional() @IsString() packCost?: string;
  @IsOptional() @IsString() @MaxLength(20) discount?: string;
  @IsOptional() @IsString() cgst?: string;
  @IsOptional() @IsString() sgst?: string;
}

/**
 * EZHT single-document purchase import (`Purchases::purchase_import`): one header
 * form + a CSV of line items → one purchase. Missing products are created on the
 * fly (master + tenant catalogue parity, per the product-import resolvers).
 */
export class ImportPurchaseDocumentDto {
  @IsString()
  supplierId: string;

  @IsOptional() @IsString() warehouseId?: string;
  @IsOptional() @IsString() @MaxLength(100) reference?: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsString() status?: string;

  /** GST mode: true = IGST (inter-state), false = CGST+SGST (intra-state). */
  @IsOptional() @IsBoolean() interState?: boolean;

  @IsOptional() @Type(() => Number) @IsNumber() orderTax?: number;
  @IsOptional() @IsString() orderDiscount?: string;
  @IsOptional() @Type(() => Number) @IsNumber() shipping?: number;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
  @IsOptional() @IsString() @MaxLength(1000) attachmentUrl?: string;

  /** Preview only — validate + report without creating the purchase/products. */
  @IsOptional() @IsBoolean() dryRun?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PurchaseImportRowDto)
  rows: PurchaseImportRowDto[];
}
