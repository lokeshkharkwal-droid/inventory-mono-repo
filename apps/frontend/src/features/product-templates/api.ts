import { useMutation, useQueryClient } from '@tanstack/react-query';
import { request } from '@/lib/http';
import { makeCrudHooks } from '@/features/_shared/crud';

export interface ProductTemplate {
  id: string;
  code: string | null;
  name: string;
  category: string | null;
  unit: string | null;
  price: number;
  cost: number;
  hsnCode: string | null;
  description: string | null;
  isActive: boolean;
}

/** Product-template CRUD hooks (backend routes under /product-templates). */
export const productTemplateHooks = makeCrudHooks<
  ProductTemplate,
  Record<string, unknown>
>('product-templates', 'product-templates');

/** Instantiate a real product from a template (legacy "create product"). */
export function useCreateProductFromTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      categoryId,
      code,
    }: {
      id: string;
      categoryId: string;
      code?: string;
    }) =>
      request('POST', `/product-templates/${id}/create-product`, {
        body: { categoryId, code: code || undefined },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}
