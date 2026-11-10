import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { request, requestPaged } from '@/lib/http';

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
  variants: ProductVariant[];
  subCategory?: ProductRef | null;
  unit?: ProductRef | null;
  taxRate?: ProductRef | null;
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

export function useRecordAdjustment(productId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      quantity: number;
      cost?: number;
      reason?: string;
      note?: string;
    }) => request('POST', `/products/${productId}/adjustments`, { body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...KEY, 'stock', productId] });
      qc.invalidateQueries({ queryKey: KEY });
    },
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
