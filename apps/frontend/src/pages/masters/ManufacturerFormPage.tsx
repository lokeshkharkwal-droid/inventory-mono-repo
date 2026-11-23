import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { manufacturerHooks } from '@/features/manufacturers/api';
import {
  LocationSelect,
  EMPTY_LOCATION,
  type LocationValue,
} from '@/components/shared/LocationSelect';
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
  imageUrl: string;
  postalCode: string;
  cf1: string;
  cf2: string;
  cf3: string;
  cf4: string;
  cf5: string;
  cf6: string;
  invoiceFooter: string;
}

const EMPTY: FormShape = {
  company: '',
  name: '',
  vatNo: '',
  email: '',
  phone: '',
  address: '',
  status: '1',
  imageUrl: '',
  postalCode: '',
  cf1: '',
  cf2: '',
  cf3: '',
  cf4: '',
  cf5: '',
  cf6: '',
  invoiceFooter: '',
};

/**
 * Add / Edit Manufacturer — faithful port of the EZ Health Track "Add
 * Manufacturer" modal: logo + two-column body + full-width invoice footer, the
 * Status dropdown, and Country → State → City dependent dropdowns from SiteAdmin
 * location data (replacing the legacy free-text city/state/country inputs).
 */
export function ManufacturerFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const one = manufacturerHooks.useOne(id);
  const create = manufacturerHooks.useCreate();
  const update = manufacturerHooks.useUpdate();

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

  useEffect(() => {
    if (!isEdit || !one.data) return;
    const m = one.data;
    reset({
      company: m.companyName ?? '',
      name: m.name,
      vatNo: m.vatNo ?? '',
      email: m.email ?? '',
      phone: m.phone ?? '',
      address: m.address ?? '',
      status: m.isActive ? '1' : '0',
      imageUrl: m.imageUrl ?? '',
      postalCode: m.postalCode ?? '',
      cf1: m.cf1 ?? '',
      cf2: m.cf2 ?? '',
      cf3: m.cf3 ?? '',
      cf4: m.cf4 ?? '',
      cf5: m.cf5 ?? '',
      cf6: m.cf6 ?? '',
      invoiceFooter: m.invoiceFooter ?? '',
    });
    setLocation({
      countryId: m.countryId ?? '',
      countryName: m.country ?? '',
      stateId: m.stateId ?? '',
      stateName: m.state ?? '',
      cityId: m.cityId ?? '',
      cityName: m.city ?? '',
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
      imageUrl: v.imageUrl || undefined,
      postalCode: v.postalCode || undefined,
      cf1: v.cf1 || undefined,
      cf2: v.cf2 || undefined,
      cf3: v.cf3 || undefined,
      cf4: v.cf4 || undefined,
      cf5: v.cf5 || undefined,
      cf6: v.cf6 || undefined,
      invoiceFooter: v.invoiceFooter || undefined,
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
        toast.success('Manufacturer updated');
      } else {
        await create.mutateAsync(payload);
        toast.success('Manufacturer created');
      }
      navigate('/manufacturers');
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
          'imageUrl',
          'postalCode',
          'cf1',
          'cf2',
          'cf3',
          'cf4',
          'cf5',
          'cf6',
          'invoiceFooter',
        ],
      });
      if (!mapped) toast.error(getApiErrorMessage(err, 'Could not save manufacturer'));
    }
  });

  const saving = create.isPending || update.isPending;

  if (isEdit && one.isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }

  // A plain render function (not a nested component) so inputs keep focus.
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
      <form onSubmit={submit} className="ezht-modal" aria-label="Manufacturer form">
        <div className="ezht-modal-header">
          <h4 className="ezht-modal-title">
            {isEdit ? 'Edit Manufacturer' : 'Add Manufacturer'}
          </h4>
        </div>

        <div className="ezht-modal-body">
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
              {field('imageUrl', 'Logo')}
              {field('postalCode', 'Postal Code')}
              {field('cf1', 'Custom field 1')}
              {field('cf2', 'Custom field 2')}
              {field('cf3', 'Custom field 3')}
              {field('cf4', 'Custom field 4')}
              {field('cf5', 'Custom field 5')}
              {field('cf6', 'Custom field 6')}
            </div>
          </div>

          <div className="ezht-form-group">
            <label className="ezht-label" htmlFor="invoiceFooter">
              Invoice Footer
            </label>
            <textarea
              id="invoiceFooter"
              className="ezht-control"
              style={{ height: 100 }}
              {...register('invoiceFooter')}
            />
          </div>
        </div>

        <div className="ezht-modal-footer">
          <button
            type="button"
            className="ezht-btn ezht-btn-default"
            onClick={() => navigate('/manufacturers')}
          >
            Cancel
          </button>
          <button type="submit" className="ezht-btn ezht-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Add Manufacturer'}
          </button>
        </div>
      </form>
    </div>
  );
}
