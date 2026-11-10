import { Type } from 'class-transformer';
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

/** A line on a purchase. */
export class PurchaseItemDto {
  @IsString()
  productId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost: number;

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

  @IsOptional()
  @IsString()
  @MaxLength(100)
  batchNo?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

/** Create a purchase (goods receipt from a supplier). */
export class CreatePurchaseDto {
  @IsString()
  supplierId: string;

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
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  orderDiscount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shipping?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

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
}
