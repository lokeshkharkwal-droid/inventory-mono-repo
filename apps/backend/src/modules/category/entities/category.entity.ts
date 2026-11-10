import { InventoryCategory } from '@prisma/client';

/** Response shape for a category (what the API returns). */
export type CategoryEntity = Omit<InventoryCategory, 'legacyCategoryId'>;
