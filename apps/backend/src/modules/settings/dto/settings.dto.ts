import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Update a (tenant, branch)'s inventory settings (all fields optional). Ported to
 * full EZHealthTrack (SMA) settings-field parity. The branch is resolved from the
 * JWT in the controller — it is never part of this body.
 */
export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  defaultCurrencyCode?: string;

  @IsOptional()
  @IsBoolean()
  isOversellingAllowed?: boolean;

  /** Block selling from an expired batch (default off — the sale form only warns). */
  @IsOptional()
  @IsBoolean()
  isExpiredSaleBlocked?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  rowsPerPage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  decimalPlaces?: number;

  // ── Document numbering prefixes ──────────────────────────────────────────────
  @IsOptional() @IsString() @MaxLength(20) purchasePrefix?: string;
  @IsOptional() @IsString() @MaxLength(20) salePrefix?: string;
  @IsOptional() @IsString() @MaxLength(20) transferPrefix?: string;
  @IsOptional() @IsString() @MaxLength(20) requisitionPrefix?: string;
  @IsOptional() @IsString() @MaxLength(20) quotePrefix?: string;
  @IsOptional() @IsString() @MaxLength(20) deliveryPrefix?: string;
  @IsOptional() @IsString() @MaxLength(20) paymentPrefix?: string;
  @IsOptional() @IsString() @MaxLength(20) transactionPrefix?: string;
  @IsOptional() @IsString() @MaxLength(20) returnPrefix?: string;
  @IsOptional() @IsString() @MaxLength(20) expensePrefix?: string;
  @IsOptional() @IsString() @MaxLength(20) incomePrefix?: string;
  @IsOptional() @IsString() @MaxLength(20) materialPrefix?: string;
  @IsOptional() @IsString() @MaxLength(20) productPrefix?: string;
  @IsOptional() @IsString() @MaxLength(20) referenceFormat?: string;

  // ── Default tax rates ────────────────────────────────────────────────────────
  @IsOptional() @IsString() @MaxLength(64) defaultProductTaxRateId?: string;
  @IsOptional() @IsString() @MaxLength(64) defaultOrderTaxRateId?: string;

  // ── Localization / number formatting ─────────────────────────────────────────
  @IsOptional() @IsString() @MaxLength(32) dateFormat?: string;
  @IsOptional() @IsString() @MaxLength(64) timezone?: string;
  @IsOptional() @IsString() @MaxLength(32) localLanguage?: string;
  @IsOptional() @IsString() @MaxLength(4) decimalSeparator?: string;
  @IsOptional() @IsString() @MaxLength(4) thousandsSeparator?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) quantityDecimals?: number;

  @IsOptional() @IsString() @MaxLength(8) currencySymbol?: string;
  @IsOptional() @IsBoolean() isCurrencySymbolShown?: boolean;
  @IsOptional() @IsBoolean() isSacEnabled?: boolean;

  // ── Image / thumbnail sizing + watermark ─────────────────────────────────────
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) imageWidth?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) imageHeight?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) thumbnailWidth?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) thumbnailHeight?: number;
  @IsOptional() @IsBoolean() isWatermarkEnabled?: boolean;

  // ── Product & feature toggles ────────────────────────────────────────────────
  @IsOptional() @IsBoolean() isProductSerialEnabled?: boolean;
  @IsOptional() @IsBoolean() isProductExpiryEnabled?: boolean;
  @IsOptional() @IsBoolean() isProductDiscountEnabled?: boolean;
  @IsOptional() @IsBoolean() isRacksEnabled?: boolean;
  @IsOptional() @IsBoolean() isAttributesEnabled?: boolean;
  @IsOptional() @IsBoolean() isAllProductsDisplayed?: boolean;
  @IsOptional() @IsBoolean() isExpiredRemoved?: boolean;
  @IsOptional() @IsBoolean() isQuotationSalesReducing?: boolean;

  // ── Barcode settings ─────────────────────────────────────────────────────────
  @IsOptional() @IsBoolean() isBarcodeAutoDetected?: boolean;
  @IsOptional() @IsString() @MaxLength(8) barcodeSeparator?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) barcodeFixCount?: number;

  // ── Defaults ─────────────────────────────────────────────────────────────────
  @IsOptional() @IsString() @MaxLength(64) defaultWarehouseId?: string;
  @IsOptional() @IsString() @MaxLength(64) defaultBillerId?: string;
  @IsOptional() @IsString() @MaxLength(64) defaultSupplierId?: string;

  // ── Behaviour / limits ───────────────────────────────────────────────────────
  @IsOptional() @IsString() @MaxLength(32) itemAdditionMethod?: string;
  @IsOptional() @IsString() @MaxLength(32) invoiceView?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountLimitPercentage?: number;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountLimitAmount?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) editingLockDays?: number;
  @IsOptional() @IsString() @MaxLength(32) defaultOrderFocus?: string;
  @IsOptional() @IsBoolean() isPurchaseRoundingEnabled?: boolean;
  @IsOptional() @IsBoolean() isSalesRoundingEnabled?: boolean;
  @IsOptional() @IsString() @MaxLength(32) afterSalePage?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) expiryAlertDays?: number;

  /** POS cashier PIN (blank clears it). */
  @IsOptional() @IsString() @MaxLength(20) posPin?: string;

  /** Business profile shown on printed documents. */
  @IsOptional() @IsString() @MaxLength(255) businessName?: string;
  @IsOptional() @IsString() @MaxLength(1000) businessAddress?: string;
  @IsOptional() @IsString() @MaxLength(50) businessPhone?: string;
  @IsOptional() @IsString() @MaxLength(255) businessEmail?: string;

  /** Non-secret payment-gateway config (enabled flags / public display values). */
  @IsOptional()
  @IsObject()
  paymentGateways?: Record<string, unknown>;
}
