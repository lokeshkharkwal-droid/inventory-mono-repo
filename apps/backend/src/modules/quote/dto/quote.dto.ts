import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
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
  @IsString()
  productId: string;

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

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;

  // EZ Health Track line parity.
  @IsOptional() @IsString() @MaxLength(50) packSize?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) packQuantity?: number;
  @IsOptional() @IsString() @MaxLength(30) productType?: string;
  @IsOptional() @IsString() optionId?: string;
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
  @IsOptional() @IsString() warehouseId?: string;
  @IsOptional() @IsIn(['DRAFT', 'SENT']) status?: 'DRAFT' | 'SENT';
  @IsOptional() @IsString() @MaxLength(50) gstNumber?: string;
  @IsOptional() @IsString() @MaxLength(50) gstState?: string;
  @IsOptional() @IsString() @MaxLength(1000) attachmentUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => QuoteReferralDto)
  referral?: QuoteReferralDto;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  orderDiscount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  orderTax?: number;

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

/** Update a quote's status. */
export class UpdateQuoteStatusDto {
  @IsIn(['DRAFT', 'SENT', 'APPROVED', 'REJECTED'])
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';
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
  @IsIn(['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'CONVERTED'])
  status?: string;
}
