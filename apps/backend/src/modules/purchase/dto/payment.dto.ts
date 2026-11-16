import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Record a payment against a purchase. */
export class CreatePurchasePaymentDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  method?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  // ── Method-specific detail (cheque / card) ──
  @IsOptional() @IsString() @MaxLength(100) chequeNo?: string;
  @IsOptional() @IsString() @MaxLength(100) ccNo?: string;
  @IsOptional() @IsString() @MaxLength(100) ccHolder?: string;
  @IsOptional() @IsString() @MaxLength(50) ccType?: string;
  @IsOptional() @IsString() @MaxLength(4) ccMonth?: string;
  @IsOptional() @IsString() @MaxLength(4) ccYear?: string;
}

/** Update an existing purchase payment (all fields optional). */
export class UpdatePurchasePaymentDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01) amount?: number;
  @IsOptional() @IsString() @MaxLength(50) method?: string;
  @IsOptional() @IsString() @MaxLength(100) reference?: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsOptional() @IsString() @MaxLength(100) chequeNo?: string;
  @IsOptional() @IsString() @MaxLength(100) ccNo?: string;
  @IsOptional() @IsString() @MaxLength(100) ccHolder?: string;
  @IsOptional() @IsString() @MaxLength(50) ccType?: string;
  @IsOptional() @IsString() @MaxLength(4) ccMonth?: string;
  @IsOptional() @IsString() @MaxLength(4) ccYear?: string;
}

/** Bulk payment across several of a supplier's outstanding purchases. */
export class SupplierBulkPaymentDto {
  @IsString()
  supplierId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional() @IsString() @MaxLength(50) method?: string;
  @IsOptional() @IsString() @MaxLength(100) reference?: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsOptional() @IsString() @MaxLength(100) chequeNo?: string;

  /**
   * Explicit allocation (purchaseId → amount). When omitted the amount is
   * applied oldest-first across the supplier's outstanding purchases.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SupplierPaymentAllocationDto)
  allocations?: SupplierPaymentAllocationDto[];
}

/** One (purchase, amount) allocation within a bulk supplier payment. */
export class SupplierPaymentAllocationDto {
  @IsString()
  purchaseId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;
}

/** Record a purchase expense (freight/insurance/misc). */
export class CreatePurchaseExpenseDto {
  @Type(() => Number) @IsNumber() @Min(0.01) amount: number;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
  @IsOptional() @IsString() @MaxLength(100) reference?: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
