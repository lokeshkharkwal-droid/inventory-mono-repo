import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * A product drug-composition row (EZHT "Drugs" modal / `ez_product_relation`):
 * a link to a master drug (`drugId`) + unit value + unit. `name` is accepted as a
 * fallback for legacy free-text entry; when `drugId` is given the name is resolved
 * from the master. At least one of `drugId`/`name` must be supplied.
 */
export class ProductDrugDto {
  @IsOptional() @IsString() @MaxLength(255) drugId?: string;
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(100) unitValue?: string;
  @IsOptional() @IsString() @MaxLength(100) unit?: string;
}
