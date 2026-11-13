import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

/** Date-range filter shared by most reports (defaults applied in the service). */
export class ReportRangeDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

/** Filter for the expiry-alerts report. */
export class ExpiryQueryDto {
  /** Products/batches expiring within this many days (default 30). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days?: number;
}

/** Date range + party selector for the party-ledger report. */
export class PartyLedgerQueryDto extends ReportRangeDto {
  @IsIn(['customer', 'supplier'])
  party: 'customer' | 'supplier';

  @IsString()
  partyId: string;
}

/**
 * Superset of optional filters used by the migrated EZHealthTrack reports. Every
 * field is optional; each report reads only the ones it needs. Keeping one DTO
 * (rather than ~30 near-identical ones) keeps the controller terse while still
 * validating + coercing every query param the frontend sends.
 */
export class ReportQueryDto extends ReportRangeDto {
  // ── entity / scope selectors ──
  @IsOptional() @IsString() warehouseId?: string;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() subCategoryId?: string;
  @IsOptional() @IsString() productId?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() supplierId?: string;
  @IsOptional() @IsString() createdBy?: string;
  @IsOptional() @IsString() billerName?: string;

  // ── free-text / enum filters ──
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() paymentStatus?: string;
  @IsOptional() @IsString() method?: string;
  @IsOptional() @IsString() reportType?: string;
  @IsOptional() @IsString() departmentName?: string;
  @IsOptional() @IsString() ipdRegNo?: string;
  @IsOptional() @IsString() sortBy?: string;
  @IsOptional() @IsString() sortDir?: string;

  // ── numeric filters ──
  @IsOptional() @Type(() => Number) @IsInt() year?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) month?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) alertDays?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}
