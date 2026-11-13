/**
 * EZ Health Track prescription dropdown options, replicated verbatim from the
 * legacy `SOAPTemplate` model (protected/models/SOAPTemplate.php) used by the
 * business product form. Values equal labels (EZHT stores the displayed string),
 * except Frequency which stores the short `frequencyName` with a descriptive
 * label.
 */

export interface Option {
  value: string;
  label: string;
}
export interface OptionGroup {
  label: string;
  options: Option[];
}

const flat = (xs: string[]): Option[] => xs.map((x) => ({ value: x, label: x }));

/** PRESCRIPTION_UNIT_TYPE + INVENTORY_UNIT_TYPES + HOMEOPATHY_POTENCY (combined). */
export const UNIT_TYPE_GROUPS: OptionGroup[] = [
  {
    label: 'Prescription units',
    options: flat([
      'mg', 'gm', 'mcg', 'MCI/ML', 'MG/ML', 'MG/ACTUAT', 'MG/MG', 'MG/HR', 'mL',
      'Teaspoon', 'UNT', 'UNT/ML', 'UNT/MG', 'UNT/ACTUAT', 'MEQ/ML', 'CELLS/ML',
      'MEQ', '%', 'BAU/ML', 'AU/ML',
    ]),
  },
  {
    label: 'Inventory units',
    options: flat(['Number', 'Pack', 'Piece', 'Box', 'Bottle', 'Can']),
  },
  {
    label: 'Homeopathy potency',
    options: flat([
      'θ Internal', 'θ External', '3x', '6x', '12x', '30x', '200x', '6', '30',
      '200', '1M', '10M', '50M', 'CM', '0/1', '0/2', '0/3', '0/4', '0/5', '0/6',
      '0/7', '0/8', '0/9', '0/10', '0/11', '0/12', '0/13', '0/14', '0/15', '0/16',
      '0/17', '0/18', '0/19', '0/20', '0/21', '0/22', '0/23', '0/24', '0/25',
      '0/26', '0/27', '0/28', '0/29', '0/30',
    ]),
  },
];

/** PRESCRIPTION_FORMULATIONS + HOMEOPATHY_FORMULATIONS (combined). */
export const FORMULATION_GROUPS: OptionGroup[] = [
  {
    label: 'Prescription formulations',
    options: flat([
      'Cap', 'Cream', 'Douche', 'Drug Implant', 'EC Cap', 'EC Tab', 'Enema',
      'Foam', 'Gel', 'Granules', 'Gum', 'Injection', 'Insulin', 'Irrig Sol',
      'Lotion', 'Lozenge', 'MDI', 'Medicated Bar Soap', 'Medicated Liquid Soap',
      'Medicated Shampoo', 'Ointment', 'Paste', 'Pwdr', 'Spray', 'Sol', 'Susp',
      'Suppository', 'Syrup', 'Tab', 'XR Cap', 'XR Tab', '24 Hrs XR Tab',
      '24 Hrs Patch', '72 Hrs Patch',
    ]),
  },
  {
    label: 'Homeopathy formulations',
    options: flat(['Biochemic', 'Eye/Ear Drop', 'Medicine', 'Ointment']),
  },
];

/** PRESCRIPTION_ROUTE. */
export const ROUTE_OPTIONS: Option[] = flat([
  'Oral', 'Sublingual (Under the tounge)', 'Buccal (between the gums and teeth)',
  'Injection', 'Injection - Subcutaneous', 'Injection - Intramuscular',
  'Injection - Intravenous', 'Injection - Transdermal', 'Injection - Implantation',
  'Rectal', 'Vaginal', 'Ocular (Placed in the eye)', 'Otic(ear)', 'Nasal',
  'Inhalation', 'Nebulization', 'Cutaneous', 'Transdermal', 'Topical', 'PO', 'Local',
]);

/** frequencyList — value = frequencyName, label = "name — description". */
export const FREQUENCY_OPTIONS: Option[] = [
  ['OD', 'once a day'],
  ['BD', 'twice a day'],
  ['TD', 'thrice a day'],
  ['QID', 'four times a day'],
  ['PID', 'five times a day'],
  ['HS', 'Bed time'],
  ['1-time-a-day', 'Once a day any time'],
  ['1-time-a-day-m', 'Once a day in the morning'],
  ['1-time-a-day-e', 'Once a day in the evening'],
  ['1-time-a-day-a', 'Once a day in the afternoon'],
  ['2-time-a-day-m-e', 'Twice in a day 1 in the morning 1 in the evening'],
  ['2-time-a-day-m-a', 'Twice in a day 1 in the morning 1 in the afternoon'],
  ['2-time-a-day-a-e', 'Twice in a day 1 in the afternoon 1 in the evening'],
  ['3-time-a-day-m-a-e', 'Three time a day 1 morning 1 afternoon 1 evening'],
  ['4-time-a-day-every-6-hours', 'Four time a day after every 6 hours'],
  ['5-time-a-day-every-5-hours', 'Five time a day after every 5 hours'],
  ['6-time-a-day-every-4-hours', 'Six time a day after every 4 hours'],
  ['1-time-a-day-as-needed', 'One time a day as needed'],
  ['2-time-a-day-as-needed', 'Two time a day as needed'],
  ['3-time-a-day-as-needed', 'Three time a day as needed'],
  ['4-time-a-day-as-needed', 'Four time a day as needed'],
  ['5-time-a-day-as-needed', 'Five time a day as needed'],
  ['6-time-a-day-as-needed', 'Six time a day as needed'],
  ['Every-hour-as-needed', 'Every hour as needed'],
  ['Every-Two-hour-as-needed', 'Every Two hour as needed'],
  ['Every-Three-hour-as-needed', 'Every Three hour as needed'],
  ['Every-four-hour-as-needed', 'Every four hour as needed'],
  ['Every-six-hour-as-needed', 'Every six hour as needed'],
  ['Every-eight-hour-as-needed', 'Every eight hour as needed'],
  ['once-weekly', 'Once in a week'],
  ['twice-weekly', 'Twice in a week'],
  ['once-monthly', 'Once in a month'],
  ['twice-monthly', 'Twice in a month'],
  ['every-other-day', 'Every other day'],
  ['alternate-day', 'Alternate day'],
  ['M-W-F', 'MONDAY WEDNESDAY FRIDAY'],
  ['T-T-S', 'TUESDAY THURSDAY SATURDAY'],
].map((row) => ({ value: row[0] as string, label: `${row[0]} — ${row[1]}` }));

/** PrescribeRx::getYesNo(). */
export const REFILL_OPTIONS: Option[] = flat(['Yes', 'No']);

/** PRESCRIPTION_NOTE_SUGGESTIONS (deduped, order preserved). */
export const PRESCRIPTION_NOTE_OPTIONS: Option[] = flat([
  'After breakfast', 'After Lunch', 'After Dinner',
  'After Breakfast Before Lunch', 'After Breakfast Before Dinner',
  'After Breakfast After Dinner', 'After Breakfast After Lunch After Dinner',
  'After Lunch Before Dinner', 'After Dinner Before Breakfast', 'Bed Time',
  'Before Breakfast', 'Before Breakfast Before Lunch Before Dinner',
  'Before Breakfast Before Dinner', 'Before Lunch', 'Before Dinner',
  'Once in a day',
]);
