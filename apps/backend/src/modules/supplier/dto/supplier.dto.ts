import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SORT_DIRS, type SortDir } from '../../../common/utils/party-list.util';

/** Columns the Suppliers list may be sorted by (reference table columns). */
export const SUPPLIER_SORT_FIELDS = [
  'companyName',
  'name',
  'email',
  'phone',
  'address',
  'gstNo',
  'isActive',
  'createdAt',
] as const;

/** Create a supplier. */
export class CreateSupplierDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() @MaxLength(255) companyName?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsEmail() @MaxLength(255) email?: string;
  @IsOptional() @IsString() @MaxLength(1000) address?: string;
  @IsOptional() @IsString() @MaxLength(100) taxNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  openingBalance?: number;

  @IsOptional() @IsBoolean() isActive?: boolean;

  // EZ Health Track "Add Supplier" parity fields.
  @IsOptional() @IsIn(['company', 'person']) type?: string;
  @IsOptional() @IsString() @MaxLength(255) contactPerson?: string;
  @IsOptional() @IsString() countryId?: string;
  @IsOptional() @IsString() stateId?: string;
  @IsOptional() @IsString() cityId?: string;
  @IsOptional() @IsString() @MaxLength(100) country?: string;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(100) drugLicense?: string;
  @IsOptional() @IsString() @MaxLength(100) vatNo?: string;
  @IsOptional() @IsString() @MaxLength(100) gstNo?: string;
  @IsOptional() @IsString() @MaxLength(100) panNo?: string;
  @IsOptional() @IsString() @MaxLength(100) gstState?: string;
  @IsOptional() @IsString() @MaxLength(255) cf1?: string;
  @IsOptional() @IsString() @MaxLength(255) cf2?: string;
  @IsOptional() @IsString() @MaxLength(255) cf3?: string;
  @IsOptional() @IsString() @MaxLength(255) cf4?: string;
  @IsOptional() @IsString() @MaxLength(255) cf5?: string;
  @IsOptional() @IsString() @MaxLength(255) cf6?: string;
}

/** Update a supplier (all fields optional). */
export class UpdateSupplierDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() @MaxLength(255) companyName?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsEmail() @MaxLength(255) email?: string;
  @IsOptional() @IsString() @MaxLength(1000) address?: string;
  @IsOptional() @IsString() @MaxLength(100) taxNumber?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  openingBalance?: number;

  @IsOptional() @IsBoolean() isActive?: boolean;

  // EZ Health Track "Add Supplier" parity fields.
  @IsOptional() @IsIn(['company', 'person']) type?: string;
  @IsOptional() @IsString() @MaxLength(255) contactPerson?: string;
  @IsOptional() @IsString() countryId?: string;
  @IsOptional() @IsString() stateId?: string;
  @IsOptional() @IsString() cityId?: string;
  @IsOptional() @IsString() @MaxLength(100) country?: string;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(100) drugLicense?: string;
  @IsOptional() @IsString() @MaxLength(100) vatNo?: string;
  @IsOptional() @IsString() @MaxLength(100) gstNo?: string;
  @IsOptional() @IsString() @MaxLength(100) panNo?: string;
  @IsOptional() @IsString() @MaxLength(100) gstState?: string;
  @IsOptional() @IsString() @MaxLength(255) cf1?: string;
  @IsOptional() @IsString() @MaxLength(255) cf2?: string;
  @IsOptional() @IsString() @MaxLength(255) cf3?: string;
  @IsOptional() @IsString() @MaxLength(255) cf4?: string;
  @IsOptional() @IsString() @MaxLength(255) cf5?: string;
  @IsOptional() @IsString() @MaxLength(255) cf6?: string;
}

/** Record a supplier-level payment (not tied to a specific purchase). */
export class CreateSupplierPaymentDto {
  @Type(() => Number) @IsNumber() @IsPositive() amount: number;
  @IsOptional() @IsString() @MaxLength(50) method?: string;
  @IsOptional() @IsString() @MaxLength(100) reference?: string;
  @IsOptional() @IsString() date?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

/** Bulk CSV/Excel import of suppliers (preview with `dryRun`, then commit). */
export class ImportSuppliersDto {
  @IsOptional() @IsBoolean() dryRun?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateSupplierDto)
  rows: CreateSupplierDto[];
}

/** List filters for suppliers. */
export class SupplierQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(255) search?: string;
  @IsOptional() @IsIn(['active', 'inactive']) status?: 'active' | 'inactive';

  // Per-column filters (EZHT DataTables column-filter row), each ILIKE %v%.
  @IsOptional() @IsString() @MaxLength(255) company?: string;
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(255) email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  /** Matches the composite Address column (address, city, state, country, postal code). */
  @IsOptional() @IsString() @MaxLength(255) address?: string;
  @IsOptional() @IsString() @MaxLength(100) gstNo?: string;

  @IsOptional()
  @IsIn(SUPPLIER_SORT_FIELDS)
  sortBy?: (typeof SUPPLIER_SORT_FIELDS)[number];
  @IsOptional() @IsIn(SORT_DIRS) sortDir?: SortDir;
}
