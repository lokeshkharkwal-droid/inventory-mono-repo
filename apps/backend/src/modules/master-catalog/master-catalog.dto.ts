import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class CatalogQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(255) search?: string;
}

// ── Suppliers ─────────────────────────────────────────────────────────────────
export class CreateMasterSupplierDto {
  @IsOptional() @IsString() @MaxLength(255) company?: string;
  @IsString() @MinLength(1) @MaxLength(255) name: string;
  @IsOptional() @IsString() @MaxLength(255) email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(1000) address?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(100) country?: string;
  @IsOptional() @IsString() @MaxLength(50) vatNo?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateMasterSupplierDto {
  @IsOptional() @IsString() @MaxLength(255) company?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(255) email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(1000) address?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(100) country?: string;
  @IsOptional() @IsString() @MaxLength(50) vatNo?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ── Manufacturers ─────────────────────────────────────────────────────────────
export class CreateMasterManufacturerDto {
  @IsOptional() @IsString() @MaxLength(2048) logoUrl?: string;
  @IsString() @MinLength(1) @MaxLength(255) company: string;
  @IsString() @MinLength(1) @MaxLength(255) name: string;
  @IsOptional() @IsString() @MaxLength(50) vatNo?: string;
  @IsOptional() @IsString() @MaxLength(255) email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(1000) address?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(100) country?: string;
  @IsOptional() @IsString() @MaxLength(2000) invoiceFooter?: string;
  @IsOptional() @IsString() @MaxLength(500) cf1?: string;
  @IsOptional() @IsString() @MaxLength(500) cf2?: string;
  @IsOptional() @IsString() @MaxLength(500) cf3?: string;
  @IsOptional() @IsString() @MaxLength(500) cf4?: string;
  @IsOptional() @IsString() @MaxLength(500) cf5?: string;
  @IsOptional() @IsString() @MaxLength(500) cf6?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateMasterManufacturerDto {
  @IsOptional() @IsString() @MaxLength(2048) logoUrl?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(255) company?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(50) vatNo?: string;
  @IsOptional() @IsString() @MaxLength(255) email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(1000) address?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(100) country?: string;
  @IsOptional() @IsString() @MaxLength(2000) invoiceFooter?: string;
  @IsOptional() @IsString() @MaxLength(500) cf1?: string;
  @IsOptional() @IsString() @MaxLength(500) cf2?: string;
  @IsOptional() @IsString() @MaxLength(500) cf3?: string;
  @IsOptional() @IsString() @MaxLength(500) cf4?: string;
  @IsOptional() @IsString() @MaxLength(500) cf5?: string;
  @IsOptional() @IsString() @MaxLength(500) cf6?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ── Expense / income categories ───────────────────────────────────────────────
export class CreateMasterFinanceCategoryDto {
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsString() @MinLength(1) @MaxLength(255) name: string;
  @IsOptional() @IsString() taxRateId?: string;
  @IsOptional() @IsIn(['INCLUSIVE', 'EXCLUSIVE']) taxMethod?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class UpdateMasterFinanceCategoryDto {
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() @MinLength(1) @MaxLength(255) name?: string;
  @IsOptional() @IsString() taxRateId?: string;
  @IsOptional() @IsIn(['INCLUSIVE', 'EXCLUSIVE']) taxMethod?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ── Proformas ─────────────────────────────────────────────────────────────────
export class MasterProformaItemDto {
  @IsOptional() @IsString() masterProductId?: string;
  @IsOptional() @IsString() labTestId?: string;
  @Type(() => Number) @IsNumber() @Min(0) quantity: number;
}
export class CreateMasterProformaDto {
  @IsString() @MinLength(1) @MaxLength(255) name: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE']) status?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MasterProformaItemDto)
  items?: MasterProformaItemDto[];
}
export class UpdateMasterProformaDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(255) name?: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE']) status?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MasterProformaItemDto)
  items?: MasterProformaItemDto[];
}

// ── Settings ──────────────────────────────────────────────────────────────────
export class SaveMasterSettingsDto {
  @IsObject() data: Record<string, unknown>;
}
