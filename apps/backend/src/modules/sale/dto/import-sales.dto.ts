import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { CreateSaleDto } from './create-sale.dto';

/**
 * Bulk CSV/Excel import of sales. Each row is a full sale document (header + line
 * items) — the frontend groups CSV line rows by reference into documents before
 * posting. Preview with `dryRun`, then commit.
 */
export class ImportSalesDto {
  @IsOptional() @IsBoolean() dryRun?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleDto)
  rows: CreateSaleDto[];
}
