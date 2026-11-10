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

/** Create a customer group (price tier). */
export class CreateCustomerGroupDto {
  @IsString() @MaxLength(255) name: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  percentage?: number;

  @IsOptional() @IsBoolean() isActive?: boolean;
}

/** Update a customer group (all fields optional). */
export class UpdateCustomerGroupDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  percentage?: number;

  @IsOptional() @IsBoolean() isActive?: boolean;
}

/** List filters for customer groups. */
export class CustomerGroupQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(255) search?: string;
  @IsOptional() @IsIn(['active', 'inactive']) status?: 'active' | 'inactive';
}
