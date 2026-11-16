import { InfiniteSelect } from '@/components/shared/InfiniteSelect';

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
  required?: boolean;
  /** Also render a City → Area (locality) dependent dropdown. */
  includeArea?: boolean;
  /** Render in the legacy form-group style (label + control). */
  className?: string;
}

/**
 * Dependent Country → State → City dropdowns, populated from SiteAdmin location
 * data (proxied via `/integration/locations/*`). Emits both the canonical id and
 * the display name for each level; selecting a country resets state + city, and a
 * state resets city — mirroring the EZ Health Track address pickers. States are
 * disabled until a country is chosen, cities until a state is chosen.
 */
export function LocationSelect({
  value,
  onChange,
  required,
  includeArea,
}: Props) {
  const Field = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div className="ezht-form-group">
      <label className="ezht-label">
        {label}
        {required && <span className="ezht-req">*</span>}
      </label>
      {children}
    </div>
  );

  return (
    <>
      <Field label="Country">
        <InfiniteSelect
          id="country_id"
          value={value.countryId}
          selectedLabel={value.countryName}
          onChange={(id) => onChange({ ...value, countryId: id })}
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
        />
      </Field>

      <Field label="State">
        <InfiniteSelect
          id="state_id"
          value={value.stateId}
          selectedLabel={value.stateName}
          disabled={!value.countryId}
          onChange={(id) => onChange({ ...value, stateId: id })}
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
        />
      </Field>

      <Field label="City">
        <InfiniteSelect
          id="city_id"
          value={value.cityId}
          selectedLabel={value.cityName}
          disabled={!value.stateId}
          onChange={(id) => onChange({ ...value, cityId: id })}
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
        />
      </Field>

      {includeArea && (
        <Field label="Locality">
          <InfiniteSelect
            id="area_id"
            value={value.areaId ?? ''}
            selectedLabel={value.areaName}
            disabled={!value.cityId}
            onChange={(id) => onChange({ ...value, areaId: id })}
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
          />
        </Field>
      )}
    </>
  );
}
