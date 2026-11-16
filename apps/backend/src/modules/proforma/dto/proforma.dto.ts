import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** A product line on a proforma. */
export class ProformaItemDto {
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

  /** 1 = Single (keep separate line); 2 = Combined (merge qty on re-add). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2])
  quantityMethod?: number;
}

/** An optional lab/radiology line (name + price) on a proforma. */
export class ProformaLabTestDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  /** Clinical line kind (legacy proforma lab/radiology/blood line types). */
  @IsOptional()
  @IsIn(['LAB_TEST', 'RADIOLOGY', 'BLOOD_DONATION', 'BLOOD_REQUEST'])
  type?: 'LAB_TEST' | 'RADIOLOGY' | 'BLOOD_DONATION' | 'BLOOD_REQUEST';
}

/** Create a proforma invoice. */
export class CreateProformaDto {
  /** Legacy EZHT proforma title/name — required. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  /** ACTIVE | INACTIVE (EZHT); legacy DRAFT | SENT | INVOICED still accepted. */
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'DRAFT', 'SENT', 'INVOICED'])
  status?: string;

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProformaLabTestDto)
  labTests?: ProformaLabTestDto[];

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ProformaItemDto)
  items: ProformaItemDto[];
}

/** Update a proforma's status. */
export class UpdateProformaStatusDto {
  @IsIn(['DRAFT', 'SENT', 'INVOICED'])
  status: 'DRAFT' | 'SENT' | 'INVOICED';
}

/** List filters for proformas. */
export class ProformaQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'SENT', 'INVOICED'])
  status?: string;
}
