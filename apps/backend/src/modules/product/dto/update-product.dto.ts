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
import { ProductVariantInputDto } from './create-product.dto';

/**
 * Update a product (all fields optional). When `variants` is provided it
 * REPLACES the product's variant set; omit it to leave variants untouched.
 */
export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantInputDto)
  variants?: ProductVariantInputDto[];
}
