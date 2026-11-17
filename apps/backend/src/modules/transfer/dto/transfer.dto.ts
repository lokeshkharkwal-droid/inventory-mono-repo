import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

/** A line on a transfer (EZ Health Track item columns). */
export class TransferItemDto {
  @IsString()
  productId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsOptional() @IsDateString() expiryDate?: string;
  @IsOptional() @IsString() @MaxLength(100) productSerial?: string;
  @IsOptional() @IsString() @MaxLength(50) packSize?: string;
  @IsOptional() @Type(() => Number) @IsNumber() packQuantity?: number;
  @IsOptional() @Type(() => Number) @IsNumber() rate?: number;
  @IsOptional() @Type(() => Number) @IsNumber() mrp?: number;
  @IsOptional() @Type(() => Number) @IsNumber() taxRate?: number;
}

/** Create a stock transfer between two branches (warehouses). */
export class CreateTransferDto {
  @IsString()
  fromBranchId: string;

  @IsString()
  toBranchId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  // EZ Health Track header parity.
  @IsOptional() @IsString() @MaxLength(255) fromDepartment?: string;
  @IsOptional() @IsString() @MaxLength(255) toDepartment?: string;
  @IsOptional() @Type(() => Number) @IsNumber() shipping?: number;
  @IsOptional() @IsString() @MaxLength(1000) attachmentUrl?: string;
  /** Legacy "Status": Pending (PENDING) or Sent (IN_TRANSIT). Received is via the receive action. */
  @IsOptional() @IsIn(['PENDING', 'IN_TRANSIT']) status?:
    'PENDING' | 'IN_TRANSIT';

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items: TransferItemDto[];
}

/**
 * Bulk CSV/Excel import of transfers. Each row is a full transfer document
 * (header + line items). Preview with `dryRun`, then commit.
 */
export class ImportTransfersDto {
  @IsOptional() @IsBoolean() dryRun?: boolean;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateTransferDto)
  rows: CreateTransferDto[];
}

/** List filters for transfers. */
export class TransferQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsIn(['PENDING', 'IN_TRANSIT', 'COMPLETED'])
  status?: string;
}
