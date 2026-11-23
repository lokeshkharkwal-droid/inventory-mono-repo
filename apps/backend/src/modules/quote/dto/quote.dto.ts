import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Coerce an incoming number|string spec (e.g. 10 or "10%") to a string. */
const toSpec = () =>
  Transform(({ value }) =>
    value == null || value === '' ? undefined : String(value),
  );

/** Quote status values (EZHT parity): pending/sent/completed + approve flow. */
export const QUOTE_STATUSES = [
  'DRAFT',
  'SENT',
  'COMPLETED',
  'APPROVED',
  'REJECTED',
  'CONVERTED',
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

/** Statuses settable from the create/edit form (EZHT: pending/sent/completed). */
export const QUOTE_FORM_STATUSES = ['DRAFT', 'SENT', 'COMPLETED'] as const;

/** Referral sub-form captured on a quote (EZHT `ReferralForm`). */
export class QuoteReferralDto {
  @IsOptional() @IsString() @MaxLength(50) sourceType?: string;
  @IsOptional() @IsString() @MaxLength(100) contactFname?: string;
  @IsOptional() @IsString() @MaxLength(100) contactMname?: string;
  @IsOptional() @IsString() @MaxLength(100) contactLname?: string;
  @IsOptional() @IsString() @MaxLength(255) businessName?: string;
  @IsOptional() @IsString() @MaxLength(500) businessAddress?: string;
}

/** A line on a quote. */
export class QuoteItemDto {
  /** Catalogue product id. Omit for a manual (off-catalogue) line + supply a name. */
  @IsOptional()
  @IsString()
  productId?: string;

  /** Manual line name (required when `productId` is absent). */
  @IsOptional() @IsString() @MaxLength(255) productName?: string;
  @IsOptional() @IsString() @MaxLength(100) productCode?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxRate?: number;

  /** Tax-rate catalogue id (snapshot of which rate was used). */
  @IsOptional() @IsString() taxRateId?: string;

  /** True when `unitPrice` already includes tax (legacy tax_method = 1). */
  @IsOptional() @IsBoolean() taxInclusive?: boolean;

  /** Per-unit discount: a flat amount or a percentage like "10%". */
  @IsOptional()
  @toSpec()
  @IsString()
  @MaxLength(20)
  discount?: string;

  // EZ Health Track line parity.
  @IsOptional() @IsString() @MaxLength(50) packSize?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) packQuantity?: number;
  @IsOptional() @IsString() @MaxLength(30) productType?: string;
  @IsOptional() @IsString() optionId?: string;
  @IsOptional() @IsString() @MaxLength(100) serialNo?: string;
}

/** Create a quotation. */
export class CreateQuoteDto {
  @IsIn(['SALE', 'PURCHASE'])
  type: 'SALE' | 'PURCHASE';

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  // EZ Health Track "Add Quote" header parity.
  @IsOptional() @IsString() billerId?: string;
  @IsOptional() @IsString() @MaxLength(255) billerName?: string;
  @IsOptional() @IsString() warehouseId?: string;
  @IsOptional() @IsIn(QUOTE_FORM_STATUSES) status?: string;
  @IsOptional() @IsString() @MaxLength(50) gstNumber?: string;
  @IsOptional() @IsString() @MaxLength(50) gstState?: string;
  @IsOptional() @IsString() @MaxLength(1000) attachmentUrl?: string;

  /** India GST: true ⇒ IGST (inter-state); false ⇒ CGST+SGST (intra-state). */
  @IsOptional() @IsBoolean() interState?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => QuoteReferralDto)
  referral?: QuoteReferralDto;

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

  @IsOptional() @IsString() orderTaxId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shipping?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items: QuoteItemDto[];
}

/** Update a quote's status (approve/reject with an optional comment). */
export class UpdateQuoteStatusDto {
  @IsIn(['DRAFT', 'SENT', 'COMPLETED', 'APPROVED', 'REJECTED'])
  status: 'DRAFT' | 'SENT' | 'COMPLETED' | 'APPROVED' | 'REJECTED';

  /** Approval/rejection note stored on the status-history trail. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

/** Mark a quote converted, linking the sale/purchase created from its prefill. */
export class MarkQuoteConvertedDto {
  @IsString()
  convertedToId: string;
}

/** Bulk soft-delete selected quotes (EZHT listing bulk action). */
export class BulkDeleteQuotesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids: string[];
}

/** List filters for quotes. */
export class QuoteQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsIn(['SALE', 'PURCHASE'])
  type?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'SENT', 'COMPLETED', 'APPROVED', 'REJECTED', 'CONVERTED'])
  status?: string;

  /** Only quotes that include this product (Product Details quotations panel). */
  @IsOptional()
  @IsString()
  productId?: string;

  /** Inclusive start of the quote-date range (yyyy-mm-dd). */
  @IsOptional()
  @IsDateString()
  startDate?: string;

  /** Inclusive end of the quote-date range (yyyy-mm-dd). */
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
