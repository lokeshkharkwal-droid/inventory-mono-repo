import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getApiErrorMessage } from '@/lib/http';
import { useSettings, useUpdateSettings } from '@/features/settings/api';

interface FormValues {
  defaultCurrencyCode: string;
  isOversellingAllowed: boolean;
  rowsPerPage: string;
  decimalPlaces: string;
  purchasePrefix: string;
  salePrefix: string;
  transferPrefix: string;
  requisitionPrefix: string;
  posPin: string;
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
}

/** Inventory business settings + document numbering. */
export function SettingsPage() {
  const { data, isLoading } = useSettings();
  const update = useUpdateSettings();
  const { register, handleSubmit, reset } = useForm<FormValues>();

  useEffect(() => {
    if (data) {
      reset({
        defaultCurrencyCode: data.defaultCurrencyCode ?? '',
        isOversellingAllowed: data.isOversellingAllowed,
        rowsPerPage: String(data.rowsPerPage),
        decimalPlaces: String(data.decimalPlaces),
        purchasePrefix: data.purchasePrefix,
        salePrefix: data.salePrefix,
        transferPrefix: data.transferPrefix,
        requisitionPrefix: data.requisitionPrefix,
        posPin: '',
        businessName: data.businessName ?? '',
        businessAddress: data.businessAddress ?? '',
        businessPhone: data.businessPhone ?? '',
        businessEmail: data.businessEmail ?? '',
      });
    }
  }, [data, reset]);

  const submit = handleSubmit(async (v) => {
    try {
      await update.mutateAsync({
        defaultCurrencyCode: v.defaultCurrencyCode || undefined,
        isOversellingAllowed: v.isOversellingAllowed,
        rowsPerPage: Number(v.rowsPerPage || 20),
        decimalPlaces: Number(v.decimalPlaces || 2),
        purchasePrefix: v.purchasePrefix,
        salePrefix: v.salePrefix,
        transferPrefix: v.transferPrefix,
        requisitionPrefix: v.requisitionPrefix,
        businessName: v.businessName || undefined,
        businessAddress: v.businessAddress || undefined,
        businessPhone: v.businessPhone || undefined,
        businessEmail: v.businessEmail || undefined,
        // Only send the PIN when the field was touched: a value sets/changes it,
        // a single space clears it, and leaving it blank keeps the current PIN.
        ...(v.posPin === '' ? {} : { posPin: v.posPin.trim() }),
      });
      toast.success('Settings saved');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not save settings'));
    }
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Business settings and document numbering.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Business</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="defaultCurrencyCode">Default currency</Label>
              <Input id="defaultCurrencyCode" {...register('defaultCurrencyCode')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rowsPerPage">Rows per page</Label>
              <Input id="rowsPerPage" type="number" {...register('rowsPerPage')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="decimalPlaces">Decimal places</Label>
              <Input id="decimalPlaces" type="number" {...register('decimalPlaces')} />
            </div>
            <label className="mt-6 flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('isOversellingAllowed')} /> Allow overselling (negative stock)
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Document numbering prefixes</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="purchasePrefix">Purchase</Label>
              <Input id="purchasePrefix" {...register('purchasePrefix')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="salePrefix">Sale</Label>
              <Input id="salePrefix" {...register('salePrefix')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="transferPrefix">Transfer</Label>
              <Input id="transferPrefix" {...register('transferPrefix')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="requisitionPrefix">Requisition</Label>
              <Input id="requisitionPrefix" {...register('requisitionPrefix')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business profile</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="businessName">Business name</Label>
              <Input id="businessName" {...register('businessName')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="businessPhone">Phone</Label>
              <Input id="businessPhone" {...register('businessPhone')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="businessEmail">Email</Label>
              <Input id="businessEmail" {...register('businessEmail')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="businessAddress">Address</Label>
              <Input id="businessAddress" {...register('businessAddress')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Point of Sale</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="posPin">Cashier PIN</Label>
              <Input
                id="posPin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                placeholder={
                  data?.hasPosPin ? '•••• (set — leave blank to keep)' : 'Not set'
                }
                {...register('posPin')}
              />
              <p className="text-xs text-muted-foreground">
                Locks the POS terminal. Leave blank to keep the current PIN; enter
                a space to remove it.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={update.isPending}>
            {update.isPending ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      </form>
    </div>
  );
}
