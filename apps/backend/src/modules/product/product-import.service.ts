import { Injectable } from '@nestjs/common';
import {
  runBulkImport,
  type ImportSummary,
} from '../../common/utils/bulk-import.util';
import { ProductService } from './product.service';
import { ImportProductsDto } from './dto/import-products.dto';
import { CreateProductDto } from './dto/create-product.dto';
import {
  UpdateImportProductsDto,
  UpdateImportRowDto,
} from './dto/update-import.dto';

export type { ImportSummary } from '../../common/utils/bulk-import.util';

/**
 * Bulk product import. The frontend parses CSV/Excel into rows; this validates
 * references + code uniqueness and (unless `dryRun`) creates each product,
 * reporting a per-row result so partial failures are visible (mirrors the legacy
 * import preview → commit flow). Built on the shared {@link runBulkImport}.
 */
@Injectable()
export class ProductImportService {
  constructor(private readonly productService: ProductService) {}

  async import(
    tenantId: string,
    dto: ImportProductsDto,
  ): Promise<ImportSummary> {
    return runBulkImport<CreateProductDto>(dto.rows, dto.dryRun ?? false, {
      ref: (row) => row.code,
      validate: (row) => {
        if (!row.code || !row.name || !row.categoryId) {
          throw new Error('Missing required field (code, name, categoryId)');
        }
      },
      create: (row) => this.productService.create(tenantId, row),
    });
  }

  /**
   * Update existing products (matched by `code`) from parsed CSV rows (EZHT
   * `update_csv`) — pricing/core scalar fields only. Reports a per-row result;
   * rows whose `code` matches no product fail (so partial failures are visible).
   */
  async updateImport(
    tenantId: string,
    dto: UpdateImportProductsDto,
  ): Promise<ImportSummary> {
    return runBulkImport<UpdateImportRowDto>(dto.rows, dto.dryRun ?? false, {
      ref: (row) => row.code,
      validate: (row) => {
        if (!row.code) throw new Error('Missing required field (code)');
      },
      create: async (row) => {
        const product = await this.productService.findByCode(tenantId, row.code);
        return this.productService.update(product.id, tenantId, {
          name: row.name,
          packSize: row.packSize,
          salesMethod: row.salesMethod,
          packCost: row.packCost,
          cost: row.cost,
          packMrp: row.packMrp,
          price: row.price,
          alertQuantity: row.alertQuantity,
          hsnCode: row.hsnCode,
          taxMethod: row.taxMethod,
          taxMethodPurchase: row.taxMethodPurchase,
        });
      },
    });
  }
}
