import { makeCrudHooks } from '@/features/_shared/crud';

export interface Promotion {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
}

/** Promotion CRUD hooks (backend routes under /promotions). */
export const promotionHooks = makeCrudHooks<Promotion, Record<string, unknown>>(
  'promotions',
  'promotions',
);
