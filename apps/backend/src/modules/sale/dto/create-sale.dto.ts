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

/** A line on a sale (full EZHT add-sale parity). */
export class SaleItemDto {
  @IsString()
  productId: string;

  /** Product variant/option id, when the product has variants. */
  @IsOptional()
  @IsString()
  optionId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  /** Per-unit discount: a flat amount or a percentage like "10%". */
  @IsOptional()
  @toSpec()
  @IsString()
  @MaxLength(20)
  discount?: string;

  /** Tax-rate percentage for the line (e.g. 18). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxRate?: number;

  /** Tax-rate catalogue id (for snapshotting which rate was used). */
  @IsOptional()
  @IsString()
  taxRateId?: string;

  /** True when `price` already includes tax (legacy tax_method = 1). */
  @IsOptional()
  @IsBoolean()
  taxInclusive?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  hsnCode?: string;

  /** Batch / serial number for the sold units. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNo?: string;

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
}

/** Optional payment captured together with the sale (status partial/paid). */
export class SalePaymentInputDto {
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
  @IsOptional() @IsString() @MaxLength(100) giftCardNo?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

/** Create a sales invoice (full EZHT add-sale parity). */
export class CreateSaleDto {
  @IsString()
  customerId: string;

  /** Warehouse (kalnostics branch) the sale is rung at; defaults to active branch. */
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  billerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  billerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  /** COMPLETED removes stock immediately; PENDING does not. */
  @IsOptional()
  @IsIn(['COMPLETED', 'PENDING'])
  status?: 'COMPLETED' | 'PENDING';

  /** Order discount: a flat amount or a percentage like "5%". */
  @IsOptional()
  @toSpec()
  @IsString()
  @MaxLength(20)
  orderDiscount?: string;

  /** Order-level tax percentage. */
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

  /** India GST: true ⇒ IGST (inter-state); false ⇒ CGST+SGST (intra-state). */
  @IsOptional()
  @IsBoolean()
  interState?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  staffNote?: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  doctorName?: string;

  @IsOptional()
  @IsString()
  quoteId?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SalePaymentInputDto)
  payment?: SalePaymentInputDto;
}
