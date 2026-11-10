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
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Create a material (consumable/equipment). */
export class CreateMaterialDto {
  @IsString() @MaxLength(255) name: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() @MaxLength(255) category?: string;
  @IsOptional() @IsString() @MaxLength(50) unit?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) quantity?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cost?: number;

  @IsOptional() @IsString() @MaxLength(1000) note?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

/** Update a material (all fields optional). */
export class UpdateMaterialDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(50) code?: string;
  @IsOptional() @IsString() @MaxLength(255) category?: string;
  @IsOptional() @IsString() @MaxLength(50) unit?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) quantity?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cost?: number;

  @IsOptional() @IsString() @MaxLength(1000) note?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

/** Bulk CSV/Excel import of materials (preview with `dryRun`, then commit). */
export class ImportMaterialsDto {
  @IsOptional() @IsBoolean() dryRun?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateMaterialDto)
  rows: CreateMaterialDto[];
}

/** List filters for materials. */
export class MaterialQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(255) search?: string;
  @IsOptional() @IsIn(['active', 'inactive']) status?: 'active' | 'inactive';
}

/** Record a material damage/loss. */
export class CreateMaterialDamageDto {
  @Type(() => Number) @IsNumber() @Min(0.0001) quantity: number;
  @IsOptional() @IsString() @MaxLength(255) reason?: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

/** Record a material repair. */
export class CreateMaterialRepairDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cost?: number;
  @IsOptional() @IsIn(['PENDING', 'IN_PROGRESS', 'COMPLETED']) status?: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
