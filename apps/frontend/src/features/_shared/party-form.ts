import type { LocationValue } from '@/components/shared/LocationSelect';

/**
 * Indian GST state codes — the EZ Health Track "GST State" dropdown (Add Supplier
 * / Add Patient). The two-digit code is what is stored, as in the legacy app.
 */
export const GST_STATES: { code: string; name: string }[] = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '25', name: 'Daman & Diu' },
  { code: '26', name: 'Dadra and Nagar Haveli' },
  { code: '27', name: 'Maharashtra' },
  { code: '28', name: 'Andhra Pradesh' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar' },
  { code: '36', name: 'Telangana' },
];

/** Display label for a stored GST state (code → name; legacy free text as-is). */
export function gstStateLabel(value: string | null | undefined): string {
  if (!value) return '';
  return GST_STATES.find((s) => s.code === value)?.name ?? value;
}

/**
 * Normalise a form's values into an API payload. Strings are trimmed; a blank
 * value is OMITTED on create but sent as `null` on edit so the server clears the
 * column (sending `undefined` would drop the key and silently keep the old
 * value). Non-string values (booleans, numbers, null) pass through unchanged.
 */
export function toPartyPayload(
  values: Record<string, unknown>,
  isEdit: boolean,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(values)) {
    const value = typeof raw === 'string' ? raw.trim() : raw;
    if (value === '' || value === undefined) {
      if (isEdit) out[key] = null;
      continue;
    }
    out[key] = value;
  }
  return out;
}

/** The location ids + display names as API fields. */
export function locationPayload(l: LocationValue, includeArea = false) {
  return {
    countryId: l.countryId,
    country: l.countryName,
    stateId: l.stateId,
    state: l.stateName,
    cityId: l.cityId,
    city: l.cityName,
    ...(includeArea ? { areaId: l.areaId ?? '', area: l.areaName ?? '' } : {}),
  };
}

/** A location level the form requires. */
export type LocationLevel = 'country' | 'state' | 'city' | 'area';

/** The required levels that are still empty (drives inline errors + submit). */
export function missingLocationLevels(
  l: LocationValue,
  required: LocationLevel[],
): LocationLevel[] {
  const filled: Record<LocationLevel, string | undefined> = {
    country: l.countryId || l.countryName,
    state: l.stateId || l.stateName,
    city: l.cityId || l.cityName,
    area: l.areaId || l.areaName,
  };
  return required.filter((lvl) => !filled[lvl]);
}

/** Whole years between a `YYYY-MM-DD` date of birth and today ('' if invalid). */
export function ageFromDob(dob: string): string {
  const [y, m, d] = dob.split('-').map(Number);
  if (!y || !m || !d) return '';
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) {
    age -= 1;
  }
  return age >= 0 && age < 150 ? String(age) : '';
}

/** Split a full name into first / middle / last (legacy records only have `name`). */
export function splitName(name: string): {
  firstName: string;
  middleName: string;
  lastName: string;
} {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) {
    return { firstName: parts[0] ?? '', middleName: '', lastName: '' };
  }
  return {
    firstName: parts[0]!,
    middleName: parts.slice(1, -1).join(' '),
    lastName: parts[parts.length - 1]!,
  };
}
