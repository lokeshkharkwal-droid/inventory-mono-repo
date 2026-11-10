import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Create a currency. */
export class CreateCurrencyDto {
  @IsString() @MaxLength(10) code: string;
  @IsString() @MaxLength(255) name: string;
  @IsOptional() @IsString() @MaxLength(10) symbol?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  exchangeRate?: number;

  @IsOptional() @IsBoolean() isActive?: boolean;
}

/** Update a currency (all fields optional). */
export class UpdateCurrencyDto {
  @IsOptional() @IsString() @MaxLength(10) code?: string;
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(10) symbol?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  exchangeRate?: number;

  @IsOptional() @IsBoolean() isActive?: boolean;
}

/** List filters for currencies. */
export class CurrencyQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(255) search?: string;
  @IsOptional() @IsIn(['active', 'inactive']) status?: 'active' | 'inactive';
}
