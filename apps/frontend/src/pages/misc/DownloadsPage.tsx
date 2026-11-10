import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { downloadFile } from '@/lib/csv';

/**
 * Downloads centre (legacy Welcome → downloads). Provides the CSV import
 * templates for every bulk-import endpoint so users can prepare files offline,
 * mirroring the legacy "sample file" downloads.
 */
interface TemplateDef {
  title: string;
  description: string;
  filename: string;
  header: string;
}

const TEMPLATES: TemplateDef[] = [
  {
    title: 'Products',
    description: 'Catalog import — code, name, pricing and stock columns.',
    filename: 'products-import-template.csv',
    header:
      'code,name,categoryId,unitId,price,cost,alertQuantity,taxRateId,hsnCode',
  },
  {
    title: 'Customers',
    description: 'Customer master import.',
    filename: 'customers-import-template.csv',
    header: 'name,code,companyName,phone,email,address,taxNumber,creditLimit',
  },
  {
    title: 'Suppliers',
    description: 'Supplier master import.',
    filename: 'suppliers-import-template.csv',
    header: 'name,code,companyName,phone,email,address,taxNumber',
  },
  {
    title: 'Purchases',
    description: 'Purchase line import — one row per item.',
    filename: 'purchases-import-template.csv',
    header: 'reference,supplierId,productCode,quantity,cost,date',
  },
  {
    title: 'Sales',
    description: 'Sale line import — one row per item.',
    filename: 'sales-import-template.csv',
    header: 'reference,customerId,productCode,quantity,price,date',
  },
  {
    title: 'Transfers',
    description: 'Stock transfer import.',
    filename: 'transfers-import-template.csv',
    header: 'reference,fromBranchId,toBranchId,productCode,quantity',
  },
];

/** Downloadable CSV import templates + reference files. */
export function DownloadsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Downloads</h1>
        <p className="text-sm text-muted-foreground">
          CSV import templates and reference files.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map((tpl) => (
          <Card key={tpl.filename}>
            <CardHeader>
              <CardTitle className="text-base">{tpl.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{tpl.description}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadFile(tpl.filename, `${tpl.header}\n`)}
              >
                <Download className="h-4 w-4" />
                Download template
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
