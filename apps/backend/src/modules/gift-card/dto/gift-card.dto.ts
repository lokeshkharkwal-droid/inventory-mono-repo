import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Create a gift card (balance starts equal to value). */
export class CreateGiftCardDto {
  @IsString() @MaxLength(50) code: string;

  @Type(() => Number) @IsNumber() @Min(0) value: number;

  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

/** Redeem an amount from a gift card. */
export class RedeemGiftCardDto {
  @Type(() => Number) @IsNumber() @Min(0.01) amount: number;
}

/** List filters for gift cards. */
export class GiftCardQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(50) search?: string;
  @IsOptional()
  @IsIn(['ACTIVE', 'USED', 'EXPIRED', 'CANCELLED'])
  status?: string;
}
