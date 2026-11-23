import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Resolve whether a set of lab tests pull inventory at a branch and whether
 * there is enough stock — called by kalnostics-new BEFORE an order is finalized.
 */
export class ValidateConsumptionDto {
  /** The order's active kalnostics branch id. */
  @IsString()
  @IsNotEmpty()
  branchId: string;

  /** Master `LabTest.id`s on the order (branch lab test `sourceLabTestId`s). */
  @IsArray()
  @IsString({ each: true })
  labTestSourceIds: string[];
}

/**
 * Deduct the proforma-mapped products for a confirmed kalnostics-new order and
 * record the linked sale. Idempotent on `kalnosticsOrderId`.
 */
export class ConsumeConsumptionDto {
  /** The kalnostics `Order.id` (idempotency key). */
  @IsString()
  @IsNotEmpty()
  kalnosticsOrderId: string;

  /** The kalnostics order code (`ORD-00001`) — used as the sale reference. */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  orderCode?: string;

  /** The order's active kalnostics branch id (where stock is pulled). */
  @IsString()
  @IsNotEmpty()
  branchId: string;

  /** Master `LabTest.id`s on the order. */
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  labTestSourceIds: string[];

  /** Kalnostics patient id — linked to / used to get-or-create the sale customer. */
  @IsOptional()
  @IsString()
  patientId?: string;

  /** Patient display name — the sale's customer name. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  patientName?: string;

  /** Order date (defaults to now) — the sale's transaction date. */
  @IsOptional()
  @IsDateString()
  date?: string;

  /**
   * The deduction-ledger granularity, from the tenant's manual-adjustment mode.
   * `ORDER` (default) aggregates one deduction per product across the whole order;
   * `TEST` records one deduction per product PER lab test (Combined counts once per
   * test). Fixes how per-test manual adjustment later reads "previously deducted".
   */
  @IsOptional()
  @IsIn(['ORDER', 'TEST'])
  scope?: 'ORDER' | 'TEST';
}

/** One product's target (final) deducted quantity in a manual adjustment save. */
export class AdjustmentLineDto {
  /** The inventory product being adjusted. */
  @IsString()
  @IsNotEmpty()
  productId: string;

  /** The final quantity that should be deducted from stock for this scope+product. */
  @IsNumber()
  @Min(0)
  finalQty: number;
}

/**
 * Load the manual-adjustment view (planned / previously-deducted / current stock
 * per product) for a kalnostics order, at order or test granularity.
 */
export class LoadAdjustmentDto {
  /** The kalnostics `Order.id`. */
  @IsString()
  @IsNotEmpty()
  kalnosticsOrderId: string;

  /** The order's active kalnostics branch id (where stock is pulled). */
  @IsString()
  @IsNotEmpty()
  branchId: string;

  /** Granularity: whole order, or one lab test. */
  @IsIn(['ORDER', 'TEST'])
  scope: 'ORDER' | 'TEST';

  /** The master `LabTest.id` to adjust — required when `scope = TEST`. */
  @IsOptional()
  @IsString()
  labTestSourceId?: string;

  /** All master `LabTest.id`s on the order (for proforma resolution / planned math). */
  @IsArray()
  @IsString({ each: true })
  labTestSourceIds: string[];
}

/** Apply a manual adjustment: set the final deducted quantity per product. */
export class SaveAdjustmentDto extends LoadAdjustmentDto {
  /** The per-product final quantities to apply. */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdjustmentLineDto)
  lines: AdjustmentLineDto[];

  /** Optional reason recorded in the adjustment history. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;

  /** Optional free-text note recorded in the adjustment history. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  /** Kalnostics patient id — for the sale customer when auto-deduction was off. */
  @IsOptional()
  @IsString()
  patientId?: string;

  /** Patient display name — the sale's customer name (auto-off first save). */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  patientName?: string;

  /** The kalnostics order code — the sale reference (auto-off first save). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  orderCode?: string;

  /** Order date (defaults to now) — the sale's transaction date (auto-off first save). */
  @IsOptional()
  @IsDateString()
  date?: string;
}
