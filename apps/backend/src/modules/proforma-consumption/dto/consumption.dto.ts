import {
  ArrayNotEmpty,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

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
}
