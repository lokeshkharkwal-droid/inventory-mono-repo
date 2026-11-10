import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Create a unit of measure. */
export class CreateUnitDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  /** Optional base unit for conversion. */
  @IsOptional()
  @IsString()
  baseUnitId?: string;

  /** Conversion operator against the base unit. */
  @IsOptional()
  @IsIn(['*', '/'])
  operator?: '*' | '/';

  /** Conversion factor applied with `operator`. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  operationValue?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Update a unit (all fields optional). */
export class UpdateUnitDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @IsString()
  baseUnitId?: string;

  @IsOptional()
  @IsIn(['*', '/'])
  operator?: '*' | '/';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  operationValue?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** List filters for units. */
export class UnitQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}
