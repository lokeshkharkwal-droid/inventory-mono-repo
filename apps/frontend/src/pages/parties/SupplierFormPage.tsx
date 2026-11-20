import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  LocationSelect,
  EMPTY_LOCATION,
  type LocationValue,
} from '@/components/shared/LocationSelect';
import {
  FORM_FIELD,
  FORM_FIELD_ERROR,
  FORM_SELECT,
  PartyField,
  PartyFormCard,
} from '@/components/shared/PartyFormCard';
import { supplierHooks } from '@/features/suppliers/api';
import {
  GST_STATES,
  locationPayload,
  missingLocationLevels,
  toPartyPayload,
  type LocationLevel,
} from '@/features/_shared/party-form';
import { getApiErrorMessage } from '@/lib/http';
import { cn } from '@/lib/utils';

interface FormShape {
  companyName: string;
  email: string;
  address: string;
  postalCode: string;
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
  companyName: '',
  email: '',
  address: '',
  postalCode: '',
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
 * Country, State and City are all mandatory: they are dependent dropdowns (a
 * City can only be picked after a Country and State), so all three are marked.
 */
const REQUIRED_LOCATION: LocationLevel[] = ['country', 'state', 'city'];
const REQUIRED_MSG = 'Please enter/select a value';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-()\s]{6,20}$/;

/**
 * Add / Edit Supplier — EZ Health Track "Add Supplier" parity (field set, order,
 * labels and required flags) in the kaltros form style. Left column: Company,
 * Email Address, Address, Country → State → City, Postal Code, Status; right
 * column: Name, Phone, Drug License, VAT Number, GSTIN, PAN Number, GST State.
 */
export function SupplierFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const one = supplierHooks.useOne(id);
  const create = supplierHooks.useCreate();
  const update = supplierHooks.useUpdate();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitted },
  } = useForm<FormShape>({ defaultValues: EMPTY });
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION);

  // Seed the form + location once the edit record arrives.
  useEffect(() => {
    if (!isEdit || !one.data) return;
    const s = one.data;
    reset({
      companyName: s.companyName ?? '',
      email: s.email ?? '',
      address: s.address ?? '',
      postalCode: s.postalCode ?? '',
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

  const missingLocation = missingLocationLevels(location, REQUIRED_LOCATION);
  const gstState = watch('gstState');
  // Keep a legacy free-text GST state selectable (not one of the 36 codes).
  const legacyGstState =
    gstState && !GST_STATES.some((s) => s.code === gstState) ? gstState : '';

  const submit = handleSubmit(async ({ status, ...v }) => {
    if (missingLocation.length) return;
    const payload = {
      ...toPartyPayload({ ...v, ...locationPayload(location) }, isEdit),
      isActive: status === '1',
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

  const text = (
    name: keyof FormShape,
    label: string,
    opts: {
      required?: boolean;
      type?: string;
      maxLength?: number;
      pattern?: RegExp;
      patternMsg?: string;
    } = {},
  ) => (
    <PartyField
      label={label}
      htmlFor={name}
      required={opts.required}
      error={errors[name]?.message}
    >
      <Input
        id={name}
        type={opts.type ?? 'text'}
        maxLength={opts.maxLength}
        className={cn(FORM_FIELD, errors[name] && FORM_FIELD_ERROR)}
        aria-invalid={errors[name] ? true : undefined}
        {...register(name, {
          required: opts.required ? REQUIRED_MSG : false,
          validate: (val) =>
            !opts.pattern || !val.trim() || opts.pattern.test(val.trim())
              ? true
              : (opts.patternMsg ?? 'Invalid value'),
        })}
      />
    </PartyField>
  );

  return (
    <PartyFormCard
      entity="Supplier"
      editing={isEdit}
      backTo="/suppliers"
      loading={isEdit && one.isLoading}
      notFound={isEdit && one.isError}
      saving={create.isPending || update.isPending}
      onSubmit={submit}
    >
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
        {/* Left column — mirrors the EZHT order. */}
        <div className="space-y-4">
          {text('companyName', 'Company', { required: true })}
          {text('email', 'Email Address', {
            required: true,
            type: 'email',
            pattern: EMAIL_RE,
            patternMsg: 'Please enter a valid email address',
          })}
          {text('address', 'Address', { required: true })}
          <LocationSelect
            value={location}
            onChange={setLocation}
            required={REQUIRED_LOCATION}
            errors={isSubmitted ? missingLocation : []}
          />
          {text('postalCode', 'Postal Code', { required: true, maxLength: 6 })}
          <PartyField label="Status" htmlFor="status" required>
            <Select id="status" className={FORM_SELECT} {...register('status')}>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </Select>
          </PartyField>
        </div>

        {/* Right column. */}
        <div className="space-y-4">
          {text('name', 'Name', { required: true })}
          {text('phone', 'Phone', {
            required: true,
            type: 'tel',
            pattern: PHONE_RE,
            patternMsg: 'Please enter a valid phone number',
          })}
          {text('drugLicense', 'Drug License')}
          {text('vatNo', 'VAT Number')}
          {text('gstNo', 'GSTIN')}
          {text('panNo', 'PAN Number')}
          <PartyField label="GST State" htmlFor="gstState">
            <Select id="gstState" className={FORM_SELECT} {...register('gstState')}>
              <option value="">Select</option>
              {legacyGstState && (
                <option value={legacyGstState}>{legacyGstState}</option>
              )}
              {GST_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </Select>
          </PartyField>
        </div>
      </div>
    </PartyFormCard>
  );
}
