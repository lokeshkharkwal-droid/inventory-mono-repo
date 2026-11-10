import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const COMPONENTS = ['WHOLE_BLOOD', 'RBC', 'PLASMA', 'PLATELETS'];

// ── Donors ───────────────────────────────────────────────────────────────────
export class CreateDonorDto {
  @IsString() @MaxLength(255) name: string;
  @IsIn(BLOOD_GROUPS) bloodGroup: string;
  @IsOptional() @IsString() patientId?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(255) email?: string;
  @IsOptional() @IsDateString() lastDonationDate?: string;
  @IsOptional() @IsIn(['ACTIVE', 'DEFERRED', 'REJECTED']) status?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class UpdateDonorDto {
  @IsOptional() @IsString() @MaxLength(255) name?: string;
  @IsOptional() @IsIn(BLOOD_GROUPS) bloodGroup?: string;
  @IsOptional() @IsString() patientId?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(255) email?: string;
  @IsOptional() @IsDateString() lastDonationDate?: string;
  @IsOptional() @IsIn(['ACTIVE', 'DEFERRED', 'REJECTED']) status?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class DonorQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(255) search?: string;
  @IsOptional() @IsIn(BLOOD_GROUPS) bloodGroup?: string;
}

// ── Donations ────────────────────────────────────────────────────────────────
export class CreateDonationDto {
  @IsString() donorId: string;
  @IsIn(BLOOD_GROUPS) bloodGroup: string;
  @IsOptional() @IsIn(COMPONENTS) component?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) volumeMl?: number;
  @IsOptional() @IsString() @MaxLength(100) bagNumber?: string;
  @IsOptional() @IsDateString() collectedAt?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class UpdateDonationStatusDto {
  @IsIn(['COLLECTED', 'TESTED', 'AVAILABLE', 'ISSUED', 'DISCARDED'])
  status: string;
}

export class DonationQueryDto extends PaginationQueryDto {
  @IsOptional() @IsIn(BLOOD_GROUPS) bloodGroup?: string;
  @IsOptional()
  @IsIn(['COLLECTED', 'TESTED', 'AVAILABLE', 'ISSUED', 'DISCARDED'])
  status?: string;
}

// ── Requests ─────────────────────────────────────────────────────────────────
export class CreateBloodRequestDto {
  @IsIn(BLOOD_GROUPS) bloodGroup: string;
  @IsOptional() @IsIn(COMPONENTS) component?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) units?: number;
  @IsOptional() @IsString() patientId?: string;
  @IsOptional() @IsString() @MaxLength(255) patientName?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class UpdateRequestStatusDto {
  @IsIn(['PENDING', 'FULFILLED', 'CANCELLED']) status: string;
}

export class BloodRequestQueryDto extends PaginationQueryDto {
  @IsOptional() @IsIn(['PENDING', 'FULFILLED', 'CANCELLED']) status?: string;
}

// ── Cross-matching ───────────────────────────────────────────────────────────
export class CreateCrossMatchDto {
  @IsString() requestId: string;
  @IsString() donationId: string;
  /** Manual override of the auto ABO/Rh result. */
  @IsOptional() @IsIn(['COMPATIBLE', 'INCOMPATIBLE']) result?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class CrossMatchQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() requestId?: string;
}
