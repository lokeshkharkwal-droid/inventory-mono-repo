import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { CreateProductDto } from './create-product.dto';

/**
 * Bulk product import. The frontend parses the CSV/Excel into rows; the backend
 * validates references and persists. `dryRun` validates without persisting
 * (preview), returning the same per-row result shape.
 */
export class ImportProductsDto {
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateProductDto)
  rows: CreateProductDto[];
}
