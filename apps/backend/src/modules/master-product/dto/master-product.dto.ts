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
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

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
