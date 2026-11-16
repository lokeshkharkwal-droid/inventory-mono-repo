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
import { getApiErrorMessage } from '@/lib/http';
import '@/styles/ezht-form.css';

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
  zip: string;
  idType: string;
  uid: string;
  gstNo: string;
  panNo: string;
  gstState: string;
}

const today = () => new Date().toISOString().slice(0, 10);

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
  zip: '',
  idType: '',
  uid: '',
  gstNo: '',
  panNo: '',
  gstState: '',
};

/**
 * Add / Edit Patient — faithful port of the EZ Health Track "Add Patient" clinical
 * registration: name parts, gender, age/DOB, registration date, patient type, two
 * address lines, Country → State → City → Locality dependent dropdowns, ID type/UID
 * and GST/PAN. (The legacy Height/Eye/Hair/Visible-mark fields are commented out
 * there, so they are omitted here too.) A Patient is stored as a customer record.
 */
export function PatientFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const one = customerHooks.useOne(id);
  const create = customerHooks.useCreate();
  const update = customerHooks.useUpdate();

  const { register, handleSubmit, reset } = useForm<FormShape>({
    defaultValues: EMPTY,
  });
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION);

  const day = (s: string | null | undefined) => (s ? s.slice(0, 10) : '');

  useEffect(() => {
    if (!isEdit || !one.data) return;
    const c = one.data;
    reset({
      firstName: c.firstName ?? '',
      middleName: c.middleName ?? '',
      lastName: c.lastName ?? '',
      gender: c.gender ?? '',
      age: c.age ?? '',
      dob: day(c.dob),
      registrationDate: day(c.registrationDate) || today(),
      email: c.email ?? '',
      phone: c.phone ?? '',
      patientType: c.patientType ?? 'General',
      address: c.address ?? '',
      address2: c.address2 ?? '',
      zip: c.postalCode ?? '',
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

  const submit = handleSubmit(async (v) => {
    const name = [v.firstName, v.middleName, v.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    const payload = {
      name: name || v.firstName,
      firstName: v.firstName || undefined,
      middleName: v.middleName || undefined,
      lastName: v.lastName || undefined,
      gender: v.gender || undefined,
      age: v.age || undefined,
      dob: v.dob || undefined,
      registrationDate: v.registrationDate || undefined,
      email: v.email || undefined,
      phone: v.phone || undefined,
      patientType: v.patientType || undefined,
      address: v.address || undefined,
      address2: v.address2 || undefined,
      postalCode: v.zip || undefined,
      idType: v.idType || undefined,
      uid: v.uid || undefined,
      gstNo: v.gstNo || undefined,
      panNo: v.panNo || undefined,
      gstState: v.gstState || undefined,
      countryId: location.countryId || undefined,
      country: location.countryName || undefined,
      stateId: location.stateId || undefined,
      state: location.stateName || undefined,
      cityId: location.cityId || undefined,
      city: location.cityName || undefined,
      areaId: location.areaId || undefined,
      area: location.areaName || undefined,
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
    <div className="ezht-col3">
      <div className="ezht-form-group">
        <label className="ezht-label" htmlFor={name}>
          {label}
          {required && <span className="ezht-req">*</span>}
        </label>
        <input
          id={name}
          type={type}
          className="ezht-control"
          required={required}
          {...register(name, { required })}
        />
      </div>
    </div>
  );

  return (
    <div className="ezht-form" style={{ maxWidth: 1040 }}>
      <form onSubmit={submit} className="ezht-modal" aria-label="Patient form">
        <div className="ezht-modal-header">
          <h4 className="ezht-modal-title">
            {isEdit ? 'Edit Patient' : 'Add Patient'}
          </h4>
        </div>

        <div className="ezht-modal-body">
          <div className="ezht-row">
            {field('firstName', 'First Name', true)}
            {field('middleName', 'Middle Name')}
            {field('lastName', 'Last Name')}

            <div className="ezht-col3">
              <div className="ezht-form-group">
                <label className="ezht-label" htmlFor="gender">
                  Gender<span className="ezht-req">*</span>
                </label>
                <select id="gender" className="ezht-control" required {...register('gender', { required: true })}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            {field('age', 'Age (In Years)')}
            {field('dob', 'Date of Birth', false, 'date')}
            {field('registrationDate', 'Registration Date', false, 'date')}

            {field('email', 'Email')}
            {field('phone', 'Phone')}
            <div className="ezht-col3">
              <div className="ezht-form-group">
                <label className="ezht-label" htmlFor="patientType">
                  Patient Type<span className="ezht-req">*</span>
                </label>
                <select id="patientType" className="ezht-control" required {...register('patientType', { required: true })}>
                  <option value="General">General</option>
                  <option value="OPD">OPD</option>
                  <option value="IPD">IPD</option>
                  <option value="Emergency">Emergency</option>
                </select>
              </div>
            </div>

            {field('address', 'Address 1', true)}
            {field('address2', 'Address 2')}
          </div>

          <div className="ezht-row">
            <LocationSelect value={location} onChange={setLocation} required includeArea />
            {field('zip', 'ZIP code', true)}
          </div>

          <div className="ezht-row">
            <div className="ezht-col3">
              <div className="ezht-form-group">
                <label className="ezht-label" htmlFor="idType">ID Type</label>
                <select id="idType" className="ezht-control" {...register('idType')}>
                  <option value="">Select</option>
                  <option value="PASSPORT">PASSPORT</option>
                  <option value="UID">AADHAR CARD</option>
                </select>
              </div>
            </div>
            {field('uid', 'ID Number')}
            {field('gstNo', 'GST No.')}
            {field('panNo', 'PAN No.')}
            {field('gstState', 'GST State')}
          </div>
        </div>

        <div className="ezht-modal-footer">
          <button type="button" className="ezht-btn ezht-btn-default" onClick={() => navigate('/patients')}>
            Cancel
          </button>
          <button type="submit" className="ezht-btn ezht-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update' : 'Add Patient'}
          </button>
        </div>
      </form>
    </div>
  );
}
