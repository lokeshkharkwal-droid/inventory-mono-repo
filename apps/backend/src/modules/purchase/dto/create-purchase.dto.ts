import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Coerce an incoming number|string spec (e.g. 10 or "10%") to a string. */
const toSpec = () =>
  Transform(({ value }) =>
    value == null || value === '' ? undefined : String(value),
  );

/** A line on a purchase (full EZHT add-purchase parity). */
export class PurchaseItemDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  optionId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  /** Unit cost before discount/tax. */
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost: number;

  /** Maximum retail price (printed on stock). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  mrp?: number;

  /** Per-unit discount: a flat amount or a percentage like "10%". */
  @IsOptional()
  @toSpec()
  @IsString()
  @MaxLength(20)
  discount?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsString()
  taxRateId?: string;

  /** True when `cost` already includes tax (legacy tax_method = 1). */
  @IsOptional()
  @IsBoolean()
  taxInclusive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  hsnCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  batchNo?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  packSize?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  packQuantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  freePackQuantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  partNo?: string;
}

/** Optional payment captured together with the purchase (status partial/paid). */
export class PurchasePaymentInputDto {
  @IsOptional()
  @IsIn(['due', 'partial', 'paid', 'DUE', 'PARTIAL', 'PAID'])
  paymentStatus?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  paidBy?: string;

  @IsOptional() @IsString() @MaxLength(100) reference?: string;
  @IsOptional() @IsString() @MaxLength(100) chequeNo?: string;
  @IsOptional() @IsString() @MaxLength(100) ccNo?: string;
  @IsOptional() @IsString() @MaxLength(100) ccHolder?: string;
  @IsOptional() @IsString() @MaxLength(50) ccType?: string;
  @IsOptional() @IsString() @MaxLength(4) ccMonth?: string;
  @IsOptional() @IsString() @MaxLength(4) ccYear?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

/** Create a purchase (goods receipt from a supplier; full EZHT parity). */
export class CreatePurchaseDto {
  @IsString()
  supplierId: string;

  /** Warehouse (kalnostics branch) stock is received into; defaults to active branch. */
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  /** RECEIVED applies stock immediately; ORDERED/PENDING do not. */
  @IsOptional()
  @IsIn(['RECEIVED', 'ORDERED', 'PENDING'])
  status?: 'RECEIVED' | 'ORDERED' | 'PENDING';

  @IsOptional()
  @toSpec()
  @IsString()
  @MaxLength(20)
  orderDiscount?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  orderTax?: number;

  @IsOptional()
  @IsString()
  orderTaxId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shipping?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  paymentTerm?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  gstNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  gstState?: string;

  @IsOptional()
  @IsBoolean()
  interState?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  /** Audit note required when editing a received purchase. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  editNote?: string;

  /** Flag this PO as a blood-donation receipt (legacy BD purchase). */
  @IsOptional()
  @IsBoolean()
  isBloodDonation?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  donorName?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PurchasePaymentInputDto)
  payment?: PurchasePaymentInputDto;
}
