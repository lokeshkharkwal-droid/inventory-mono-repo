import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from '@/lib/http';

/**
 * Branch-scoped inventory settings (EZHealthTrack parity). The active branch is
 * resolved from the JWT server-side — switching branch re-issues the token, and
 * this query refetches to show that branch's independent settings.
 */
export interface InventorySettings {
  branchId: string | null;
  defaultCurrencyCode: string | null;
  isOversellingAllowed: boolean;
  isExpiredSaleBlocked: boolean;
  rowsPerPage: number;
  decimalPlaces: number;

  // Document numbering prefixes
  purchasePrefix: string;
  salePrefix: string;
  transferPrefix: string;
  requisitionPrefix: string;
  quotePrefix: string;
  deliveryPrefix: string;
  paymentPrefix: string;
  transactionPrefix: string;
  returnPrefix: string;
  expensePrefix: string;
  incomePrefix: string;
  materialPrefix: string;
  productPrefix: string;
  referenceFormat: string | null;

  // Default tax rates
  defaultProductTaxRateId: string | null;
  defaultOrderTaxRateId: string | null;

  // Localization / number formatting
  dateFormat: string | null;
  timezone: string | null;
  localLanguage: string | null;
  decimalSeparator: string | null;
  thousandsSeparator: string | null;
  quantityDecimals: number;
  currencySymbol: string | null;
  isCurrencySymbolShown: boolean;
  isSacEnabled: boolean;

  // Image / thumbnail sizing + watermark
  imageWidth: number | null;
  imageHeight: number | null;
  thumbnailWidth: number | null;
  thumbnailHeight: number | null;
  isWatermarkEnabled: boolean;

  // Product & feature toggles
  isProductSerialEnabled: boolean;
  isProductExpiryEnabled: boolean;
  isProductDiscountEnabled: boolean;
  isRacksEnabled: boolean;
  isAttributesEnabled: boolean;
  isAllProductsDisplayed: boolean;
  isExpiredRemoved: boolean;
  isQuotationSalesReducing: boolean;

  // Barcode
  isBarcodeAutoDetected: boolean;
  barcodeSeparator: string | null;
  barcodeFixCount: number;

  // Defaults
  defaultWarehouseId: string | null;
  defaultBillerId: string | null;
  defaultSupplierId: string | null;

  // Behaviour / limits
  itemAdditionMethod: string | null;
  invoiceView: string | null;
  discountLimitPercentage: string | number | null;
  discountLimitAmount: string | number | null;
  editingLockDays: number;
  defaultOrderFocus: string | null;
  isPurchaseRoundingEnabled: boolean;
  isSalesRoundingEnabled: boolean;
  afterSalePage: string | null;
  expiryAlertDays: number;

  /** Whether a cashier PIN is configured (the raw PIN is never returned). */
  hasPosPin: boolean;
  businessName: string | null;
  businessAddress: string | null;
  businessPhone: string | null;
  businessEmail: string | null;
}

const KEY = ['settings'] as const;

export function useSettings() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => request<InventorySettings>('GET', '/settings'),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request<InventorySettings>('PUT', '/settings', { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
