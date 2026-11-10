import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** Update the tenant's inventory settings (all fields optional). */
export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  defaultCurrencyCode?: string;

  @IsOptional()
  @IsBoolean()
  isOversellingAllowed?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rowsPerPage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  decimalPlaces?: number;

  @IsOptional() @IsString() @MaxLength(20) purchasePrefix?: string;
  @IsOptional() @IsString() @MaxLength(20) salePrefix?: string;
  @IsOptional() @IsString() @MaxLength(20) transferPrefix?: string;
  @IsOptional() @IsString() @MaxLength(20) requisitionPrefix?: string;

  /** POS cashier PIN (blank clears it). */
  @IsOptional() @IsString() @MaxLength(20) posPin?: string;

  /** Business profile shown on printed documents. */
  @IsOptional() @IsString() @MaxLength(255) businessName?: string;
  @IsOptional() @IsString() @MaxLength(1000) businessAddress?: string;
  @IsOptional() @IsString() @MaxLength(50) businessPhone?: string;
  @IsOptional() @IsString() @MaxLength(255) businessEmail?: string;

  /** Non-secret payment-gateway config (enabled flags / public display values). */
  @IsOptional()
  @IsObject()
  paymentGateways?: Record<string, unknown>;
}
