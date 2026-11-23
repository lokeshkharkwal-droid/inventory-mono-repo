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
 * `style` is the legacy per-sheet count (how many labels fit on one page); it
 * fixes the page size, label dimensions and barcode height. Toggles control what
 * prints on each label.
 */
export class BarcodeSheetDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => BarcodeSheetItemDto)
  items: BarcodeSheetItemDto[];

  /** Labels per sheet (legacy style). Controls page layout + label size. */
  @IsOptional()
  @IsIn(['40', '30', '24', '20', '18', '14', '12', '10'])
  style?: '40' | '30' | '24' | '20' | '18' | '14' | '12' | '10';

  /** Barcode symbology printed on each label (legacy default: Code 128). */
  @IsOptional()
  @IsIn(['CODE128', 'CODE39', 'QR'])
  symbology?: 'CODE128' | 'CODE39' | 'QR';

  // Legacy print_barcodes option checkboxes.
  @IsOptional() @IsBoolean() showName?: boolean;
  @IsOptional() @IsBoolean() showPrice?: boolean;
  @IsOptional() @IsBoolean() showBusinessName?: boolean;
  @IsOptional() @IsBoolean() showCurrency?: boolean;
  @IsOptional() @IsBoolean() showUnit?: boolean;
  @IsOptional() @IsBoolean() showCategory?: boolean;
  @IsOptional() @IsBoolean() showVariants?: boolean;
  @IsOptional() @IsBoolean() showImage?: boolean;

  @IsOptional() @IsString() @MaxLength(255) businessName?: string;
}

/**
 * Combine several documents of the same type into one printable file
 * (legacy Purchases/Sales "combine_pdf" action).
 */
export class CombinePrintDto {
  @IsIn(['purchase', 'sale', 'quote', 'proforma', 'requisition', 'transfer'])
  type: 'purchase' | 'sale' | 'quote' | 'proforma' | 'requisition' | 'transfer';

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
  @IsIn([
    'sale',
    'sale_return',
    'purchase',
    'quote',
    'proforma',
    'requisition',
    'transfer',
  ])
  type:
    | 'sale'
    | 'sale_return'
    | 'purchase'
    | 'quote'
    | 'proforma'
    | 'requisition'
    | 'transfer';

  @IsString()
  id: string;

  @IsString()
  @MaxLength(255)
  to: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  /** Comma-separated CC addresses (visible carbon copy). */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  cc?: string;

  /**
   * Comma-separated BCC addresses. The comms gateway has no bcc field, so each is
   * sent its own separate copy — preserving bcc's privacy (recipients stay hidden
   * from each other and from the main recipient).
   */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bcc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;
}
