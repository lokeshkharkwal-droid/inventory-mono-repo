import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supplierHooks } from '@/features/suppliers/api';
import {
  LocationSelect,
  EMPTY_LOCATION,
  type LocationValue,
} from '@/components/shared/LocationSelect';
import { getApiErrorMessage } from '@/lib/http';
import '@/styles/ezht-form.css';

interface FormShape {
  company: string;
  email: string;
  address: string;
  zip: string;
  status: string; // '1' active | '0' inactive
  name: string;
  phone: string;
  drugLicense: string;
  vatNo: string;
  gstNo: string;
  panNo: string;
  gstState: string;
}

const EMPTY: FormShape = {
  company: '',
  email: '',
  address: '',
  zip: '',
  status: '1',
  name: '',
  phone: '',
  drugLicense: '',
  vatNo: '',
  gstNo: '',
  panNo: '',
  gstState: '',
};

/**
 * Add / Edit Supplier — a faithful port of the EZ Health Track "Add Supplier"
 * modal: the same two-column layout, field order, labels, required flags and the
 * Status dropdown, with Country → State → City as dependent dropdowns populated
 * from SiteAdmin location data.
 */
export function SupplierFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const one = supplierHooks.useOne(id);
  const create = supplierHooks.useCreate();
  const update = supplierHooks.useUpdate();

  const { register, handleSubmit, reset } = useForm<FormShape>({
    defaultValues: EMPTY,
  });
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION);

  // Seed the form + location once the edit record arrives.
  useEffect(() => {
    if (!isEdit || !one.data) return;
    const s = one.data;
    reset({
      company: s.companyName ?? '',
      email: s.email ?? '',
      address: s.address ?? '',
      zip: s.postalCode ?? '',
      status: s.isActive ? '1' : '0',
      name: s.name,
      phone: s.phone ?? '',
      drugLicense: s.drugLicense ?? '',
      vatNo: s.vatNo ?? '',
      gstNo: s.gstNo ?? '',
      panNo: s.panNo ?? '',
      gstState: s.gstState ?? '',
    });
    setLocation({
      countryId: s.countryId ?? '',
      countryName: s.country ?? '',
      stateId: s.stateId ?? '',
      stateName: s.state ?? '',
      cityId: s.cityId ?? '',
      cityName: s.city ?? '',
    });
  }, [isEdit, one.data, reset]);

  const submit = handleSubmit(async (v) => {
    const payload = {
      companyName: v.company || undefined,
      email: v.email || undefined,
      address: v.address || undefined,
      postalCode: v.zip || undefined,
      isActive: v.status === '1',
      name: v.name,
      phone: v.phone || undefined,
      drugLicense: v.drugLicense || undefined,
      vatNo: v.vatNo || undefined,
      gstNo: v.gstNo || undefined,
      panNo: v.panNo || undefined,
      gstState: v.gstState || undefined,
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
        toast.success('Supplier updated');
      } else {
        await create.mutateAsync(payload);
        toast.success('Supplier created');
      }
      navigate('/suppliers');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not save supplier'));
    }
  });

  const saving = create.isPending || update.isPending;

  if (isEdit && one.isLoading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="ezht-form">
      <form onSubmit={submit} className="ezht-modal" aria-label="Supplier form">
        <div className="ezht-modal-header">
          <h4 className="ezht-modal-title">
            {isEdit ? 'Edit Supplier' : 'Add Supplier'}
          </h4>
        </div>

        <div className="ezht-modal-body">
          <div className="ezht-row">
            {/* Left column — mirrors EZHT order. */}
            <div className="ezht-col">
              <div className="ezht-form-group">
                <label className="ezht-label" htmlFor="company">
                  Company<span className="ezht-req">*</span>
                </label>
                <input
                  id="company"
                  className="ezht-control"
                  required
                  {...register('company', { required: true })}
                />
              </div>

              <div className="ezht-form-group">
                <label className="ezht-label" htmlFor="email">
                  Email Address<span className="ezht-req">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  className="ezht-control"
                  required
                  {...register('email', { required: true })}
                />
              </div>

              <div className="ezht-form-group">
                <label className="ezht-label" htmlFor="address">
                  Address<span className="ezht-req">*</span>
                </label>
                <input
                  id="address"
                  className="ezht-control"
                  required
                  {...register('address', { required: true })}
                />
              </div>

              <LocationSelect value={location} onChange={setLocation} required />

              <div className="ezht-form-group">
                <label className="ezht-label" htmlFor="zip">
                  Postal Code<span className="ezht-req">*</span>
                </label>
                <input
                  id="zip"
                  className="ezht-control"
                  maxLength={6}
                  required
                  {...register('zip', { required: true })}
                />
              </div>

              <div className="ezht-form-group">
                <label className="ezht-label" htmlFor="status">
                  Status<span className="ezht-req">*</span>
                </label>
                <select
                  id="status"
                  className="ezht-control"
                  required
                  {...register('status', { required: true })}
                >
                  <option value="1">Active</option>
                  <option value="0">Inactive</option>
                </select>
              </div>
            </div>

            {/* Right column. */}
            <div className="ezht-col">
              <div className="ezht-form-group">
                <label className="ezht-label" htmlFor="name">
                  Name<span className="ezht-req">*</span>
                </label>
                <input
                  id="name"
                  className="ezht-control"
                  required
                  {...register('name', { required: true })}
                />
              </div>

              <div className="ezht-form-group">
                <label className="ezht-label" htmlFor="phone">
                  Phone<span className="ezht-req">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  className="ezht-control"
                  required
                  {...register('phone', { required: true })}
                />
              </div>

              <div className="ezht-form-group">
                <label className="ezht-label" htmlFor="drugLicense">
                  Drug License
                </label>
                <input
                  id="drugLicense"
                  className="ezht-control"
                  {...register('drugLicense')}
                />
              </div>

              <div className="ezht-form-group">
                <label className="ezht-label" htmlFor="vatNo">
                  VAT No.
                </label>
                <input id="vatNo" className="ezht-control" {...register('vatNo')} />
              </div>

              <div className="ezht-form-group">
                <label className="ezht-label" htmlFor="gstNo">
                  GST No.
                </label>
                <input id="gstNo" className="ezht-control" {...register('gstNo')} />
              </div>

              <div className="ezht-form-group">
                <label className="ezht-label" htmlFor="panNo">
                  PAN No.
                </label>
                <input id="panNo" className="ezht-control" {...register('panNo')} />
              </div>

              <div className="ezht-form-group">
                <label className="ezht-label" htmlFor="gstState">
                  GST State
                </label>
                <input
                  id="gstState"
                  className="ezht-control"
                  {...register('gstState')}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="ezht-modal-footer">
          <button
            type="button"
            className="ezht-btn ezht-btn-default"
            onClick={() => navigate('/suppliers')}
          >
            Cancel
          </button>
          <button type="submit" className="ezht-btn ezht-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Add Supplier'}
          </button>
        </div>
      </form>
    </div>
  );
}
