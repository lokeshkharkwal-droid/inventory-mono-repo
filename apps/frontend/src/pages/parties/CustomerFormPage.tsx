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
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import {
  FORM_FIELD,
  FORM_FIELD_ERROR,
  FORM_PICKER,
  FORM_SELECT,
  PartyField,
  PartyFormCard,
} from '@/components/shared/PartyFormCard';
import { customerHooks } from '@/features/customers/api';
import {
  locationPayload,
  missingLocationLevels,
  toPartyPayload,
  type LocationLevel,
} from '@/features/_shared/party-form';
import { getApiErrorMessage } from '@/lib/http';
import { applyApiFieldErrors } from '@/lib/form-errors';
import { cn } from '@/lib/utils';

interface FormShape {
  companyName: string;
  name: string;
  vatNo: string;
  email: string;
  phone: string;
  address: string;
  status: string;
  postalCode: string;
  ccf1: string;
  ccf2: string;
  ccf3: string;
  ccf4: string;
  ccf5: string;
  ccf6: string;
}

const EMPTY: FormShape = {
  companyName: '',
  name: '',
  vatNo: '',
  email: '',
  phone: '',
  address: '',
  status: '1',
  postalCode: '',
  ccf1: '',
  ccf2: '',
  ccf3: '',
  ccf4: '',
  ccf5: '',
  ccf6: '',
};

/**
 * Country, State and City are all mandatory: they are dependent dropdowns (a
 * City can only be picked after a Country and State), so all three are marked.
 */
const REQUIRED_LOCATION: LocationLevel[] = ['country', 'state', 'city'];
const CUSTOM_FIELDS = ['ccf1', 'ccf2', 'ccf3', 'ccf4', 'ccf5', 'ccf6'] as const;
const REQUIRED_MSG = 'Please enter/select a value';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-()\s]{6,20}$/;

/**
 * Add / Edit Customer — EZ Health Track "Add Customer" parity in the kaltros
 * form style: Default Customer Group, then Company, Name, VAT Number, Email,
 * Phone, Address, Country → State → City and Status on the left; Postal Code and
 * Customer Custom Fields 1–6 on the right. (Patients use the Patient form.)
 */
export function CustomerFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const one = customerHooks.useOne(id);
  const create = customerHooks.useCreate();
  const update = customerHooks.useUpdate();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitted },
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
      companyName: c.companyName ?? '',
      name: c.name,
      vatNo: c.vatNo ?? '',
      email: c.email ?? '',
      phone: c.phone ?? '',
      address: c.address ?? '',
      status: c.isActive ? '1' : '0',
      postalCode: c.postalCode ?? '',
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

  const missingLocation = missingLocationLevels(location, REQUIRED_LOCATION);

  const submit = handleSubmit(async ({ status, ...v }) => {
    if (missingLocation.length) return;
    const payload = {
      ...toPartyPayload(
        { ...v, customerGroupId, ...locationPayload(location) },
        isEdit,
      ),
      isActive: status === '1',
    };
    try {
      if (isEdit && id) {
        await update.mutateAsync({ id, input: payload });
        toast.success('Customer updated');
      } else {
        await create.mutateAsync(payload);
        toast.success('Customer created');
      }
      navigate('/customers');
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
        toast.error(getApiErrorMessage(err, 'Could not save customer'));
    }
  });

  const text = (
    name: keyof FormShape,
    label: string,
    opts: { required?: boolean; type?: string; pattern?: RegExp; patternMsg?: string } = {},
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
      entity="Customer"
      editing={isEdit}
      backTo="/customers"
      loading={isEdit && one.isLoading}
      notFound={isEdit && one.isError}
      saving={create.isPending || update.isPending}
      onSubmit={submit}
    >
      <div className="space-y-4">
        <PartyField label="Default Customer Group" htmlFor="customer_group">
          <InfiniteSelect
            id="customer_group"
            className={FORM_PICKER}
            value={customerGroupId}
            onChange={setCustomerGroupId}
            queryKey={['customer-groups']}
            path="/customer-groups"
            getOptionValue={(r) => String(r.id ?? '')}
            getOptionLabel={(r) => String(r.name ?? '')}
            placeholder="Select customer group…"
            clearable
          />
        </PartyField>

        <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
          <div className="space-y-4">
            {text('companyName', 'Company', { required: true })}
            {text('name', 'Name', { required: true })}
            {text('vatNo', 'VAT Number')}
            {text('email', 'Email Address', {
              required: true,
              type: 'email',
              pattern: EMAIL_RE,
              patternMsg: 'Please enter a valid email address',
            })}
            {text('phone', 'Phone', {
              required: true,
              type: 'tel',
              pattern: PHONE_RE,
              patternMsg: 'Please enter a valid phone number',
            })}
            {text('address', 'Address', { required: true })}
            <LocationSelect
              value={location}
              onChange={setLocation}
              required={REQUIRED_LOCATION}
              errors={isSubmitted ? missingLocation : []}
            />
            <PartyField label="Status" htmlFor="status" required>
              <Select id="status" className={FORM_SELECT} {...register('status')}>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </Select>
            </PartyField>
          </div>

          <div className="space-y-4">
            {text('postalCode', 'Postal Code')}
            {CUSTOM_FIELDS.map((cf, i) => (
              <div key={cf}>{text(cf, `Customer Custom Field ${i + 1}`)}</div>
            ))}
          </div>
        </div>
      </div>
    </PartyFormCard>
  );
}
