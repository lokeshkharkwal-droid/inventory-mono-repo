import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** List filters for any reference list (sub-categories also accept categoryId). */
export class MasterReferenceQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(255) search?: string;
  @IsOptional() @IsString() categoryId?: string;
}

// ── Category ──────────────────────────────────────────────────────────────────
export class CreateMasterCategoryDto {
  @IsString() @MaxLength(255) name: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsString() @MaxLength(1000) imageUrl?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateMasterCategoryDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsString() @MaxLength(1000) imageUrl?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ── Sub-category (belongs to a master category) ───────────────────────────────
export class CreateMasterSubCategoryDto {
  @IsString() categoryId: string;
  @IsString() @MaxLength(255) name: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateMasterSubCategoryDto {
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ── Unit / Brand (name + code) ────────────────────────────────────────────────
export class CreateMasterNamedDto {
  @IsString() @MaxLength(255) name: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateMasterNamedDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ── Tax rate (EZHT parity: type, HSN, CGST/SGST/IGST) ─────────────────────────
export class CreateMasterTaxRateDto {
  @IsString() @MaxLength(255) name: string;
  @Type(() => Number) @IsNumber() @Min(0) rate: number;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() @MaxLength(50) type?: string;
  @IsOptional() @IsString() @MaxLength(50) hsnCode?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cgst?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) sgst?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) igst?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateMasterTaxRateDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) rate?: number;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() @MaxLength(50) type?: string;
  @IsOptional() @IsString() @MaxLength(50) hsnCode?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cgst?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) sgst?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) igst?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ── Expense / Income category (code, name, tax, tax method) ────────────────────
export class CreateMasterFinanceCategoryDto {
  @IsString() @MaxLength(255) name: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() taxRateId?: string;
  @IsOptional() @IsString() @MaxLength(20) taxMethod?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateMasterFinanceCategoryDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() taxRateId?: string;
  @IsOptional() @IsString() @MaxLength(20) taxMethod?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
