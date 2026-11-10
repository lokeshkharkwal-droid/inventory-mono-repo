import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
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
  @IsOptional() @IsBoolean() isActive?: boolean;
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
  @IsOptional() @IsBoolean() isActive?: boolean;
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
