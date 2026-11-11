import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';

/** One product + how many labels to print for it. */
export class BarcodeSheetItemDto {
  @IsString() productId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  quantity: number;
}

/**
 * Multi-product barcode label sheet (legacy Products::print_barcodes). The label
 * `style` controls label width + barcode height; toggles control what prints.
 */
export class BarcodeSheetDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BarcodeSheetItemDto)
  items: BarcodeSheetItemDto[];

  /** Label layout size. */
  @IsOptional()
  @IsIn(['20', '30', '40', '50'])
  style?: '20' | '30' | '40' | '50';

  /** Barcode symbology printed on each label. */
  @IsOptional()
  @IsIn(['CODE39', 'QR'])
  symbology?: 'CODE39' | 'QR';

  @IsOptional() @IsBoolean() showName?: boolean;
  @IsOptional() @IsBoolean() showPrice?: boolean;
  @IsOptional() @IsBoolean() showBusinessName?: boolean;

  @IsOptional() @IsString() @MaxLength(255) businessName?: string;
}

/**
 * Combine several documents of the same type into one printable file
 * (legacy Purchases/Sales "combine_pdf" action).
 */
export class CombinePrintDto {
  @IsIn(['purchase', 'sale'])
  type: 'purchase' | 'sale';

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids: string[];
}

/**
 * Email a document (invoice / PO / quote / proforma) as an attachment via the
 * kalnostics comms gateway (legacy Sales::email_invoice / Purchases::email …).
 */
export class EmailDocumentDto {
  @IsIn(['sale', 'purchase', 'quote', 'proforma'])
  type: 'sale' | 'purchase' | 'quote' | 'proforma';

  @IsString()
  id: string;

  @IsString()
  @MaxLength(255)
  to: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
