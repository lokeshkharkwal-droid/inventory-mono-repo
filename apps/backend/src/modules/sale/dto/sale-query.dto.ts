import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** List filters for sales. */
export class SaleQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsIn(['COMPLETED', 'PENDING'])
  status?: string;

  @IsOptional()
  @IsIn(['PENDING', 'PARTIAL', 'PAID'])
  paymentStatus?: string;
}
