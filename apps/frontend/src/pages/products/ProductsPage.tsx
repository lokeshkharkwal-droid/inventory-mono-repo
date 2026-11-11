import { useState } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  Boxes,
  Upload,
  Download,
  Barcode,
  Tag,
  ListOrdered,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { PrintButton } from '@/components/shared/PrintButton';
import { ImportDialog } from '@/components/shared/ImportDialog';
import { getApiErrorMessage } from '@/lib/http';
import { exportCsv } from '@/lib/csv';
import {
  useInfiniteProducts,
  useProduct,
  useDeleteProduct,
  type ProductListRow,
} from '@/features/products/api';
import { ProductFormDialog } from '@/features/products/ProductFormDialog';
import { ProductDetailDialog } from '@/features/products/ProductDetailDialog';
import { ProductStockDialog } from '@/features/products/ProductStockDialog';
import { PrintBarcodesDialog } from '@/features/products/PrintBarcodesDialog';
import { BulkPriceDialog } from '@/features/products/BulkPriceDialog';
import { ProductSerialsDialog } from '@/features/products/ProductSerialsDialog';
import { usePermissions, permKey } from '@/features/permissions/api';

/** Products list — search, CRUD, and per-branch stock/adjustments. */
export function ProductsPage() {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stockRow, setStockRow] = useState<ProductListRow | null>(null);
  const [viewRow, setViewRow] = useState<ProductListRow | null>(null);
  const [serialsRow, setSerialsRow] = useState<ProductListRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [barcodesOpen, setBarcodesOpen] = useState(false);
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false);

  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfiniteProducts({ search });
  const { data: editing } = useProduct(editingId);
  const del = useDeleteProduct();
  const { can } = usePermissions();
  const canCreate = can(permKey('products', 'create'));
  const canDelete = can(permKey('products', 'delete'));
  const canAdjust = can(permKey('products', 'adjust_stock'));

  const openCreate = () => {
    setEditingId(null);
    setFormOpen(true);
  };
  const openEdit = (row: ProductListRow) => {
    setEditingId(row.id);
    setFormOpen(true);
  };

  const onDelete = async (row: ProductListRow) => {
    if (!confirm(`Delete product "${row.name}"?`)) return;
    try {
      await del.mutateAsync(row.id);
      toast.success('Product deleted');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not delete product'));
    }
  };

  const columns: Column<ProductListRow>[] = [
    { key: 'code', header: 'Code' },
    { key: 'name', header: 'Name' },
    { key: 'category', header: 'Category', render: (r) => r.category?.name ?? '—' },
    { key: 'brand', header: 'Brand', render: (r) => r.brand?.name ?? '—' },
    { key: 'price', header: 'Price', render: (r) => r.price.toFixed(2) },
    { key: 'totalQuantity', header: 'Stock', render: (r) => r.totalQuantity },
    {
      key: 'isActive',
      header: 'Status',
      render: (r) => (r.isActive ? 'Active' : 'Inactive'),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            title="View details"
            onClick={() => setViewRow(r)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <PrintButton
            path={`/print/product/${r.id}/label`}
            title="Print label"
            size="icon"
          />
          <Button
            variant="ghost"
            size="icon"
            title={canAdjust ? 'Stock' : 'No stock-adjust permission'}
            disabled={!canAdjust}
            onClick={() => setStockRow(r)}
          >
            <Boxes className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Serials / batches"
            onClick={() => setSerialsRow(r)}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Edit" onClick={() => openEdit(r)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={canDelete ? 'Delete' : 'No delete permission'}
            disabled={!canDelete}
            onClick={() => onDelete(r)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">
            Product catalogue and per-branch stock.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (rows.length === 0) {
                toast.error('Nothing to export.');
                return;
              }
              exportCsv(
                'products.csv',
                rows as unknown as Record<string, unknown>[],
                [
                  { key: 'code', header: 'code' },
                  { key: 'name', header: 'name' },
                  { key: 'price', header: 'price' },
                  { key: 'totalQuantity', header: 'stock' },
                ],
              );
            }}
          >
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button variant="outline" onClick={() => setBarcodesOpen(true)}>
            <Barcode className="h-4 w-4" /> Print barcodes
          </Button>
          <Button
            variant="outline"
            onClick={() => setBulkPriceOpen(true)}
            disabled={!canCreate}
            title={canCreate ? undefined : 'No edit permission'}
          >
            <Tag className="h-4 w-4" /> Bulk price
          </Button>
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            disabled={!canCreate}
            title={canCreate ? undefined : 'No create permission'}
          >
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button
            onClick={openCreate}
            disabled={!canCreate}
            title={canCreate ? undefined : 'No create permission'}
          >
            <Plus className="h-4 w-4" /> New product
          </Button>
        </div>
      </div>

      <Input
        placeholder="Search by code or name…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
        }}
        className="max-w-sm"
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage="No products yet."
        infinite={{ hasMore, isFetchingMore, onLoadMore: fetchMore }}
      />

      <ProductSerialsDialog
        product={serialsRow}
        onOpenChange={(o) => !o && setSerialsRow(null)}
      />

      <ProductDetailDialog
        product={viewRow}
        onOpenChange={(o) => !o && setViewRow(null)}
      />

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingId ? editing : null}
      />
      <ProductStockDialog
        open={!!stockRow}
        onOpenChange={(o) => !o && setStockRow(null)}
        product={stockRow}
      />
      <PrintBarcodesDialog open={barcodesOpen} onOpenChange={setBarcodesOpen} />
      <BulkPriceDialog open={bulkPriceOpen} onOpenChange={setBulkPriceOpen} />
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Import Products"
        endpoint="/products/import"
        invalidateKey="products"
        templateHeader="code,name,categoryId,unitId,brandId,price,cost,alertQuantity"
        buildRows={(records) =>
          records.map((r) => ({
            code: r.code,
            name: r.name,
            categoryId: r.categoryId,
            unitId: r.unitId || undefined,
            brandId: r.brandId || undefined,
            price: r.price ? Number(r.price) : undefined,
            cost: r.cost ? Number(r.cost) : undefined,
            alertQuantity: r.alertQuantity ? Number(r.alertQuantity) : undefined,
          }))
        }
      />
    </div>
  );
}
