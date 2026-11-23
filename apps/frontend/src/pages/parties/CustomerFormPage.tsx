import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { customerHooks } from '@/features/customers/api';
import {
  LocationSelect,
  EMPTY_LOCATION,
  type LocationValue,
} from '@/components/shared/LocationSelect';
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import { getApiErrorMessage } from '@/lib/http';
import { applyApiFieldErrors } from '@/lib/form-errors';
import '@/styles/ezht-form.css';

interface FormShape {
  company: string;
  name: string;
  vatNo: string;
  email: string;
  phone: string;
  address: string;
  status: string;
  postalCode: string;
  gstNo: string;
  panNo: string;
  gstState: string;
  ccf1: string;
  ccf2: string;
  ccf3: string;
  ccf4: string;
  ccf5: string;
  ccf6: string;
}

const EMPTY: FormShape = {
  company: '',
  name: '',
  vatNo: '',
  email: '',
  phone: '',
  address: '',
  status: '1',
  postalCode: '',
  gstNo: '',
  panNo: '',
  gstState: '',
  ccf1: '',
  ccf2: '',
  ccf3: '',
  ccf4: '',
  ccf5: '',
  ccf6: '',
};

/**
 * Add / Edit Customer (or Patient) — faithful port of the EZ Health Track
 * "Add Customer" modal: the Default Customer Group dropdown, two-column body, the
 * Status dropdown, Country → State → City dependent dropdowns from SiteAdmin
 * location data, and ccf1–6. The Patient variant additionally surfaces the
 * GST/PAN fields (as the legacy add_patient form does).
 */
export function CustomerFormPage({ patient = false }: { patient?: boolean } = {}) {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const basePath = patient ? '/patients' : '/customers';
  const entity = patient ? 'Patient' : 'Customer';

  const one = customerHooks.useOne(id);
  const create = customerHooks.useCreate();
  const update = customerHooks.useUpdate();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormShape>({
    defaultValues: EMPTY,
    mode: 'onTouched',
  });
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION);
  const [customerGroupId, setCustomerGroupId] = useState('');

  useEffect(() => {
    if (!isEdit || !one.data) return;
    const c = one.data;
    reset({
      company: c.companyName ?? '',
      name: c.name,
      vatNo: c.vatNo ?? '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      address: c.address ?? '',
      status: c.isActive ? '1' : '0',
      postalCode: c.postalCode ?? '',
      gstNo: c.gstNo ?? '',
      panNo: c.panNo ?? '',
      gstState: c.gstState ?? '',
      ccf1: c.ccf1 ?? '',
      ccf2: c.ccf2 ?? '',
      ccf3: c.ccf3 ?? '',
      ccf4: c.ccf4 ?? '',
      ccf5: c.ccf5 ?? '',
      ccf6: c.ccf6 ?? '',
    });
    setCustomerGroupId(c.customerGroupId ?? '');
    setLocation({
      countryId: c.countryId ?? '',
      countryName: c.country ?? '',
      stateId: c.stateId ?? '',
      stateName: c.state ?? '',
      cityId: c.cityId ?? '',
      cityName: c.city ?? '',
    });
  }, [isEdit, one.data, reset]);

  const submit = handleSubmit(async (v) => {
    const payload = {
      companyName: v.company || undefined,
      name: v.name,
      vatNo: v.vatNo || undefined,
      email: v.email || undefined,
      phone: v.phone || undefined,
      address: v.address || undefined,
      isActive: v.status === '1',
      postalCode: v.postalCode || undefined,
      gstNo: v.gstNo || undefined,
      panNo: v.panNo || undefined,
      gstState: v.gstState || undefined,
      ccf1: v.ccf1 || undefined,
      ccf2: v.ccf2 || undefined,
      ccf3: v.ccf3 || undefined,
      ccf4: v.ccf4 || undefined,
      ccf5: v.ccf5 || undefined,
      ccf6: v.ccf6 || undefined,
      customerGroupId: customerGroupId || undefined,
      countryId: location.countryId || undefined,
      country: location.countryName || undefined,
      stateId: location.stateId || undefined,
      state: location.stateName || undefined,
      cityId: location.cityId || undefined,
      city: location.cityName || undefined,
    };
    try {
      if (isEdit && id) {
        await update.mutateAsync({ id, input: payload });
        toast.success(`${entity} updated`);
      } else {
        await create.mutateAsync(payload);
        toast.success(`${entity} created`);
      }
      navigate(basePath);
    } catch (err) {
      const mapped = applyApiFieldErrors(err, setError, {
        fields: [
          'company',
          'name',
          'vatNo',
          'email',
          'phone',
          'address',
          'status',
          'postalCode',
          'gstNo',
          'panNo',
          'gstState',
          'ccf1',
          'ccf2',
          'ccf3',
          'ccf4',
          'ccf5',
          'ccf6',
        ],
      });
      if (!mapped)
        toast.error(getApiErrorMessage(err, `Could not save ${entity.toLowerCase()}`));
    }
  });

  const saving = create.isPending || update.isPending;

  if (isEdit && one.isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }

  const field = (
    name: keyof FormShape,
    label: string,
    required = false,
    type = 'text',
  ) => (
    <div className="ezht-form-group">
      <label className="ezht-label" htmlFor={name}>
        {label}
        {required && <span className="ezht-req">*</span>}
      </label>
      <input
        id={name}
        type={type}
        className="ezht-control"
        aria-invalid={!!errors[name]}
        {...register(name, required ? { required: `${label} is required` } : {})}
      />
      {errors[name] && <p className="ezht-error">{errors[name]?.message as string}</p>}
    </div>
  );

  return (
    <div className="ezht-form">
      <form onSubmit={submit} className="ezht-modal" aria-label={`${entity} form`}>
        <div className="ezht-modal-header">
          <h4 className="ezht-modal-title">
            {isEdit ? `Edit ${entity}` : `Add ${entity}`}
          </h4>
        </div>

        <div className="ezht-modal-body">
          {/* Default Customer Group — full width (legacy top field). */}
          <div className="ezht-form-group">
            <label className="ezht-label" htmlFor="customer_group">
              Default Customer Group
            </label>
            <InfiniteSelect
              id="customer_group"
              value={customerGroupId}
              onChange={setCustomerGroupId}
              queryKey={['customer-groups']}
              path="/customer-groups"
              getOptionValue={(r) => String(r.id ?? '')}
              getOptionLabel={(r) => String(r.name ?? '')}
              placeholder="Select customer group…"
              clearable
            />
          </div>

          <div className="ezht-row">
            <div className="ezht-col">
              {field('company', 'Company', true)}
              {field('name', 'Name', true)}
              {field('vatNo', 'VAT No.')}
              {field('email', 'Email Address', true, 'email')}
              {field('phone', 'Phone', true, 'tel')}
              {field('address', 'Address', true)}
              <LocationSelect value={location} onChange={setLocation} required />
              <div className="ezht-form-group">
                <label className="ezht-label" htmlFor="status">
                  Status<span className="ezht-req">*</span>
                </label>
                <select
                  id="status"
                  className="ezht-control"
                  aria-invalid={!!errors.status}
                  {...register('status', { required: 'Status is required' })}
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
                {errors.status && (
                  <p className="ezht-error">{errors.status?.message as string}</p>
                )}
              </div>
            </div>

            <div className="ezht-col">
              {field('postalCode', 'Postal Code')}
              {patient && field('gstNo', 'GST No.')}
              {patient && field('panNo', 'PAN No.')}
              {patient && field('gstState', 'GST State')}
              {field('ccf1', 'Custom field 1')}
              {field('ccf2', 'Custom field 2')}
              {field('ccf3', 'Custom field 3')}
              {field('ccf4', 'Custom field 4')}
              {field('ccf5', 'Custom field 5')}
              {field('ccf6', 'Custom field 6')}
            </div>
          </div>
        </div>

        <div className="ezht-modal-footer">
          <button
            type="button"
            className="ezht-btn ezht-btn-default"
            onClick={() => navigate(basePath)}
          >
            Cancel
          </button>
          <button type="submit" className="ezht-btn ezht-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update' : `Add ${entity}`}
          </button>
        </div>
      </form>
    </div>
  );
}
