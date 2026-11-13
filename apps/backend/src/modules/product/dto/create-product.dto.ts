import { Type } from 'class-transformer';
import {
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

/** A product variant/option supplied inline when creating/updating a product. */
export class ProductVariantInputDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  costAdjustment?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priceAdjustment?: number;
}

/** Create a product. */
export class CreateProductDto {
  @IsString()
  @MaxLength(100)
  code: string;

  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  categoryId: string;

  @IsOptional()
  @IsString()
  subCategoryId?: string;

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  taxRateId?: string;

  // EZHT business types (branded/generic/standard); legacy STANDARD/COMBO/SERVICE
  // kept valid so existing rows/clients don't break.
  @IsOptional()
  @IsIn([
    'branded',
    'generic',
    'standard',
    'combo',
    'digital',
    'service',
    'STANDARD',
    'COMBO',
    'SERVICE',
  ])
  type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  alertQuantity?: number;

  @IsOptional()
  @IsBoolean()
  isStockTracked?: boolean;

  @IsOptional()
  @IsBoolean()
  isTaxIncluded?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  barcodeSymbology?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  genericName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  strength?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  potency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  hsnCode?: string;

  @IsOptional()
  @IsBoolean()
  isSerialized?: boolean;

  // ── EZHT business add-product parity ──
  @IsOptional() @IsString() @MaxLength(100) packSize?: string;
  @IsOptional() @IsIn(['INDIVIDUAL', 'PACK']) salesMethod?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) packCost?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) packMrp?: number;
  @IsOptional() @IsIn(['INCLUSIVE', 'EXCLUSIVE']) taxMethod?: string;
  @IsOptional() @IsIn(['INCLUSIVE', 'EXCLUSIVE']) taxMethodPurchase?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  galleryImageUrls?: string[];

  // Prescription fields (strength/genericName above).
  @IsOptional() @IsString() @MaxLength(2000) composition?: string;
  @IsOptional() @IsString() @MaxLength(100) unitType?: string;
  @IsOptional() @IsString() @MaxLength(255) formulation?: string;
  @IsOptional() @IsString() @MaxLength(255) route?: string;
  @IsOptional() @IsString() @MaxLength(255) frequency?: string;
  @IsOptional() @IsString() @MaxLength(100) numberOfDays?: string;
  @IsOptional() @IsString() @MaxLength(100) prescriptionQuantity?: string;
  @IsOptional() @IsString() @MaxLength(100) refills?: string;
  @IsOptional() @IsString() @MaxLength(100) refillTimes?: string;
  @IsOptional() @IsString() @MaxLength(2000) prescriptionNotes?: string;

  // Custom fields cf1..cf11 (EZHT labels) + invoice details.
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
  @IsOptional() @IsString() @MaxLength(2000) invoiceDetails?: string;

  /** Set when the product is imported from a global master (back-link). */
  @IsOptional()
  @IsString()
  sourceMasterProductId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantInputDto)
  variants?: ProductVariantInputDto[];
}
