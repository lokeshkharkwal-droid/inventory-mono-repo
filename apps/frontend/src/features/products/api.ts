import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { request, requestPaged } from '@/lib/http';
import { useInfiniteList } from '@/features/_shared/useInfiniteList';

export interface ProductRef {
  id: string;
  name: string;
}

export interface ProductListRow {
  id: string;
  code: string;
  name: string;
  type: string;
  cost: number;
  price: number;
  packCost: number | null;
  packMrp: number | null;
  packSize: string | null;
  /** Product default tax (EZHT auto-fill on line add). */
  taxRateId?: string | null;
  taxRatePercent: number;
  taxMethodPurchase: string | null;
  alertQuantity: number;
  imageUrl: string | null;
  isActive: boolean;
  category: ProductRef | null;
  subCategory: ProductRef | null;
  brand: ProductRef | null;
  unit: ProductRef | null;
  /** On-hand quantity for the caller's active branch (not a cross-branch total). */
  quantity: number;
  rack: string | null;
  /** Active-branch batch/expiry (set via Adjust Quantities), when present. */
  batchNo: string | null;
  expiryDate: string | null;
}

/** A variant's per-branch stock row (EZHT "attributes" table). */
export interface VariantWarehouseStock {
  id?: string;
  branchId: string;
  quantity: number;
  cost: number | null;
}

export interface ProductVariant {
  id?: string;
  name: string;
  sku: string | null;
  costAdjustment: number;
  priceAdjustment: number;
  warehouseStocks?: VariantWarehouseStock[];
}

/** A product↔supplier link (EZHT supplier1..5). */
export interface ProductSupplierLink {
  id?: string;
  supplierId: string;
  partNumber: string | null;
  price: number | null;
  sortOrder?: number;
  supplier?: ProductRef | null;
}

/** A product drug-composition row (EZHT "Drugs" modal). */
export interface ProductDrug {
  id: string;
  drugId: string | null;
  name: string;
  unitValue: string | null;
  unit: string | null;
}

export interface ProductDetail extends ProductListRow {
  subCategoryId?: string | null;
  unitId?: string | null;
  brandId?: string | null;
  manufacturerId?: string | null;
  manufacturer?: ProductRef | null;
  suppliers?: ProductSupplierLink[];
  taxRateId?: string | null;
  categoryId?: string;
  description: string | null;
  genericName: string | null;
  strength: string | null;
  potency: string | null;
  hsnCode: string | null;
  isStockTracked: boolean;
  isTaxIncluded: boolean;
  isSerialized: boolean;
  barcodeSymbology: string | null;
  variants: ProductVariant[];
  taxRate?: ProductRef | null;
  drugs?: ProductDrug[];

  // ── EZHT business add-product parity ──
  packSize: string | null;
  salesMethod: string | null;
  packCost: number | null;
  packMrp: number | null;
  taxMethod: string | null;
  taxMethodPurchase: string | null;
  galleryImageUrls: string[];
  composition: string | null;
  unitType: string | null;
  formulation: string | null;
  route: string | null;
  frequency: string | null;
  numberOfDays: string | null;
  prescriptionQuantity: string | null;
  refills: string | null;
  refillTimes: string | null;
  prescriptionNotes: string | null;
  cf1: string | null;
  cf2: string | null;
  cf3: string | null;
  cf4: string | null;
  cf5: string | null;
  cf6: string | null;
  cf7: string | null;
  cf8: string | null;
  cf9: string | null;
  cf10: string | null;
  cf11: string | null;
  invoiceDetails: string | null;
}

export interface BranchStock {
  id: string;
  branchId: string;
  quantity: number;
  avgCost: number;
  rack: string | null;
  updatedAt: string;
}

const KEY = ['products'] as const;

interface ListParams {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
  status?: string;
}

export function useProducts(params: ListParams) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () =>
      requestPaged<ProductListRow>('GET', '/products', {
        query: {
          page: params.page,
          limit: params.limit,
          search: params.search || undefined,
          categoryId: params.categoryId || undefined,
          brandId: params.brandId || undefined,
          status: params.status || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useInfiniteProducts(
  params: { search?: string; extra?: Record<string, string | number | boolean | undefined> } = {},
) {
  return useInfiniteList<ProductListRow>(['products'], '/products', params);
}

export function useProduct(id: string | null) {
  return useQuery({
    queryKey: [...KEY, 'detail', id],
    queryFn: () => request<ProductDetail>('GET', `/products/${id}`),
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request<ProductDetail>('POST', '/products', { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Record<string, unknown> }) =>
      request<ProductDetail>('PATCH', `/products/${id}`, { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request('DELETE', `/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useProductStock(id: string | null) {
  return useQuery({
    queryKey: [...KEY, 'stock', id],
    queryFn: () => request<BranchStock[]>('GET', `/products/${id}/stock`),
    enabled: !!id,
  });
}

/** Per-variant on-hand stock across branches (EZHT variant stock). */
export interface VariantStock {
  id: string;
  name: string;
  warehouseStocks: {
    id: string;
    branchId: string;
    quantity: number;
    cost: number | null;
  }[];
}

export function useProductVariantStock(id: string | null) {
  return useQuery({
    queryKey: [...KEY, 'variant-stock', id],
    queryFn: () => request<VariantStock[]>('GET', `/products/${id}/variant-stock`),
    enabled: !!id,
  });
}

/** A batch of a product available at the active branch (sale-form picker / detail panel). */
export interface ProductBatch {
  id: string;
  batchNo: string | null;
  serialNo: string | null;
  expiryDate: string | null;
  quantity: number;
  cost: number | null;
}

/**
 * Batches of a product at the caller's active branch, earliest-expiry first.
 * `all` includes expired + zero/negative rows (Product Details batch panel); the
 * default (false) returns only in-stock, non-expired batches (sale-form picker).
 */
export function useProductBatches(id: string | null, all = false) {
  return useQuery({
    queryKey: [...KEY, 'batches', id, all],
    queryFn: () =>
      request<ProductBatch[]>(
        'GET',
        `/products/${id}/batches${all ? '?all=1' : ''}`,
      ),
    enabled: !!id,
  });
}

/**
 * One batch-level row for the Add-Sale product autocomplete (EZHT parity): search
 * by product name/code → one row per batch, negatives preserved. Carries the line
 * defaults (price/mrp/tax/hsn/pack/variant) so picking a row fills the order line
 * with that exact batch locked.
 */
export interface BatchSearchRow {
  batchId: string;
  productId: string;
  productName: string;
  productCode: string | null;
  batchNo: string | null;
  serialNo: string | null;
  expiryDate: string | null;
  quantity: number;
  price: number;
  cost: number | null;
  mrp: number | null;
  taxRate: number;
  taxRateId: string | null;
  hsnCode: string | null;
  packSize: number | null;
  isTaxIncluded: boolean;
  optionId: string | null;
}

/**
 * Batch-level product search for the Add-Sale line autocomplete. Debounce the
 * `term` at the call site; only queries when a (trimmed) term is present.
 */
export function useBatchSearch(term: string, warehouseId?: string | null) {
  const t = term.trim();
  return useQuery({
    queryKey: [...KEY, 'batch-search', t, warehouseId ?? ''],
    queryFn: () =>
      request<BatchSearchRow[]>('GET', '/products/batch-search', {
        query: {
          term: t,
          ...(warehouseId ? { warehouseId } : {}),
        },
      }),
    enabled: t.length >= 1,
    placeholderData: (p) => p,
  });
}

/**
 * Fully-described batches for the Product Details "Batches" panel (EZHT parity:
 * date, code/name, variant, serial, expiry, pack size/cost, cost, pack MRP/MRP,
 * tax rate, HSN, quantity, warehouse). Distinct from {@link useProductBatches},
 * which feeds the lean sale-form picker.
 */
export interface ProductBatchDetail {
  id: string;
  date: string | null;
  productCode: string | null;
  productName: string | null;
  variantName: string | null;
  serialNo: string | null;
  expiryDate: string | null;
  packSize: number | null;
  packCost: number | null;
  cost: number | null;
  packMrp: number | null;
  mrp: number | null;
  taxRate: number | null;
  hsnCode: string | null;
  quantity: number;
  warehouseName: string | null;
  branchId: string;
}

export function useProductBatchDetails(id: string | null) {
  return useQuery({
    queryKey: [...KEY, 'batch-details', id],
    queryFn: () =>
      request<ProductBatchDetail[]>('GET', `/products/${id}/batch-details`),
    enabled: !!id,
  });
}

/** One month of a product's sales/purchases trend (Product Details chart panel). */
export interface ProductChartMonth {
  label: string;
  salesQty: number;
  salesAmount: number;
  purchaseQty: number;
  purchaseAmount: number;
}

export interface ProductChart {
  months: ProductChartMonth[];
  totals: Omit<ProductChartMonth, 'label'>;
}

/** Rolling 6-month sales + purchases trend for one product. */
export function useProductChart(id: string | null) {
  return useQuery({
    queryKey: [...KEY, 'chart', id],
    queryFn: () =>
      request<ProductChart>('GET', `/reports/product-chart?productId=${id}`),
    enabled: !!id,
  });
}

// ── Product Details panels (Sales / Purchases / Quotations / Adjustments) ──────

interface ReportResult<T> {
  rows: T[];
  total: number;
}

/** A product + quantity line shown in the "Product Qty" column (EZHT GROUP_CONCAT). */
export interface ProductQtyLine {
  productName: string;
  quantity: number;
}

export interface ProductSaleRow {
  id: string;
  date: string;
  reference: string;
  billerName: string | null;
  customerName: string;
  products: ProductQtyLine[];
  totalTax: number;
  totalDiscount: number;
  grandTotal: number;
  paid: number;
  balance: number;
  paymentStatus: string;
}

/** Sales that include this product (reuses the sales report, filtered by productId). */
export function useProductSales(id: string | null) {
  return useQuery({
    queryKey: [...KEY, 'sales', id],
    queryFn: () =>
      request<ReportResult<ProductSaleRow>>('GET', '/reports/sales', {
        query: { productId: id ?? undefined, limit: 100 },
      }),
    enabled: !!id,
  });
}

export interface ProductPurchaseRow {
  id: string;
  date: string;
  reference: string;
  warehouseName: string | null;
  supplierName: string;
  items: ProductQtyLine[];
  grandTotal: number;
  paid: number;
  balance: number;
  status: string;
}

/** Purchases that include this product (reuses the purchases report). */
export function useProductPurchases(id: string | null) {
  return useQuery({
    queryKey: [...KEY, 'purchases', id],
    queryFn: () =>
      request<ReportResult<ProductPurchaseRow>>('GET', '/reports/purchases', {
        query: { productId: id ?? undefined, limit: 100 },
      }),
    enabled: !!id,
  });
}

export interface ProductQuoteRow {
  id: string;
  reference: string;
  date: string;
  type: string;
  status: string;
  billerName: string | null;
  customerName: string | null;
  partyName: string | null;
  products: ProductQtyLine[];
  grandTotal: number;
}

/** Quotations that include this product. */
export function useProductQuotes(id: string | null) {
  return useQuery({
    queryKey: [...KEY, 'quotes', id],
    queryFn: () =>
      requestPaged<ProductQuoteRow>('GET', '/quotes', {
        query: { productId: id ?? undefined, limit: 100 },
      }),
    enabled: !!id,
  });
}

export interface ProductTransferRow {
  id: string;
  date: string;
  reference: string;
  fromWarehouse: string | null;
  toWarehouse: string | null;
  items: ProductQtyLine[];
  grandTotal: number;
  status: string;
}

/** Transfers that include this product (reuses the transfers report, filtered by productId). */
export function useProductTransfers(id: string | null) {
  return useQuery({
    queryKey: [...KEY, 'transfers', id],
    queryFn: () =>
      request<ReportResult<ProductTransferRow>>('GET', '/reports/transfers', {
        query: { productId: id ?? undefined, limit: 100 },
      }),
    enabled: !!id,
  });
}

export interface ProductAdjustmentRow {
  id: string;
  quantity: number;
  type: string;
  reason: string | null;
  note: string | null;
  batchNo: string | null;
  expiryDate: string | null;
  adjustedAt: string | null;
  createdAt: string;
  productCode: string | null;
  productName: string | null;
  variantName: string | null;
  warehouseName: string | null;
}

/** Quantity-adjustment history for this product (active branch). */
export function useProductAdjustments(id: string | null) {
  return useQuery({
    queryKey: [...KEY, 'adjustments', 'byProduct', id],
    queryFn: () =>
      requestPaged<ProductAdjustmentRow>('GET', `/products/${id}/adjustments`, {
        query: { limit: 100 },
      }),
    enabled: !!id,
  });
}

/** Full EZHT adjustment input (quantity is the signed unit delta). */
export interface AdjustmentInput {
  quantity: number;
  cost?: number;
  reason?: string;
  note?: string;
  /** The targeted "Purchased Item" batch; moves its balance with the warehouse total. */
  batchId?: string;
  adjustedAt?: string;
  variantId?: string;
  packSize?: string;
  packQuantity?: number;
  batchNo?: string;
  expiryDate?: string;
  packMrp?: number;
  unitMrp?: number;
}

export function useRecordAdjustment(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AdjustmentInput) =>
      request('POST', `/products/${productId}/adjustments`, { body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, 'stock', productId] });
      qc.invalidateQueries({ queryKey: [...KEY, 'adjustments'] });
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

// ── Drugs (EZHT "Drugs" modal) ───────────────────────────────────────────────
export function useProductDrugs(productId: string | null) {
  return useQuery({
    queryKey: [...KEY, 'drugs', productId],
    queryFn: () => request<ProductDrug[]>('GET', `/products/${productId}/drugs`),
    enabled: !!productId,
  });
}

export function useAddProductDrug(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      drugId?: string;
      name?: string;
      unitValue?: string;
      unit?: string;
    }) =>
      request<ProductDrug>('POST', `/products/${productId}/drugs`, { body: input }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...KEY, 'drugs', productId] }),
  });
}

export function useDeleteProductDrug(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (drugId: string) =>
      request('DELETE', `/products/${productId}/drugs/${drugId}`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...KEY, 'drugs', productId] }),
  });
}

// ── Duplicate ────────────────────────────────────────────────────────────────
export function useDuplicateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      request<ProductDetail>('POST', `/products/${id}/duplicate`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

// ── Tenant-wide adjustment history (Quantity Adjustments page) ────────────────
export interface AdjustmentRow {
  id: string;
  branchId: string;
  productId: string;
  quantity: number;
  type: string;
  reason: string | null;
  note: string | null;
  adjustedAt: string | null;
  variantId: string | null;
  packSize: string | null;
  packQuantity: number | null;
  batchNo: string | null;
  expiryDate: string | null;
  packMrp: number | null;
  unitMrp: number | null;
  createdAt: string;
  product: { id: string; code: string; name: string } | null;
}

export function useAllAdjustments(params: {
  page: number;
  limit: number;
  search?: string;
  productId?: string;
}) {
  return useQuery({
    queryKey: [...KEY, 'adjustments', 'all', params],
    queryFn: () =>
      requestPaged<AdjustmentRow>('GET', '/products/adjustments', {
        query: {
          page: params.page,
          limit: params.limit,
          search: params.search || undefined,
          productId: params.productId || undefined,
        },
      }),
    placeholderData: (prev) => prev,
  });
}

export function useDeleteAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, adjId }: { productId: string; adjId: string }) =>
      request('DELETE', `/products/${productId}/adjustments/${adjId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, 'adjustments'] });
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

// ── Update via CSV (EZHT update_csv) ──────────────────────────────────────────
export interface ImportResultRow {
  ref: string;
  status: string;
  message?: string;
}

export function useUpdateImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { dryRun?: boolean; rows: Record<string, unknown>[] }) =>
      request<unknown>('POST', '/products/update-import', { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useBulkPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: { id: string; price?: number; cost?: number }[]) =>
      request<{ updated: number; total: number }>('POST', '/products/bulk-price', {
        body: { items },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSetRack(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rack: string) =>
      request('POST', `/products/${productId}/rack`, { body: { rack } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, 'stock', productId] });
    },
  });
}

// ── Product serials / batch numbers ──────────────────────────────────────────
export interface ProductSerial {
  id: string;
  serialNo: string;
  status: string;
  createdAt: string;
}

export function useProductSerials(productId: string | null) {
  return useQuery({
    queryKey: [...KEY, 'serials', productId],
    queryFn: () =>
      request<ProductSerial[]>('GET', `/products/${productId}/serials`),
    enabled: !!productId,
  });
}

export function useAddProductSerials(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (serials: string[]) =>
      request('POST', `/products/${productId}/serials`, { body: { serials } }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...KEY, 'serials', productId] }),
  });
}
