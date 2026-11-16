import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** Record a payment received against a sale. */
export class CreateSalePaymentDto {
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

  // ── Method-specific detail (cheque / card / gift card) ──
  @IsOptional() @IsString() @MaxLength(100) chequeNo?: string;
  @IsOptional() @IsString() @MaxLength(100) ccNo?: string;
  @IsOptional() @IsString() @MaxLength(100) ccHolder?: string;
  @IsOptional() @IsString() @MaxLength(50) ccType?: string;
  @IsOptional() @IsString() @MaxLength(4) ccMonth?: string;
  @IsOptional() @IsString() @MaxLength(4) ccYear?: string;
  @IsOptional() @IsString() @MaxLength(100) giftCardNo?: string;
}

/** Update an existing sale payment (all fields optional). */
export class UpdateSalePaymentDto {
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
  @IsOptional() @IsString() @MaxLength(100) giftCardNo?: string;
}
