import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Admit an inpatient. */
export class CreateAdmissionDto {
  @IsString() @MaxLength(255) patientName: string;
  @IsOptional() @IsString() @MaxLength(100) admissionNo?: string;
  @IsOptional() @IsString() patientId?: string;
  @IsOptional() @IsString() @MaxLength(100) ward?: string;
  @IsOptional() @IsString() @MaxLength(100) bed?: string;
  @IsOptional() @IsString() @MaxLength(255) referringDoctor?: string;
  @IsOptional() @IsDateString() admittedAt?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

/** Update an admission's editable fields. */
export class UpdateAdmissionDto {
  @IsOptional() @IsString() @MaxLength(255) patientName?: string;
  @IsOptional() @IsString() @MaxLength(100) ward?: string;
  @IsOptional() @IsString() @MaxLength(100) bed?: string;
  @IsOptional() @IsString() @MaxLength(255) referringDoctor?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

/** List filters for admissions. */
export class AdmissionQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(255) search?: string;
  @IsOptional() @IsIn(['ADMITTED', 'DISCHARGED']) status?: string;
}

/** Add a billable charge to an admission. */
export class CreateChargeDto {
  @IsString() @MaxLength(255) description: string;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
  @Type(() => Number) @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsDateString() date?: string;
}
