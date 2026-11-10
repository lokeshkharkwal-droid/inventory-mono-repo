import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Create a variant/option template (e.g. Size → [S, M, L]). */
export class CreateVariantDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  values: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Update a variant template (all fields optional). */
export class UpdateVariantDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  values?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** List filters for variant templates. */
export class VariantQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}
