import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
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
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Allowed master-product types (EZHT parity). */
export const MASTER_PRODUCT_TYPES = [
  'branded',
  'generic',
  'standard',
  'combo',
  'digital',
  'service',
] as const;

/** A variant/option row of a master product. */
export class MasterProductVariantDto {
  @IsString() @MaxLength(255) name: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cost?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) price?: number;
}

/** A supplier configuration row of a master product. */
export class MasterProductSupplierDto {
  @IsString() @MaxLength(100) supplierId: string;
  @IsOptional() @IsString() @MaxLength(100) partNumber?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) price?: number;
}

/** A combo-item row (used when type = combo). */
export class MasterComboItemDto {
  @IsString() @MaxLength(100) itemProductId: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) quantity?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) price?: number;
}

/** Create a global master product (SiteAdmin-only). */
export class CreateMasterProductDto {
  @IsString() @MaxLength(255) name: string;
  @IsOptional() @IsString() @MaxLength(100) code?: string;
  @IsOptional() @IsString() @MaxLength(255) category?: string;
  @IsOptional() @IsString() @MaxLength(255) subCategory?: string;
  @IsOptional() @IsString() @MaxLength(50) unit?: string;
  @IsOptional() @IsString() @MaxLength(255) brand?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) price?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cost?: number;
  @IsOptional() @IsString() @MaxLength(50) hsnCode?: string;
  /** Tax-rate name + its percentage (so import can create it if the tenant lacks it). */
  @IsOptional() @IsString() @MaxLength(255) taxName?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) taxRate?: number;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() @MaxLength(255) genericName?: string;
  @IsOptional() @IsString() @MaxLength(100) strength?: string;
  /** Whether tenants may import this master (legacy import_status). */
  @IsOptional() @IsBoolean() isImportable?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;

  // ── EZHT add-product parity ──
  /** branded|generic|standard|combo|digital|service (default standard). */
  @IsOptional() @IsIn(MASTER_PRODUCT_TYPES) type?: string;
  @IsOptional() @IsString() @MaxLength(50) barcodeSymbology?: string;
  @IsOptional() @IsString() @MaxLength(100) categoryId?: string;
  @IsOptional() @IsString() @MaxLength(100) subCategoryId?: string;
  @IsOptional() @IsString() @MaxLength(100) unitId?: string;
  @IsOptional() @IsString() @MaxLength(100) brandId?: string;
  @IsOptional() @IsString() @MaxLength(100) taxRateId?: string;
  @IsOptional() @IsString() @MaxLength(100) manufacturerId?: string;
  @IsOptional() @IsString() @MaxLength(100) packSize?: string;
  /** INDIVIDUAL|PACK. */
  @IsOptional() @IsIn(['INDIVIDUAL', 'PACK']) salesMethod?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) packCost?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) packMrp?: number;
  /** INCLUSIVE|EXCLUSIVE. */
  @IsOptional() @IsIn(['INCLUSIVE', 'EXCLUSIVE']) taxMethod?: string;
  @IsOptional() @IsIn(['INCLUSIVE', 'EXCLUSIVE']) taxMethodPurchase?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) alertQuantity?: number;
  @IsOptional() @IsBoolean() isTrackQuantity?: boolean;
  @IsOptional() @IsString() @MaxLength(2000) imageUrl?: string;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  galleryImageUrls?: string[];

  // Prescription fields.
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

  // Custom fields cf1..cf11.
  @IsOptional() @IsString() @MaxLength(255) cf1?: string;
  @IsOptional() @IsString() @MaxLength(255) cf2?: string;
  @IsOptional() @IsString() @MaxLength(255) cf3?: string;
  @IsOptional() @IsString() @MaxLength(255) cf4?: string;
  @IsOptional() @IsString() @MaxLength(255) cf5?: string;
  @IsOptional() @IsString() @MaxLength(255) cf6?: string;
  @IsOptional() @IsString() @MaxLength(255) cf7?: string;
  @IsOptional() @IsString() @MaxLength(255) cf8?: string;
  @IsOptional() @IsString() @MaxLength(255) cf9?: string;
  @IsOptional() @IsString() @MaxLength(255) cf10?: string;
  @IsOptional() @IsString() @MaxLength(255) cf11?: string;

  /** Product details for invoice (legacy `details`). */
  @IsOptional() @IsString() @MaxLength(2000) invoiceDetails?: string;
  @IsOptional() @IsBoolean() hasVariants?: boolean;
  /** Uploaded digital-file URL (type=digital). */
  @IsOptional() @IsString() @MaxLength(2000) digitalFileUrl?: string;

  // Sub-entities (replace-on-write).
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MasterProductVariantDto)
  variants?: MasterProductVariantDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => MasterProductSupplierDto)
  suppliers?: MasterProductSupplierDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MasterComboItemDto)
  comboItems?: MasterComboItemDto[];
}

/** Update a global master product (all fields optional; SiteAdmin-only). */
export class UpdateMasterProductDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(100) code?: string;
  @IsOptional() @IsString() @MaxLength(255) category?: string;
  @IsOptional() @IsString() @MaxLength(255) subCategory?: string;
  @IsOptional() @IsString() @MaxLength(50) unit?: string;
  @IsOptional() @IsString() @MaxLength(255) brand?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) price?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cost?: number;
  @IsOptional() @IsString() @MaxLength(50) hsnCode?: string;
  @IsOptional() @IsString() @MaxLength(255) taxName?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) taxRate?: number;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() @MaxLength(255) genericName?: string;
  @IsOptional() @IsString() @MaxLength(100) strength?: string;
  @IsOptional() @IsBoolean() isImportable?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;

  // ── EZHT add-product parity ──
  @IsOptional() @IsIn(MASTER_PRODUCT_TYPES) type?: string;
  @IsOptional() @IsString() @MaxLength(50) barcodeSymbology?: string;
  @IsOptional() @IsString() @MaxLength(100) categoryId?: string;
  @IsOptional() @IsString() @MaxLength(100) subCategoryId?: string;
  @IsOptional() @IsString() @MaxLength(100) unitId?: string;
  @IsOptional() @IsString() @MaxLength(100) brandId?: string;
  @IsOptional() @IsString() @MaxLength(100) taxRateId?: string;
  @IsOptional() @IsString() @MaxLength(100) manufacturerId?: string;
  @IsOptional() @IsString() @MaxLength(100) packSize?: string;
  @IsOptional() @IsIn(['INDIVIDUAL', 'PACK']) salesMethod?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) packCost?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) packMrp?: number;
  @IsOptional() @IsIn(['INCLUSIVE', 'EXCLUSIVE']) taxMethod?: string;
  @IsOptional() @IsIn(['INCLUSIVE', 'EXCLUSIVE']) taxMethodPurchase?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) alertQuantity?: number;
  @IsOptional() @IsBoolean() isTrackQuantity?: boolean;
  @IsOptional() @IsString() @MaxLength(2000) imageUrl?: string;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  galleryImageUrls?: string[];

  // Prescription fields.
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

  // Custom fields cf1..cf11.
  @IsOptional() @IsString() @MaxLength(255) cf1?: string;
  @IsOptional() @IsString() @MaxLength(255) cf2?: string;
  @IsOptional() @IsString() @MaxLength(255) cf3?: string;
  @IsOptional() @IsString() @MaxLength(255) cf4?: string;
  @IsOptional() @IsString() @MaxLength(255) cf5?: string;
  @IsOptional() @IsString() @MaxLength(255) cf6?: string;
  @IsOptional() @IsString() @MaxLength(255) cf7?: string;
  @IsOptional() @IsString() @MaxLength(255) cf8?: string;
  @IsOptional() @IsString() @MaxLength(255) cf9?: string;
  @IsOptional() @IsString() @MaxLength(255) cf10?: string;
  @IsOptional() @IsString() @MaxLength(255) cf11?: string;

  @IsOptional() @IsString() @MaxLength(2000) invoiceDetails?: string;
  @IsOptional() @IsBoolean() hasVariants?: boolean;
  /** Uploaded digital-file URL (type=digital). */
  @IsOptional() @IsString() @MaxLength(2000) digitalFileUrl?: string;

  // Sub-entities (replace-on-write when provided).
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MasterProductVariantDto)
  variants?: MasterProductVariantDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => MasterProductSupplierDto)
  suppliers?: MasterProductSupplierDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MasterComboItemDto)
  comboItems?: MasterComboItemDto[];
}

/** A drug-composition row (EZHT "Drugs" modal): drug name + unit value + unit. */
export class MasterProductDrugDto {
  @IsString() @MaxLength(255) name: string;
  @IsOptional() @IsString() @MaxLength(100) unitValue?: string;
  @IsOptional() @IsString() @MaxLength(100) unit?: string;
}

/** List filters for master products. */
export class MasterProductQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(255) search?: string;
}

/** Import selected master products into the caller's tenant catalogue. */
export class ImportMasterProductsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids: string[];
}

// Names from the master-catalog work, kept as aliases so both resolve.
export const PRODUCT_TYPES: string[] = [...MASTER_PRODUCT_TYPES];
export const BARCODE_SYMBOLOGIES = ['code25', 'code39', 'code128', 'ean8', 'ean13', 'upca', 'upce'];
export { MasterComboItemDto as MasterProductComboItemDto };
export { MasterProductDrugDto as CreateMasterProductDrugDto };
export { UpdateMasterProductDto as MasterProductBaseDto };
