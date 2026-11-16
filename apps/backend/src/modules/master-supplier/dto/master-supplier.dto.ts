import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** List filters for the master-supplier list (search by name/company). */
export class MasterSupplierQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(255) search?: string;
}

// ── Create (name required; company optional) ──────────────────────────────────
export class CreateMasterSupplierDto {
  @IsString() @MaxLength(255) name: string;
  @IsOptional() @IsString() @MaxLength(255) company?: string;
  @IsOptional() @IsEmail() @MaxLength(255) email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(1000) address?: string;
  @IsOptional() @IsString() @MaxLength(255) city?: string;
  @IsOptional() @IsString() @MaxLength(255) state?: string;
  @IsOptional() @IsString() @MaxLength(50) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(255) country?: string;
  @IsOptional() @IsString() @MaxLength(50) vatNo?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ── Update ──────────────────────────────────────────────────────────────────
export class UpdateMasterSupplierDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(255) company?: string;
  @IsOptional() @IsEmail() @MaxLength(255) email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(1000) address?: string;
  @IsOptional() @IsString() @MaxLength(255) city?: string;
  @IsOptional() @IsString() @MaxLength(255) state?: string;
  @IsOptional() @IsString() @MaxLength(50) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(255) country?: string;
  @IsOptional() @IsString() @MaxLength(50) vatNo?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
