import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** One product's new price/cost in a bulk price update. */
export class BulkPriceItemDto {
  @IsString() id: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) price?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) cost?: number;
}

/** Bulk update of product price/cost (legacy Products::update_price). */
export class BulkPriceUpdateDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BulkPriceItemDto)
  items: BulkPriceItemDto[];
}

/** Set a product's rack/bin location at the active branch (legacy set_rack). */
export class SetRackDto {
  @IsOptional() @IsString() @MaxLength(100) rack?: string;
}

/** Register one or more serial numbers for a serialized product. */
export class AddSerialsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  serials: string[];
}
