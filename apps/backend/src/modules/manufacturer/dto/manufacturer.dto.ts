import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Create a manufacturer (maker company/party). */
export class CreateManufacturerDto {
  @IsString() @MaxLength(255) name: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() @MaxLength(255) companyName?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsEmail() @MaxLength(255) email?: string;
  @IsOptional() @IsString() @MaxLength(255) website?: string;
  @IsOptional() @IsString() @MaxLength(1000) address?: string;
  @IsOptional() @IsString() @MaxLength(2048) imageUrl?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;

  // EZ Health Track "Add Manufacturer" parity fields.
  @IsOptional() @IsString() @MaxLength(255) contactPerson?: string;
  @IsOptional() @IsString() @MaxLength(100) vatNo?: string;
  @IsOptional() @IsString() countryId?: string;
  @IsOptional() @IsString() stateId?: string;
  @IsOptional() @IsString() cityId?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(100) country?: string;
  @IsOptional() @IsString() @MaxLength(1000) invoiceFooter?: string;
  @IsOptional() @IsString() @MaxLength(255) cf1?: string;
  @IsOptional() @IsString() @MaxLength(255) cf2?: string;
  @IsOptional() @IsString() @MaxLength(255) cf3?: string;
  @IsOptional() @IsString() @MaxLength(255) cf4?: string;
  @IsOptional() @IsString() @MaxLength(255) cf5?: string;
  @IsOptional() @IsString() @MaxLength(255) cf6?: string;
}

/** Update a manufacturer (all fields optional). */
export class UpdateManufacturerDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() @MaxLength(255) companyName?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsEmail() @MaxLength(255) email?: string;
  @IsOptional() @IsString() @MaxLength(255) website?: string;
  @IsOptional() @IsString() @MaxLength(1000) address?: string;
  @IsOptional() @IsString() @MaxLength(2048) imageUrl?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;

  // EZ Health Track "Add Manufacturer" parity fields.
  @IsOptional() @IsString() @MaxLength(255) contactPerson?: string;
  @IsOptional() @IsString() @MaxLength(100) vatNo?: string;
  @IsOptional() @IsString() countryId?: string;
  @IsOptional() @IsString() stateId?: string;
  @IsOptional() @IsString() cityId?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(100) country?: string;
  @IsOptional() @IsString() @MaxLength(1000) invoiceFooter?: string;
  @IsOptional() @IsString() @MaxLength(255) cf1?: string;
  @IsOptional() @IsString() @MaxLength(255) cf2?: string;
  @IsOptional() @IsString() @MaxLength(255) cf3?: string;
  @IsOptional() @IsString() @MaxLength(255) cf4?: string;
  @IsOptional() @IsString() @MaxLength(255) cf5?: string;
  @IsOptional() @IsString() @MaxLength(255) cf6?: string;
}

/** List filters for manufacturers. */
export class ManufacturerQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(255) search?: string;
  @IsOptional() @IsIn(['active', 'inactive']) status?: 'active' | 'inactive';
}

/** Bulk CSV/Excel import of manufacturers (preview with `dryRun`, then commit). */
export class ImportManufacturersDto {
  @IsOptional() @IsBoolean() dryRun?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateManufacturerDto)
  rows: CreateManufacturerDto[];
}
