import { Type } from 'class-transformer';
import {
  IsArray,
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

/** List filters for the master proforma catalogue. */
export class MasterProformaQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(255) search?: string;
}

/** A single proforma line: a master product (optional) + optional lab-test id, qty. */
export class MasterProformaItemDto {
  @IsOptional() @IsString() masterProductId?: string;
  @IsOptional() @IsString() labTestId?: string;
  @Type(() => Number) @IsNumber() @Min(0) quantity: number;
}

export class CreateMasterProformaDto {
  @IsString() @MaxLength(255) name: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE']) status?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MasterProformaItemDto)
  items?: MasterProformaItemDto[];
}

export class UpdateMasterProformaDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE']) status?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MasterProformaItemDto)
  items?: MasterProformaItemDto[];
}
