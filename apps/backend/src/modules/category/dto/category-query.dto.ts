import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Query filters for listing inventory categories. */
export class CategoryQueryDto extends PaginationQueryDto {
  /** Free-text search over name + code. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  /** Filter by active state. */
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive';
}
