import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Copy,
  Pill,
  Image as ImageIcon,
  SlidersHorizontal,
  FileText,
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
  useDuplicateProduct,
  type ProductListRow,
} from '@/features/products/api';
import { ProductDetailDialog } from '@/features/products/ProductDetailDialog';
import { ProductStockDialog } from '@/features/products/ProductStockDialog';
import { BulkPriceDialog } from '@/features/products/BulkPriceDialog';
import { ProductSerialsDialog } from '@/features/products/ProductSerialsDialog';
import { ProductDrugsDialog } from '@/features/products/ProductDrugsDialog';
import { ViewImageDialog } from '@/features/products/ViewImageDialog';
import { AdjustmentFormDialog } from '@/features/products/AdjustmentFormDialog';
import { usePermissions, permKey } from '@/features/permissions/api';

const money = (n: number | null | undefined) =>
  n == null ? '—' : Number(n).toFixed(2);

/** Products list — EZHT column parity, per-branch stock/adjustments, selection. */
export function ProductsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [stockRow, setStockRow] = useState<ProductListRow | null>(null);
  const [viewRow, setViewRow] = useState<ProductListRow | null>(null);
  const [serialsRow, setSerialsRow] = useState<ProductListRow | null>(null);
  const [drugsRow, setDrugsRow] = useState<ProductListRow | null>(null);
  const [imageRow, setImageRow] = useState<ProductListRow | null>(null);
  const [adjustRow, setAdjustRow] = useState<ProductListRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { rows, isLoading, hasMore, isFetchingMore, fetchMore } =
    useInfiniteProducts({ search });
  const { data: imageDetail } = useProduct(imageRow?.id ?? null);
  const del = useDeleteProduct();
  const duplicate = useDuplicateProduct();
  const { can } = usePermissions();
  const canCreate = can(permKey('products', 'create'));
  const canDelete = can(permKey('products', 'delete'));
  const canAdjust = can(permKey('products', 'adjust_stock'));

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  const selectedRows = useMemo(
    () => rows.filter((r) => selected.has(r.id)),
    [rows, selected],
  );

  const onDelete = async (row: ProductListRow) => {
    if (!confirm(`Delete product "${row.name}"?`)) return;
    try {
      await del.mutateAsync(row.id);
      toast.success('Product deleted');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not delete product'));
    }
  };

  const onDuplicate = async (row: ProductListRow) => {
    try {
      const copy = await duplicate.mutateAsync(row.id);
      toast.success('Product duplicated');
      // Open the new copy on the Edit page so the user can tweak it.
      navigate(`/products/edit/${copy.id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not duplicate product'));
    }
  };

  const exportRows = (list: ProductListRow[]) => {
    if (list.length === 0) {
      toast.error('Nothing to export.');
      return;
    }
    exportCsv(
      'products.csv',
      list.map((r) => ({
        code: r.code,
        name: r.name,
        category: r.category?.name ?? '',
        subcategory: r.subCategory?.name ?? '',
        unit_cost: r.cost,
        unit_mrp: r.price,
        pack_cost: r.packCost ?? '',
        pack_mrp: r.packMrp ?? '',
        quantity: r.totalQuantity,
        unit: r.unit?.name ?? '',
        alert_quantity: r.alertQuantity,
      })),
    );
  };

  const columns: Column<ProductListRow>[] = [
    {
      key: 'select',
      header: '',
      className: 'w-px',
      render: (r) => (
        <input
          type="checkbox"
          className="h-4 w-4 accent-primary"
          checked={selected.has(r.id)}
          onChange={() => toggle(r.id)}
          aria-label={`Select ${r.name}`}
        />
      ),
    },
    {
      key: 'image',
      header: 'Image',
      render: (r) =>
        r.imageUrl ? (
          <img
            src={r.imageUrl}
            alt={r.name}
            className="h-9 w-9 rounded border object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded border border-dashed text-muted-foreground">
            <ImageIcon className="h-4 w-4" />
          </div>
        ),
    },
    { key: 'code', header: 'Product Code' },
    { key: 'name', header: 'Product Name' },
    { key: 'category', header: 'Category', render: (r) => r.category?.name ?? '—' },
    {
      key: 'subCategory',
      header: 'Subcategory',
      render: (r) => r.subCategory?.name ?? '—',
    },
    {
      key: 'cost',
      header: 'Unit Cost',
      className: 'text-right',
      render: (r) => money(r.cost),
    },
    {
      key: 'price',
      header: 'Unit MRP',
      className: 'text-right',
      render: (r) => money(r.price),
    },
    {
      key: 'packCost',
      header: 'Pack Cost',
      className: 'text-right',
      render: (r) => money(r.packCost),
    },
    {
      key: 'packMrp',
      header: 'Pack MRP',
      className: 'text-right',
      render: (r) => money(r.packMrp),
    },
    {
      key: 'totalQuantity',
      header: 'Quantity',
      className: 'text-right',
      render: (r) => r.totalQuantity,
    },
    { key: 'unit', header: 'Unit', render: (r) => r.unit?.name ?? '—' },
    { key: 'rack', header: 'Rack', render: (r) => r.rack ?? '—' },
    {
      key: 'alertQuantity',
      header: 'Alert Quantity',
      className: 'text-right',
      render: (r) => r.alertQuantity,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (r) => (
        <div className="flex flex-wrap justify-end gap-1">
          {/* EZHT product row actions. */}
          <Button variant="ghost" size="icon" title="Product details" onClick={() => setViewRow(r)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Drugs" onClick={() => setDrugsRow(r)}>
            <Pill className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={canCreate ? 'Duplicate product' : 'No create permission'}
            disabled={!canCreate || duplicate.isPending}
            onClick={() => onDuplicate(r)}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Edit"
            onClick={() => navigate(`/products/edit/${r.id}`)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="View image" onClick={() => setImageRow(r)}>
            <ImageIcon className="h-4 w-4" />
          </Button>
          <PrintButton
            path={`/print/product/${r.id}/barcode`}
            title="Print barcode"
            size="icon"
          />
          <PrintButton
            path={`/print/product/${r.id}/label`}
            title="Print label"
            size="icon"
          />
          <Button
            variant="ghost"
            size="icon"
            title={canAdjust ? 'Adjust quantity' : 'No stock-adjust permission'}
            disabled={!canAdjust}
            onClick={() => setAdjustRow(r)}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title={canAdjust ? 'Stock / rack' : 'No stock-adjust permission'}
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
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportRows(rows)}>
            <Download className="h-4 w-4" /> Export to Excel
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <FileText className="h-4 w-4" /> Export to PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/products/print-barcodes')}
          >
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
            onClick={() => navigate('/products/add')}
            disabled={!canCreate}
            title={canCreate ? undefined : 'No create permission'}
          >
            <Plus className="h-4 w-4" /> Add Product
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by code or name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        {rows.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={allSelected}
              onChange={toggleAll}
            />
            Select all loaded
          </label>
        )}
        {selected.size > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportRows(selectedRows)}
          >
            <Download className="h-4 w-4" /> Export selected ({selected.size})
          </Button>
        )}
      </div>

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

      <ProductStockDialog
        open={!!stockRow}
        onOpenChange={(o) => !o && setStockRow(null)}
        product={stockRow}
      />
      {drugsRow && (
        <ProductDrugsDialog
          productId={drugsRow.id}
          productName={drugsRow.name}
          open={!!drugsRow}
          onClose={() => setDrugsRow(null)}
        />
      )}
      <ViewImageDialog
        product={imageRow ? imageDetail ?? null : null}
        open={!!imageRow}
        onClose={() => setImageRow(null)}
      />
      {adjustRow && (
        <AdjustmentFormDialog
          productId={adjustRow.id}
          productName={adjustRow.name}
          open={!!adjustRow}
          onClose={() => setAdjustRow(null)}
          onSaved={() => setAdjustRow(null)}
        />
      )}
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
