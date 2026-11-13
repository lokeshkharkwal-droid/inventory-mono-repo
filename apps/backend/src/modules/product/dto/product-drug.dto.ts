import { IsOptional, IsString, MaxLength } from 'class-validator';

/** A drug-composition row (EZHT "Drugs" modal): drug name + unit value + unit. */
export class ProductDrugDto {
  @IsString() @MaxLength(255) name: string;
  @IsOptional() @IsString() @MaxLength(100) unitValue?: string;
  @IsOptional() @IsString() @MaxLength(100) unit?: string;
}
