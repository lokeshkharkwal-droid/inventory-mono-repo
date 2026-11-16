import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** Create an operating expense. */
export class CreateExpenseDto {
  @Type(() => Number) @IsNumber() @Min(0) amount: number;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() @MaxLength(100) reference?: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;

  // EZ Health Track "Add Expense" parity fields.
  @IsOptional() @IsString() warehouseId?: string;
  @IsOptional() @IsString() @MaxLength(50) hsnCode?: string;
  @IsOptional() @IsString() @MaxLength(50) taxMethod?: string;
  @IsOptional() @IsString() @MaxLength(100) gstNo?: string;
  @IsOptional() @IsString() @MaxLength(2048) attachmentUrl?: string;
}

/** Update an expense (all fields optional). */
export class UpdateExpenseDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() @MaxLength(100) reference?: string;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;

  // EZ Health Track "Add Expense" parity fields.
  @IsOptional() @IsString() warehouseId?: string;
  @IsOptional() @IsString() @MaxLength(50) hsnCode?: string;
  @IsOptional() @IsString() @MaxLength(50) taxMethod?: string;
  @IsOptional() @IsString() @MaxLength(100) gstNo?: string;
  @IsOptional() @IsString() @MaxLength(2048) attachmentUrl?: string;
}

/** List filters for expenses. */
export class ExpenseQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(255) search?: string;
  @IsOptional() @IsString() categoryId?: string;
}
