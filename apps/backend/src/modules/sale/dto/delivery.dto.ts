import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Create a delivery for a sale. */
export class CreateDeliveryDto {
  @IsString()
  saleId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

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

/** Update a delivery's status. */
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
