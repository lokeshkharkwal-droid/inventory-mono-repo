import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  NotEquals,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/**
 * Record a stock adjustment at the active branch. `quantity` is a signed delta
 * (positive = addition, negative = subtraction); `cost` is used to recompute the
 * branch average cost on additions. The remaining fields mirror the legacy EZHT
 * adjustment form (date, variant, pack/batch/expiry/MRP). On an addition with a
 * `batchNo`/`expiryDate`, a batch row is also created.
 */
export class RecordAdjustmentDto {
  @Type(() => Number)
  @IsNumber()
  @NotEquals(0)
  quantity: number;

  /** Unit cost for the added quantity (additions only). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  cost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  // ── EZHT full-adjustment parity ──
  /** Effective adjustment date (ISO). Defaults to now. */
  @IsOptional() @IsDateString() adjustedAt?: string;
  @IsOptional() @IsString() variantId?: string;
  @IsOptional() @IsString() @MaxLength(100) packSize?: string;
  @IsOptional() @Type(() => Number) @IsNumber() packQuantity?: number;
  @IsOptional() @IsString() @MaxLength(100) batchNo?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
  @IsOptional() @Type(() => Number) @IsNumber() packMrp?: number;
  @IsOptional() @Type(() => Number) @IsNumber() unitMrp?: number;
}

/** Update an existing adjustment's descriptive fields (not the applied quantity). */
export class UpdateAdjustmentDto {
  @IsOptional() @IsString() @MaxLength(100) reason?: string;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
  @IsOptional() @IsDateString() adjustedAt?: string;
  @IsOptional() @IsString() @MaxLength(100) batchNo?: string;
  @IsOptional() @IsDateString() expiryDate?: string;
}

/** List filters for a product's adjustment history. */
export class AdjustmentQueryDto extends PaginationQueryDto {
  /** Optional branch filter (defaults to the active branch in the controller). */
  @IsOptional()
  @IsString()
  branchId?: string;
}

/** List filters for the tenant-wide adjustment history page. */
export class AllAdjustmentsQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsString() @MaxLength(255) search?: string;
}
