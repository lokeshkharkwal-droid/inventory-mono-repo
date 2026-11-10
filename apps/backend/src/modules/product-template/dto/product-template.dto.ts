import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Create a product template (legacy SITE master_products). */
export class CreateProductTemplateDto {
  @IsString() @MaxLength(255) name: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() @MaxLength(255) category?: string;
  @IsOptional() @IsString() @MaxLength(50) unit?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) price?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cost?: number;
  @IsOptional() @IsString() @MaxLength(50) hsnCode?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

/** Update a product template (all fields optional). */
export class UpdateProductTemplateDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() @MaxLength(255) category?: string;
  @IsOptional() @IsString() @MaxLength(50) unit?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) price?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cost?: number;
  @IsOptional() @IsString() @MaxLength(50) hsnCode?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

/** List filters for product templates. */
export class ProductTemplateQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(255) search?: string;
}

/** Create a real product from a template (supply the required category). */
export class CreateFromTemplateDto {
  @IsString() categoryId: string;
  @IsOptional() @IsString() @MaxLength(100) code?: string;
}
