import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** A purchase-return line (carries the source line's tax/discount/batch). */
export class PurchaseReturnItemDto {
  @IsString()
  productId: string;

  /** The original purchase item this return line comes from (EZHT purchase_item_id). */
  @IsOptional()
  @IsString()
  purchaseItemId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  /** Net unit cost from the source line. */
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost: number;

  @IsOptional() @Type(() => Number) @IsNumber() taxRate?: number;
  @IsOptional() @IsString() @MaxLength(20) discount?: string;
  @IsOptional() @IsString() @MaxLength(100) batchNo?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
  @IsOptional() @Type(() => Number) @IsNumber() mrp?: number;
  @IsOptional() @IsString() @MaxLength(20) hsnCode?: string;
  @IsOptional() @Type(() => Number) @IsNumber() packSize?: number;
}

/** Create a purchase return (reverses inbound stock). */
export class CreatePurchaseReturnDto {
  @IsString()
  purchaseId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  /** Restocking/return charge deducted from the refund (EZHT `return_surcharge`). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  surcharge?: number;

  /** GST mode: true = IGST (inter-state), false = CGST+SGST (intra-state). */
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
  attachmentUrl?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PurchaseReturnItemDto)
  items: PurchaseReturnItemDto[];
}

/** List filters for purchase returns. */
export class PurchaseReturnQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  purchaseId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
