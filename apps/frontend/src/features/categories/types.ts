/** A category as returned by the inventory-backend. */
export interface Category {
  id: string;
  tenantId: string;
  code: string | null;
  name: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Create/update payload. */
export interface CategoryInput {
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
  sortOrder?: number;
}
