import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsBooleanString,
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

/** A line on a requisition (product + quantity + optional line money). */
export class RequisitionItemDto {
  @IsString()
  productId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  /** Requested unit price (net unit price); defaults to the product cost. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  /** Per-unit discount spec: a flat amount or a percentage like "10%". */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  discount?: string;

  /** Tax-rate percentage for the line (e.g. 18 for 18%). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @IsString()
  taxRateId?: string;

  /** When true the entered price already includes tax. */
  @IsOptional()
  @IsBoolean()
  taxInclusive?: boolean;

  @IsOptional()
  @IsString()
  optionId?: string;

  /** The specific source-branch batch chosen for this line (EZHT batch/option). */
  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  batchNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNo?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

/** EZ Health Track referral block (legacy `ReferralForm[...]`). */
export class RequisitionReferralDto {
  /** doctor | insurance | personal | agency | hospital. */
  @IsOptional()
  @IsIn(['doctor', 'insurance', 'personal', 'agency', 'hospital'])
  sourceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactFname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactMname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactLname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  businessName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  businessAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  doctorName?: string;

  @IsOptional()
  @IsString()
  slnId?: string;
}

/** Create a requisition (request from the active/destination branch). */
export class CreateRequisitionDto {
  /** Preferred source branch to fulfil from (legacy `source_branch_id`). */
  @IsOptional()
  @IsString()
  fromBranchId?: string;

  /**
   * Destination branch (legacy `warehouse_id`). EZHT lets the user pick this;
   * when omitted it defaults to the caller's active branch. Always validated
   * against the caller's tenant before use.
   */
  @IsOptional()
  @IsString()
  toBranchId?: string;

  @IsOptional()
  @IsString()
  fromDepartmentId?: string;

  @IsOptional()
  @IsString()
  toDepartmentId?: string;

  /** EZHT identity fields (id + snapshotted display name). */
  @IsOptional()
  @IsString()
  billerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  billerName?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  supplierName?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customerName?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => RequisitionReferralDto)
  referral?: RequisitionReferralDto;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsBoolean()
  localPurchase?: boolean;

  /** Initial status — EZ Health Track add form offers Pending / Sent. */
  @IsOptional()
  @IsIn(['PENDING', 'SENT'])
  status?: string;

  /** Order-level discount spec: a flat amount or "10%". */
  @IsOptional()
  @IsString()
  @MaxLength(20)
  orderDiscount?: string;

  /** Order-level tax percentage applied after the order discount. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  orderTax?: number;

  @IsOptional()
  @IsString()
  orderTaxId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shipping?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  attachmentUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => RequisitionItemDto)
  items: RequisitionItemDto[];
}

/** Approve a requisition, optionally setting the fulfilling source branch. */
export class ApproveRequisitionDto {
  @IsOptional()
  @IsString()
  fromBranchId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

/** Reject a requisition with an optional reason. */
export class RejectRequisitionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

/** Convert an approved requisition into a stock transfer. */
export class ConvertToTransferDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

/** List filters for requisitions. */
export class RequisitionQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED', 'RECEIVED', 'TRANSFERRED'])
  status?: string;

  /**
   * When truthy, list **incoming** requisitions this branch must fulfil
   * (`fromBranchId` = active branch) — the "Received Requisitions" view.
   * Otherwise list **outgoing** requisitions this branch raised
   * (`branchId` = active branch). Query string: `'true'` / `'false'`.
   */
  @IsOptional()
  @IsBooleanString()
  received?: string;
}
