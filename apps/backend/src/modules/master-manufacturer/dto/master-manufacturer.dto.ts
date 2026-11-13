import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** List filters for the master-manufacturer list (search by name/company). */
export class MasterManufacturerQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(255) search?: string;
}

// ── Create ──────────────────────────────────────────────────────────────────
export class CreateMasterManufacturerDto {
  @IsString() @MaxLength(255) company: string;
  @IsString() @MaxLength(255) name: string;
  @IsOptional() @IsString() @MaxLength(1000) logoUrl?: string;
  @IsOptional() @IsString() @MaxLength(50) vatNo?: string;
  @IsOptional() @IsEmail() @MaxLength(255) email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(1000) address?: string;
  @IsOptional() @IsString() @MaxLength(255) city?: string;
  @IsOptional() @IsString() @MaxLength(255) state?: string;
  @IsOptional() @IsString() @MaxLength(50) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(255) country?: string;
  @IsOptional() @IsString() @MaxLength(2000) invoiceFooter?: string;
  @IsOptional() @IsString() @MaxLength(255) cf1?: string;
  @IsOptional() @IsString() @MaxLength(255) cf2?: string;
  @IsOptional() @IsString() @MaxLength(255) cf3?: string;
  @IsOptional() @IsString() @MaxLength(255) cf4?: string;
  @IsOptional() @IsString() @MaxLength(255) cf5?: string;
  @IsOptional() @IsString() @MaxLength(255) cf6?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

// ── Update ──────────────────────────────────────────────────────────────────
export class UpdateMasterManufacturerDto {
  @IsOptional() @IsString() @MaxLength(255) company?: string;
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(1000) logoUrl?: string;
  @IsOptional() @IsString() @MaxLength(50) vatNo?: string;
  @IsOptional() @IsEmail() @MaxLength(255) email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(1000) address?: string;
  @IsOptional() @IsString() @MaxLength(255) city?: string;
  @IsOptional() @IsString() @MaxLength(255) state?: string;
  @IsOptional() @IsString() @MaxLength(50) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(255) country?: string;
  @IsOptional() @IsString() @MaxLength(2000) invoiceFooter?: string;
  @IsOptional() @IsString() @MaxLength(255) cf1?: string;
  @IsOptional() @IsString() @MaxLength(255) cf2?: string;
  @IsOptional() @IsString() @MaxLength(255) cf3?: string;
  @IsOptional() @IsString() @MaxLength(255) cf4?: string;
  @IsOptional() @IsString() @MaxLength(255) cf5?: string;
  @IsOptional() @IsString() @MaxLength(255) cf6?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
