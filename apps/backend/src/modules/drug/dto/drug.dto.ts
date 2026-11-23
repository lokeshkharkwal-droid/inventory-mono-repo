import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Create a drug in the tenant drug master (EZHT `pharmacy_drug`). */
export class CreateDrugDto {
  @IsString() @MaxLength(255) name: string;
  @IsOptional() @IsString() @MaxLength(255) dosage?: string;
  @IsOptional() @IsString() @MaxLength(1000) sideEffect?: string;
  @IsOptional() @IsString() @MaxLength(1000) indication?: string;
  @IsOptional() @IsString() @MaxLength(1000) contraIndication?: string;
  @IsOptional() @IsString() @MaxLength(255) formulation?: string;
  @IsOptional() @IsString() @MaxLength(1000) storageCondition?: string;
  @IsOptional() @IsString() @MaxLength(1000) precaution?: string;
  @IsOptional() @IsString() @MaxLength(1000) safety?: string;
  @IsOptional() @IsString() @MaxLength(255) therapeuticGroup?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

/** Update a drug (all fields optional). */
export class UpdateDrugDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsString() @MaxLength(255) dosage?: string;
  @IsOptional() @IsString() @MaxLength(1000) sideEffect?: string;
  @IsOptional() @IsString() @MaxLength(1000) indication?: string;
  @IsOptional() @IsString() @MaxLength(1000) contraIndication?: string;
  @IsOptional() @IsString() @MaxLength(255) formulation?: string;
  @IsOptional() @IsString() @MaxLength(1000) storageCondition?: string;
  @IsOptional() @IsString() @MaxLength(1000) precaution?: string;
  @IsOptional() @IsString() @MaxLength(1000) safety?: string;
  @IsOptional() @IsString() @MaxLength(255) therapeuticGroup?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

/** List filters for the drug master (search doubles as autocomplete). */
export class DrugQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(255) search?: string;
  @IsOptional() @IsIn(['active', 'inactive']) status?: 'active' | 'inactive';
}
