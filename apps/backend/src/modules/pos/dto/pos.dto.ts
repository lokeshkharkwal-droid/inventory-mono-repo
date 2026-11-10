import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Create a POS register (till). */
export class CreateRegisterDto {
  @IsString()
  @MaxLength(255)
  name: string;
}

/** Verify the POS cashier PIN. */
export class VerifyPinDto {
  @IsString()
  @MaxLength(20)
  pin: string;
}

/** Open a register session with an opening cash float. */
export class OpenSessionDto {
  @IsString()
  registerId: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  openingCash?: number;
}

/** Close a register session with the counted cash. */
export class CloseSessionDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  closingCash: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** A POS checkout line. */
export class PosCheckoutItemDto {
  @IsString()
  productId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;
}

/** A POS payment (tender) — multiple allowed for split payment. */
export class PosPaymentDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  method?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;
}

/** Suspend (hold) the current POS cart for later (legacy opened_bills). */
export class HoldBillDto {
  @IsString() @MaxLength(255) label: string;
  /** Arbitrary cart payload (lines + customer) kept until resumed. */
  cart: unknown;
}

/** Ring up a POS sale (checkout). */
export class PosCheckoutDto {
  @IsString()
  customerId: string;

  /** The open register session; defaults to the branch's current open session. */
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  orderDiscount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PosCheckoutItemDto)
  items: PosCheckoutItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PosPaymentDto)
  payments: PosPaymentDto[];
}
