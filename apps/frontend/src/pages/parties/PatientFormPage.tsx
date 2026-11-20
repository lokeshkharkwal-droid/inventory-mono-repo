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
import { customerHooks } from '@/features/customers/api';
import {
  GST_STATES,
  ageFromDob,
  locationPayload,
  missingLocationLevels,
  splitName,
  toPartyPayload,
  type LocationLevel,
} from '@/features/_shared/party-form';
import { getApiErrorMessage } from '@/lib/http';
import { cn } from '@/lib/utils';

interface FormShape {
  firstName: string;
  middleName: string;
  lastName: string;
  gender: string;
  age: string;
  dob: string;
  registrationDate: string;
  email: string;
  phone: string;
  patientType: string;
  address: string;
  address2: string;
  postalCode: string;
  idType: string;
  uid: string;
  gstNo: string;
  panNo: string;
  gstState: string;
}

const today = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const EMPTY: FormShape = {
  firstName: '',
  middleName: '',
  lastName: '',
  gender: '',
  age: '',
  dob: '',
  registrationDate: today(),
  email: '',
  phone: '',
  patientType: 'General',
  address: '',
  address2: '',
  postalCode: '',
  idType: '',
  uid: '',
  gstNo: '',
  panNo: '',
  gstState: '',
};

/** Country, State and City are mandatory; Locality is optional. */
const REQUIRED_LOCATION: LocationLevel[] = ['country', 'state', 'city'];
const REQUIRED_MSG = 'Please enter/select a value';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-()\s]{6,20}$/;

const day = (s: string | null | undefined) => (s ? s.slice(0, 10) : '');

/**
 * Add / Edit Patient — EZ Health Track "Add Patient" clinical registration in
 * the kaltros form style: name parts, gender, age / date of birth (DOB fills
 * Age), registration date, patient type, two address lines, Country → State →
 * City → Locality, ZIP, ID type / number and GST / PAN. A patient is stored as a
 * customer record; `patientType` marks it as a patient for the Patients list.
 */
export function PatientFormPage() {
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
    setValue,
    watch,
    formState: { errors, isSubmitted },
  } = useForm<FormShape>({ defaultValues: EMPTY });
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION);

  useEffect(() => {
    if (!isEdit || !one.data) return;
    const c = one.data;
    // Legacy / linked records may only carry the full `name` — split it so the
    // required First Name isn't blank on edit.
    const parts =
      c.firstName || c.middleName || c.lastName
        ? {
            firstName: c.firstName ?? '',
            middleName: c.middleName ?? '',
            lastName: c.lastName ?? '',
          }
        : splitName(c.name);
    reset({
      ...parts,
      gender: c.gender ?? '',
      age: c.age ?? '',
      dob: day(c.dob),
      registrationDate: day(c.registrationDate),
      email: c.email ?? '',
      phone: c.phone ?? '',
      patientType: c.patientType ?? 'General',
      address: c.address ?? '',
      address2: c.address2 ?? '',
      postalCode: c.postalCode ?? '',
      idType: c.idType ?? '',
      uid: c.uid ?? '',
      gstNo: c.gstNo ?? '',
      panNo: c.panNo ?? '',
      gstState: c.gstState ?? '',
    });
    setLocation({
      countryId: c.countryId ?? '',
      countryName: c.country ?? '',
      stateId: c.stateId ?? '',
      stateName: c.state ?? '',
      cityId: c.cityId ?? '',
      cityName: c.city ?? '',
      areaId: c.areaId ?? '',
      areaName: c.area ?? '',
    });
  }, [isEdit, one.data, reset]);

  const missingLocation = missingLocationLevels(location, REQUIRED_LOCATION);
  const gstState = watch('gstState');
  const legacyGstState =
    gstState && !GST_STATES.some((s) => s.code === gstState) ? gstState : '';

  const submit = handleSubmit(async (v) => {
    if (missingLocation.length) return;
    const name = [v.firstName, v.middleName, v.lastName]
      .map((p) => p.trim())
      .filter(Boolean)
      .join(' ');
    const payload = {
      ...toPartyPayload({ ...v, ...locationPayload(location, true) }, isEdit),
      name,
    };
    try {
      if (isEdit && id) {
        await update.mutateAsync({ id, input: payload });
        toast.success('Patient updated');
      } else {
        await create.mutateAsync(payload);
        toast.success('Patient created');
      }
      navigate('/patients');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not save patient'));
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

  const select = (
    name: keyof FormShape,
    label: string,
    options: { value: string; label: string }[],
    required = false,
  ) => (
    <PartyField
      label={label}
      htmlFor={name}
      required={required}
      error={errors[name]?.message}
    >
      <Select
        id={name}
        className={cn(FORM_SELECT, errors[name] && FORM_FIELD_ERROR)}
        aria-invalid={errors[name] ? true : undefined}
        {...register(name, { required: required ? REQUIRED_MSG : false })}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </PartyField>
  );

  const dob = register('dob');
  const grid3 = 'grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <PartyFormCard
      entity="Patient"
      editing={isEdit}
      backTo="/patients"
      loading={isEdit && one.isLoading}
      notFound={isEdit && one.isError}
      saving={create.isPending || update.isPending}
      onSubmit={submit}
    >
      <div className="space-y-4">
        <div className={grid3}>
          {text('firstName', 'First Name', { required: true })}
          {text('middleName', 'Middle Name')}
          {text('lastName', 'Last Name')}

          {select(
            'gender',
            'Gender',
            [
              { value: '', label: 'Select' },
              { value: 'Male', label: 'Male' },
              { value: 'Female', label: 'Female' },
              { value: 'Other', label: 'Other' },
            ],
            true,
          )}
          {text('age', 'Age (In Years)', { maxLength: 3, pattern: /^\d{1,3}$/, patternMsg: 'Enter age in whole years' })}
          <PartyField label="Date of Birth" htmlFor="dob">
            <Input
              id="dob"
              type="date"
              max={today()}
              className={FORM_FIELD}
              {...dob}
              onChange={(e) => {
                void dob.onChange(e);
                const age = ageFromDob(e.target.value);
                if (age) setValue('age', age, { shouldValidate: isSubmitted });
              }}
            />
          </PartyField>

          {text('registrationDate', 'Registration Date', { type: 'date' })}
          {text('email', 'Email', {
            type: 'email',
            pattern: EMAIL_RE,
            patternMsg: 'Please enter a valid email address',
          })}
          {text('phone', 'Phone', {
            type: 'tel',
            pattern: PHONE_RE,
            patternMsg: 'Please enter a valid phone number',
          })}

          {select(
            'patientType',
            'Patient Type',
            [
              { value: 'General', label: 'General' },
              { value: 'OPD', label: 'OPD' },
              { value: 'IPD', label: 'IPD' },
              { value: 'Emergency', label: 'Emergency' },
            ],
            true,
          )}
          {text('address', 'Address 1', { required: true })}
          {text('address2', 'Address 2')}
        </div>

        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <LocationSelect
            value={location}
            onChange={setLocation}
            required={REQUIRED_LOCATION}
            errors={isSubmitted ? missingLocation : []}
            includeArea
          />
        </div>

        <div className={grid3}>
          {text('postalCode', 'ZIP code', { required: true, maxLength: 6 })}
          {select('idType', 'ID Type', [
            { value: '', label: 'Select' },
            { value: 'PASSPORT', label: 'PASSPORT' },
            { value: 'UID', label: 'AADHAR CARD' },
          ])}
          {text('uid', 'ID Number')}
          {text('gstNo', 'GST No.')}
          {text('panNo', 'PAN No.')}
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
