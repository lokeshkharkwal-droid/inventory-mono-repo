import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Create a tax rate. */
export class CreateTaxRateDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rate: number;

  @IsOptional()
  @IsIn(['percentage', 'fixed'])
  type?: 'percentage' | 'fixed';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  hsnCode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Update a tax rate (all fields optional). */
export class UpdateTaxRateDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rate?: number;

  @IsOptional()
  @IsIn(['percentage', 'fixed'])
  type?: 'percentage' | 'fixed';

  @IsOptional()
  @IsString()
  @MaxLength(50)
  hsnCode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** List filters for tax rates. */
export class TaxRateQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}
