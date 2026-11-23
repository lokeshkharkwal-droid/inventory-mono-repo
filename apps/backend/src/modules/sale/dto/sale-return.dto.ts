import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** A sale-return line. */
export class SaleReturnItemDto {
  @IsString()
  productId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  /** Batch/serial snapshot of the returned line (shown in the detail modal). */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNo?: string;
}

/** Create a sale return (restocks + optional refund). */
export class CreateSaleReturnDto {
  @IsString()
  saleId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  refundAmount?: number;

  /** EZHT return surcharge — SUBTRACTED from the grand total. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  surcharge?: number;

  /** Order-level discount on the return (subtracted from the grand total). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  orderDiscount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SaleReturnItemDto)
  items: SaleReturnItemDto[];
}

/** List filters for sale returns. */
export class SaleReturnQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  saleId?: string;
}
