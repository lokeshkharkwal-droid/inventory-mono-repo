import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Create a customer. */
export class CreateCustomerDto {
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
  creditLimit?: number;

  /** Optional link to a kalnostics patient id. */
  @IsOptional() @IsString() patientId?: string;
  /** Existing customer who referred this one (referral suggestions). */
  @IsOptional() @IsString() referredByCustomerId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;

  // EZ Health Track "Add Customer / Add Patient" parity fields.
  @IsOptional() @IsString() @MaxLength(255) contactPerson?: string;
  @IsOptional() @IsString() @MaxLength(100) vatNo?: string;
  @IsOptional() @IsString() @MaxLength(100) gstNo?: string;
  @IsOptional() @IsString() @MaxLength(100) panNo?: string;
  @IsOptional() @IsString() @MaxLength(100) gstState?: string;
  @IsOptional() @IsString() customerGroupId?: string;
  // Patient clinical-registration fields (EZHT add_patient.php).
  @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @IsOptional() @IsString() @MaxLength(100) middleName?: string;
  @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @IsOptional() @IsString() @MaxLength(20) gender?: string;
  @IsOptional() @IsString() @MaxLength(15) age?: string;
  @IsOptional() @IsDateString() dob?: string;
  @IsOptional() @IsDateString() registrationDate?: string;
  @IsOptional() @IsString() @MaxLength(50) patientType?: string;
  @IsOptional() @IsString() @MaxLength(255) address2?: string;
  @IsOptional() @IsString() areaId?: string;
  @IsOptional() @IsString() @MaxLength(255) area?: string;
  @IsOptional() @IsString() @MaxLength(50) idType?: string;
  @IsOptional() @IsString() @MaxLength(50) uid?: string;
  @IsOptional() @IsString() countryId?: string;
  @IsOptional() @IsString() stateId?: string;
  @IsOptional() @IsString() cityId?: string;
  @IsOptional() @IsString() @MaxLength(100) country?: string;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(255) ccf1?: string;
  @IsOptional() @IsString() @MaxLength(255) ccf2?: string;
  @IsOptional() @IsString() @MaxLength(255) ccf3?: string;
  @IsOptional() @IsString() @MaxLength(255) ccf4?: string;
  @IsOptional() @IsString() @MaxLength(255) ccf5?: string;
  @IsOptional() @IsString() @MaxLength(255) ccf6?: string;
}

/** Update a customer (all fields optional). */
export class UpdateCustomerDto {
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
  creditLimit?: number;

  @IsOptional() @IsString() patientId?: string;
  @IsOptional() @IsString() referredByCustomerId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;

  // EZ Health Track "Add Customer / Add Patient" parity fields.
  @IsOptional() @IsString() @MaxLength(255) contactPerson?: string;
  @IsOptional() @IsString() @MaxLength(100) vatNo?: string;
  @IsOptional() @IsString() @MaxLength(100) gstNo?: string;
  @IsOptional() @IsString() @MaxLength(100) panNo?: string;
  @IsOptional() @IsString() @MaxLength(100) gstState?: string;
  @IsOptional() @IsString() customerGroupId?: string;
  // Patient clinical-registration fields (EZHT add_patient.php).
  @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @IsOptional() @IsString() @MaxLength(100) middleName?: string;
  @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @IsOptional() @IsString() @MaxLength(20) gender?: string;
  @IsOptional() @IsString() @MaxLength(15) age?: string;
  @IsOptional() @IsDateString() dob?: string;
  @IsOptional() @IsDateString() registrationDate?: string;
  @IsOptional() @IsString() @MaxLength(50) patientType?: string;
  @IsOptional() @IsString() @MaxLength(255) address2?: string;
  @IsOptional() @IsString() areaId?: string;
  @IsOptional() @IsString() @MaxLength(255) area?: string;
  @IsOptional() @IsString() @MaxLength(50) idType?: string;
  @IsOptional() @IsString() @MaxLength(50) uid?: string;
  @IsOptional() @IsString() countryId?: string;
  @IsOptional() @IsString() stateId?: string;
  @IsOptional() @IsString() cityId?: string;
  @IsOptional() @IsString() @MaxLength(100) country?: string;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @IsOptional() @IsString() @MaxLength(255) ccf1?: string;
  @IsOptional() @IsString() @MaxLength(255) ccf2?: string;
  @IsOptional() @IsString() @MaxLength(255) ccf3?: string;
  @IsOptional() @IsString() @MaxLength(255) ccf4?: string;
  @IsOptional() @IsString() @MaxLength(255) ccf5?: string;
  @IsOptional() @IsString() @MaxLength(255) ccf6?: string;
}

/** Record a customer deposit / advance ledger entry. */
export class CreateCustomerDepositDto {
  @Type(() => Number) @IsNumber() amount: number;

  @IsOptional()
  @IsIn(['DEPOSIT', 'WITHDRAWAL', 'ADJUSTMENT'])
  type?: 'DEPOSIT' | 'WITHDRAWAL' | 'ADJUSTMENT';

  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsOptional() @IsString() date?: string;
}

/** Bulk CSV/Excel import of customers (preview with `dryRun`, then commit). */
export class ImportCustomersDto {
  @IsOptional() @IsBoolean() dryRun?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateCustomerDto)
  rows: CreateCustomerDto[];
}

/** List filters for customers. */
export class CustomerQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(255) search?: string;
  @IsOptional() @IsIn(['active', 'inactive']) status?: 'active' | 'inactive';
  /** When 'true', only customers linked to a kalnostics patient (Patients tab). */
  @IsOptional() @IsIn(['true', 'false']) patient?: 'true' | 'false';
}
