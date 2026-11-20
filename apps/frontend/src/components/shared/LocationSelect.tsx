import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import {
  FORM_PICKER,
  FORM_PICKER_ERROR,
  PartyField,
} from '@/components/shared/PartyFormCard';
import type { LocationLevel } from '@/features/_shared/party-form';
import { cn } from '@/lib/utils';

/** The location selection — canonical SiteAdmin ids plus display names. */
export interface LocationValue {
  countryId: string;
  countryName: string;
  stateId: string;
  stateName: string;
  cityId: string;
  cityName: string;
  /** Optional 4th level (locality) — used by the Patient form. */
  areaId?: string;
  areaName?: string;
}

export const EMPTY_LOCATION: LocationValue = {
  countryId: '',
  countryName: '',
  stateId: '',
  stateName: '',
  cityId: '',
  cityName: '',
  areaId: '',
  areaName: '',
};

interface Props {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
  /** Levels that are mandatory (marked `*`); validated by the parent form. */
  required?: LocationLevel[];
  /** Levels to flag with an inline "required" error (after a submit attempt). */
  errors?: LocationLevel[];
  /** Also render a City → Locality dependent dropdown. */
  includeArea?: boolean;
  /** Class for each level's wrapper (e.g. a grid cell). */
  itemClassName?: string;
}

const REQUIRED_MSG = 'Please select a value';

/**
 * Dependent Country → State → City (→ Locality) dropdowns, populated from
 * SiteAdmin location data (proxied via `/integration/locations/*`). Emits both
 * the canonical id and the display name for each level; choosing a parent
 * resets its children. A child is disabled until its parent is chosen.
 */
export function LocationSelect({
  value,
  onChange,
  required = [],
  errors = [],
  includeArea,
  itemClassName,
}: Props) {
  const level = (lvl: LocationLevel) => ({
    required: required.includes(lvl),
    error: errors.includes(lvl) ? REQUIRED_MSG : undefined,
    picker: cn(FORM_PICKER, errors.includes(lvl) && FORM_PICKER_ERROR),
  });
  const country = level('country');
  const state = level('state');
  const city = level('city');
  const area = level('area');

  return (
    <>
      <PartyField
        label="Country"
        htmlFor="country_id"
        required={country.required}
        error={country.error}
        className={itemClassName}
      >
        <InfiniteSelect
          id="country_id"
          className={country.picker}
          value={value.countryId}
          selectedLabel={value.countryName}
          onChange={(id) => {
            // Cleared (×) → reset the whole chain.
            if (!id) onChange({ ...EMPTY_LOCATION });
          }}
          onSelect={(row) =>
            onChange({
              ...EMPTY_LOCATION,
              countryId: String(row.id ?? ''),
              countryName: String(row.name ?? ''),
            })
          }
          queryKey={['locations', 'countries']}
          path="/integration/locations/countries"
          getOptionValue={(r) => String(r.id ?? '')}
          getOptionLabel={(r) => String(r.name ?? '')}
          placeholder="Select country…"
          clearable
        />
      </PartyField>

      <PartyField
        label="State"
        htmlFor="state_id"
        required={state.required}
        error={state.error}
        className={itemClassName}
      >
        <InfiniteSelect
          id="state_id"
          className={state.picker}
          value={value.stateId}
          selectedLabel={value.stateName}
          disabled={!value.countryId}
          onChange={(id) => {
            if (!id) {
              onChange({
                ...value,
                stateId: '',
                stateName: '',
                cityId: '',
                cityName: '',
                areaId: '',
                areaName: '',
              });
            }
          }}
          onSelect={(row) =>
            onChange({
              ...value,
              stateId: String(row.id ?? ''),
              stateName: String(row.name ?? ''),
              cityId: '',
              cityName: '',
              areaId: '',
              areaName: '',
            })
          }
          queryKey={['locations', 'states', value.countryId]}
          path="/integration/locations/states"
          extra={{ countryId: value.countryId || undefined }}
          getOptionValue={(r) => String(r.id ?? '')}
          getOptionLabel={(r) => String(r.name ?? '')}
          placeholder={value.countryId ? 'Select state…' : 'Select country first'}
          clearable
        />
      </PartyField>

      <PartyField
        label="City"
        htmlFor="city_id"
        required={city.required}
        error={city.error}
        className={itemClassName}
      >
        <InfiniteSelect
          id="city_id"
          className={city.picker}
          value={value.cityId}
          selectedLabel={value.cityName}
          disabled={!value.stateId}
          onChange={(id) => {
            if (!id) {
              onChange({
                ...value,
                cityId: '',
                cityName: '',
                areaId: '',
                areaName: '',
              });
            }
          }}
          onSelect={(row) =>
            onChange({
              ...value,
              cityId: String(row.id ?? ''),
              cityName: String(row.name ?? ''),
              areaId: '',
              areaName: '',
            })
          }
          queryKey={['locations', 'cities', value.stateId]}
          path="/integration/locations/cities"
          extra={{ stateId: value.stateId || undefined }}
          getOptionValue={(r) => String(r.id ?? '')}
          getOptionLabel={(r) => String(r.name ?? '')}
          placeholder={value.stateId ? 'Select city…' : 'Select state first'}
          clearable
        />
      </PartyField>

      {includeArea && (
        <PartyField
          label="Locality"
          htmlFor="area_id"
          required={area.required}
          error={area.error}
          className={itemClassName}
        >
          <InfiniteSelect
            id="area_id"
            className={area.picker}
            value={value.areaId ?? ''}
            selectedLabel={value.areaName}
            disabled={!value.cityId}
            onChange={(id) => {
              if (!id) onChange({ ...value, areaId: '', areaName: '' });
            }}
            onSelect={(row) =>
              onChange({
                ...value,
                areaId: String(row.id ?? ''),
                areaName: String(row.name ?? ''),
              })
            }
            queryKey={['locations', 'areas', value.cityId]}
            path="/integration/locations/areas"
            extra={{ cityId: value.cityId || undefined }}
            getOptionValue={(r) => String(r.id ?? '')}
            getOptionLabel={(r) => String(r.name ?? '')}
            placeholder={value.cityId ? 'Select locality…' : 'Select city first'}
            clearable
          />
        </PartyField>
      )}
    </>
  );
}
