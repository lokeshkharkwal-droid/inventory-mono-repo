import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ImageUp, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  LocationSelect,
  EMPTY_LOCATION,
  type LocationValue,
} from '@/components/shared/LocationSelect';
import {
  FORM_FIELD,
  FORM_FIELD_ERROR,
  FORM_SELECT,
  FORM_TEXTAREA,
  PartyField,
  PartyFormCard,
} from '@/components/shared/PartyFormCard';
import { manufacturerHooks } from '@/features/manufacturers/api';
import {
  locationPayload,
  missingLocationLevels,
  toPartyPayload,
  type LocationLevel,
} from '@/features/_shared/party-form';
import { getApiErrorMessage, uploadInventoryDocument } from '@/lib/http';
import { applyApiFieldErrors } from '@/lib/form-errors';
import { cn } from '@/lib/utils';

interface FormShape {
  imageUrl: string;
  companyName: string;
  name: string;
  vatNo: string;
  email: string;
  phone: string;
  address: string;
  status: string;
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
  imageUrl: '',
  companyName: '',
  name: '',
  vatNo: '',
  email: '',
  phone: '',
  address: '',
  status: '1',
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
 * Country, State and City are all mandatory: they are dependent dropdowns (a
 * City can only be picked after a Country and State), so all three are marked.
 */
const REQUIRED_LOCATION: LocationLevel[] = ['country', 'state', 'city'];
const CUSTOM_FIELDS = ['cf1', 'cf2', 'cf3', 'cf4', 'cf5', 'cf6'] as const;
const REQUIRED_MSG = 'Please enter/select a value';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-()\s]{6,20}$/;

/**
 * Add / Edit Manufacturer — EZ Health Track "Add Manufacturer" parity (field
 * set, order, labels and required flags), in the kaltros form style: Logo upload;
 * left column Company, Name, VAT Number, Email, Phone, Address, Country → State →
 * City, Status; right column Postal Code and Manufacturer Custom Fields 1–6; a
 * full-width Invoice Footer.
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
    setValue,
    watch,
    formState: { errors, isSubmitted },
  } = useForm<FormShape>({
    defaultValues: EMPTY,
    mode: 'onTouched',
  });
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION);

  useEffect(() => {
    if (!isEdit || !one.data) return;
    const m = one.data;
    reset({
      imageUrl: m.imageUrl ?? '',
      companyName: m.companyName ?? '',
      name: m.name,
      vatNo: m.vatNo ?? '',
      email: m.email ?? '',
      phone: m.phone ?? '',
      address: m.address ?? '',
      status: m.isActive ? '1' : '0',
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

  const missingLocation = missingLocationLevels(location, REQUIRED_LOCATION);

  const submit = handleSubmit(async ({ status, ...v }) => {
    if (missingLocation.length) return;
    const payload = {
      ...toPartyPayload({ ...v, ...locationPayload(location) }, isEdit),
      isActive: status === '1',
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
      entity="Manufacturer"
      editing={isEdit}
      backTo="/manufacturers"
      loading={isEdit && one.isLoading}
      notFound={isEdit && one.isError}
      saving={create.isPending || update.isPending}
      onSubmit={submit}
    >
      <div className="space-y-4">
        <PartyField label="Logo" htmlFor="logo">
          <LogoUpload
            value={watch('imageUrl')}
            onChange={(url) => setValue('imageUrl', url, { shouldDirty: true })}
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
            {CUSTOM_FIELDS.map((cf, i) =>
              <div key={cf}>{text(cf, `Manufacturer Custom Field ${i + 1}`)}</div>,
            )}
          </div>
        </div>

        <PartyField label="Invoice Footer" htmlFor="invoiceFooter">
          <textarea
            id="invoiceFooter"
            className={FORM_TEXTAREA}
            maxLength={1000}
            {...register('invoiceFooter')}
          />
        </PartyField>
      </div>
    </PartyFormCard>
  );
}

/**
 * Logo picker — uploads an image through the shared `/uploads/attachment`
 * endpoint and stores its public URL, with a thumbnail preview and a remove
 * action (replaces the legacy free-text "Logo" box).
 */
function LogoUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [broken, setBroken] = useState(false);

  useEffect(() => setBroken(false), [value]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.');
      return;
    }
    setUploading(true);
    try {
      onChange(await uploadInventoryDocument(file));
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not upload the logo'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <input
        ref={inputRef}
        id="logo"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={onFile}
      />
      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-gray-50">
        {value && !broken ? (
          <img
            src={value}
            alt="Manufacturer logo"
            className="h-full w-full object-contain"
            onError={() => setBroken(true)}
          />
        ) : (
          <ImageUp className="h-5 w-5 text-gray-300" aria-hidden="true" />
        )}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-md border-gray-200 text-gray-700"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
        {uploading ? 'Uploading…' : value ? 'Change logo' : 'Upload logo'}
      </Button>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-md text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => onChange('')}
        >
          <X className="h-4 w-4" /> Remove
        </Button>
      )}
    </div>
  );
}
