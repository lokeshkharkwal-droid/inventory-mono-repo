/**
 * Business-user profile keys (roles) — imported from kalnostics-new to keep the
 * two projects' role definitions consistent.
 *
 * SOURCE OF TRUTH: kalnostics-new/src/modules/permissions/constants/
 *   profile-registry.constant.ts
 * Keep this list in sync when kalnostics-new adds/renames roles. Only the role
 * KEYS + human LABELS are ported here (the inventory app resolves per-role
 * permissions itself); the kalnostics branch-type matrix is not needed.
 */
export const PROFILE_REGISTRY = [
  // ── Original (back-compat) ──
  'business_admin',
  'branch_admin',
  'doctor',
  'lab_technician',
  'receptionist',
  'patient',
  // ── User Management v2.0 predefined roles ──
  'administrator',
  'junior_lab_technician',
  'senior_lab_technician',
  'consultant_doctor',
  'reporting_doctor',
  'phlebotomist',
  'marketing_executive',
  'marketing_manager',
  'inventory_manager',
  'chemist',
  'chemist_assistant',
  'finance_manager',
  'finance_assistant',
  'logistics_executive',
  'opd_assistant',
  'radiologist',
  'radiology_assistant',
  'nursing_staff',
  'nursing_incharge',
  // ── B2B Referral Panel login ──
  'b2b_referring_panel',
] as const;

export type ProfileKey = (typeof PROFILE_REGISTRY)[number];

/**
 * Staff-assignable roles — every profile key except `patient` (a patient is not
 * a staff role). This is the set surfaced in the inventory role-management UI.
 */
export const STAFF_ROLE_KEYS: ProfileKey[] = PROFILE_REGISTRY.filter(
  (k) => k !== 'patient',
);

/** Human-readable labels for the role dropdowns (kept identical to kalnostics-new). */
export const PROFILE_LABELS: Record<ProfileKey, string> = {
  business_admin: 'Business Admin',
  branch_admin: 'Branch Admin',
  doctor: 'Doctor',
  lab_technician: 'Lab Technician',
  receptionist: 'Receptionist',
  patient: 'Patient',
  administrator: 'Administrator',
  junior_lab_technician: 'Junior Lab Technician',
  senior_lab_technician: 'Senior Lab Technician',
  consultant_doctor: 'Consultant Doctor',
  reporting_doctor: 'Reporting Doctor',
  phlebotomist: 'Phlebotomist',
  marketing_executive: 'Marketing Executive',
  marketing_manager: 'Marketing Manager',
  inventory_manager: 'Inventory Manager',
  chemist: 'Chemist',
  chemist_assistant: 'Chemist Assistant',
  finance_manager: 'Finance Manager',
  finance_assistant: 'Finance Assistant',
  logistics_executive: 'Logistics Executive',
  opd_assistant: 'OPD Assistant',
  radiologist: 'Radiologist',
  radiology_assistant: 'Radiology Assistant',
  nursing_staff: 'Nursing Staff',
  nursing_incharge: 'Nursing Incharge',
  b2b_referring_panel: 'B2B Referring Panel',
};
