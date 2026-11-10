import { Injectable } from '@nestjs/common';
import {
  runBulkImport,
  type ImportSummary,
} from '../../common/utils/bulk-import.util';
import { ProductService } from './product.service';
import { ImportProductsDto } from './dto/import-products.dto';
import { CreateProductDto } from './dto/create-product.dto';

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
}
