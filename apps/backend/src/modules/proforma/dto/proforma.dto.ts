import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** A product line on a proforma. */
export class ProformaItemDto {
  @IsString()
  productId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;

  /** 1 = Single (keep separate line); 2 = Combined (merge qty on re-add). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2])
  quantityMethod?: number;
}

/** An optional lab/radiology line (name + price) on a proforma. */
export class ProformaLabTestDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  /** Clinical line kind (legacy proforma lab/radiology/blood line types). */
  @IsOptional()
  @IsIn(['LAB_TEST', 'RADIOLOGY', 'BLOOD_DONATION', 'BLOOD_REQUEST'])
  type?: 'LAB_TEST' | 'RADIOLOGY' | 'BLOOD_DONATION' | 'BLOOD_REQUEST';
}

/** Create a proforma invoice. */
export class CreateProformaDto {
  /** Legacy EZHT proforma title/name — required. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  /** ACTIVE | INACTIVE (EZHT); legacy DRAFT | SENT | INVOICED still accepted. */
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'DRAFT', 'SENT', 'INVOICED'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  orderDiscount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shipping?: number;

  /**
   * Rich-text (HTML) note from the TinyMCE editor. The cap is deliberately
   * huge — it mirrors the frontend's `NOTE_MAX_LENGTH`
   * (`apps/frontend/src/lib/text-limits.ts`); change both together. The column
   * is `text`, and the JSON body limit is 10 MB.
   */
  @IsOptional()
  @IsString()
  @MaxLength(1_000_000)
  note?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProformaLabTestDto)
  labTests?: ProformaLabTestDto[];

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ProformaItemDto)
  items: ProformaItemDto[];
}

/** The external-entity kinds a proforma can be mapped to (EZHT `entity_type`). */
export const PROFORMA_RELATION_TYPES = [
  'lab_test',
  'branch',
  'radiology',
  'blood_donation_type',
  'blood_request_type',
] as const;
export type ProformaRelationType = (typeof PROFORMA_RELATION_TYPES)[number];

/** Add a proforma ↔ entity mapping (e.g. a lab test or a branch). */
export class CreateProformaRelationDto {
  /** Which catalogue `entityId` points at. */
  @IsIn(PROFORMA_RELATION_TYPES)
  entityType: ProformaRelationType;

  /** The mapped entity id (kalnostics master LabTest.id, Branch.id, …). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  entityId: string;

  /** Optional display-name snapshot (test / branch name) for the mapping list. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;
}

/** Filter proforma relations by type. */
export class ProformaRelationQueryDto {
  @IsOptional()
  @IsIn(PROFORMA_RELATION_TYPES)
  type?: ProformaRelationType;
}

/** Update a proforma's status. */
export class UpdateProformaStatusDto {
  @IsIn(['DRAFT', 'SENT', 'INVOICED'])
  status: 'DRAFT' | 'SENT' | 'INVOICED';
}

/** List filters for proformas. */
export class ProformaQueryDto extends PaginationQueryDto {
  /** Matches the proforma name or reference (case-insensitive). */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  /** Name column filter (case-insensitive "contains"). */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  /** ACTIVE | INACTIVE (EZHT); legacy DRAFT | SENT | INVOICED still accepted. */
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'DRAFT', 'SENT', 'INVOICED'])
  status?: string;

  /**
   * Date window (ISO instants): `dateFrom` inclusive, `dateTo` exclusive. The
   * list's Date filter sends the bounds of the user's local calendar day.
   */
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
