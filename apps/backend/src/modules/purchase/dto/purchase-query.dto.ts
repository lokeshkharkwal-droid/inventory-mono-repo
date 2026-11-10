import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** List filters for purchases. */
export class PurchaseQueryDto extends PaginationQueryDto {
  /** Search over reference. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsIn(['RECEIVED', 'ORDERED', 'PENDING'])
  status?: string;

  @IsOptional()
  @IsIn(['PENDING', 'PARTIAL', 'PAID'])
  paymentStatus?: string;
}
