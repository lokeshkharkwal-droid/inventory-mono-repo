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
  alertQuantity: number;
  isActive: boolean;
  category: ProductRef | null;
  brand: ProductRef | null;
  totalQuantity: number;
}

export interface ProductVariant {
  id?: string;
  name: string;
  sku: string | null;
  costAdjustment: number;
  priceAdjustment: number;
}

/** A product drug-composition row (EZHT "Drugs" modal). */
export interface ProductDrug {
  id: string;
  name: string;
  unitValue: string | null;
  unit: string | null;
}

export interface ProductDetail extends ProductListRow {
  subCategoryId?: string | null;
  unitId?: string | null;
  brandId?: string | null;
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
  imageUrl: string | null;
  variants: ProductVariant[];
  subCategory?: ProductRef | null;
  unit?: ProductRef | null;
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

/** Full EZHT adjustment input (quantity is the signed unit delta). */
export interface AdjustmentInput {
  quantity: number;
  cost?: number;
  reason?: string;
  note?: string;
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
    mutationFn: (input: { name: string; unitValue?: string; unit?: string }) =>
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
