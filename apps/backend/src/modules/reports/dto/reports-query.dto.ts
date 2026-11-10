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
