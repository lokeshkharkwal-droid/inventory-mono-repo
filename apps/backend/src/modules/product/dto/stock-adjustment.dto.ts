import { Type } from 'class-transformer';
import {
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
 * branch average cost on additions.
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
}

/** List filters for a product's adjustment history. */
export class AdjustmentQueryDto extends PaginationQueryDto {
  /** Optional branch filter (defaults to the active branch in the controller). */
  @IsOptional()
  @IsString()
  branchId?: string;
}
