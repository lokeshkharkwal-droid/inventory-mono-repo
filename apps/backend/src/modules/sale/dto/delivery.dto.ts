import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/**
 * Create a delivery for a sale (EZHT `sales/add_delivery`). `reference` is the
 * delivery-order reference (DO); `saleReferenceNo` + `customer` snapshot the
 * originating sale for the list/document. Legacy `status`/`trackingNo`/
 * `deliveredTo` are kept optional for back-compat but are no longer surfaced.
 */
export class CreateDeliveryDto {
  @IsString()
  saleId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  saleReferenceNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customer?: string;

  @IsOptional()
  @IsIn(['PENDING', 'DISPATCHED', 'DELIVERED'])
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  deliveredTo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  address?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

/** Edit a delivery's details (EZHT `sales/edit_delivery`). */
export class UpdateDeliveryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  saleReferenceNo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  customer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  address?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

/** Update a delivery's status (legacy; retained for back-compat). */
export class UpdateDeliveryStatusDto {
  @IsIn(['PENDING', 'DISPATCHED', 'DELIVERED'])
  status: string;
}

/** List filters for deliveries. */
export class DeliveryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  saleId?: string;

  @IsOptional()
  @IsIn(['PENDING', 'DISPATCHED', 'DELIVERED'])
  status?: string;
}
