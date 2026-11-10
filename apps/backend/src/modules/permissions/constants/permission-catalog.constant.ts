/**
 * Inventory permission catalogue + role baselines (the RBAC matrix). Ported from
 * the legacy ion_auth permission keys (`inventory.product_edit`, …) into the
 * kalnostics-style `inventory:<section>__<action>` namespace.
 *
 * Resolution model (mirrors kalnostics §7): superuser profiles get everything;
 * other profiles get a baseline derived here from their JWT `active_profile_key`.
 * Branch/user overrides (kalnostics `UserBranchPermission`) can layer on later —
 * this module is the self-contained baseline the inventory app enforces + feeds
 * to the frontend for disable-don't-hide gating.
 */

export interface PermissionSection {
  key: string;
  label: string;
  actions: { action: string; label: string }[];
}

const A = (action: string, label: string) => ({ action, label });

/** The catalogue, grouped by section. */
export const PERMISSION_SECTIONS: PermissionSection[] = [
  {
    key: 'products',
    label: 'Products',
    actions: [
      A('view', 'View'),
      A('create', 'Create'),
      A('edit', 'Edit'),
      A('delete', 'Delete'),
      A('adjust_stock', 'Adjust stock'),
    ],
  },
  {
    key: 'purchases',
    label: 'Purchases',
    actions: [
      A('view', 'View'),
      A('create', 'Create'),
      A('delete', 'Delete'),
      A('pay', 'Record payment'),
      A('return', 'Return'),
    ],
  },
  {
    key: 'sales',
    label: 'Sales',
    actions: [
      A('view', 'View'),
      A('create', 'Create'),
      A('delete', 'Delete'),
      A('pay', 'Record payment'),
      A('return', 'Return'),
      A('deliver', 'Deliveries'),
    ],
  },
  {
    key: 'transfers',
    label: 'Transfers',
    actions: [
      A('view', 'View'),
      A('create', 'Create'),
      A('send', 'Send'),
      A('receive', 'Receive'),
    ],
  },
  {
    key: 'requisitions',
    label: 'Requisitions',
    actions: [
      A('view', 'View'),
      A('create', 'Create'),
      A('approve', 'Approve'),
    ],
  },
  {
    key: 'pos',
    label: 'POS',
    actions: [
      A('use', 'Use terminal'),
      A('manage_register', 'Manage register'),
    ],
  },
  {
    key: 'parties',
    label: 'Suppliers & Customers',
    actions: [
      A('view', 'View'),
      A('create', 'Create'),
      A('edit', 'Edit'),
      A('delete', 'Delete'),
    ],
  },
  {
    key: 'financials',
    label: 'Expenses, Incomes, Gift cards',
    actions: [
      A('view', 'View'),
      A('create', 'Create'),
      A('edit', 'Edit'),
      A('delete', 'Delete'),
    ],
  },
  {
    key: 'bloodbank',
    label: 'Blood bank',
    actions: [
      A('view', 'View'),
      A('create', 'Create'),
      A('edit', 'Edit'),
      A('delete', 'Delete'),
    ],
  },
  {
    key: 'ipd',
    label: 'IPD',
    actions: [
      A('view', 'View'),
      A('admit', 'Admit'),
      A('discharge', 'Discharge'),
    ],
  },
  { key: 'reports', label: 'Reports', actions: [A('view', 'View')] },
  {
    key: 'settings',
    label: 'Settings',
    actions: [A('view', 'View'), A('manage', 'Manage')],
  },
];

/** Build a permission key. */
export const permKey = (section: string, action: string): string =>
  `inventory:${section}__${action}`;

/** Every permission key in the catalogue. */
export const ALL_PERMISSIONS: string[] = PERMISSION_SECTIONS.flatMap((s) =>
  s.actions.map((a) => permKey(s.key, a.action)),
);

/** Only the `view` keys (the read-only baseline). */
const VIEW_ONLY: string[] = PERMISSION_SECTIONS.filter((s) =>
  s.actions.some((a) => a.action === 'view'),
).map((s) => permKey(s.key, 'view'));

/** All keys for a set of sections. */
const sectionKeys = (sections: string[]): string[] =>
  PERMISSION_SECTIONS.filter((s) => sections.includes(s.key)).flatMap((s) =>
    s.actions.map((a) => permKey(s.key, a.action)),
  );

/** Profiles that bypass all permission checks (full access). */
export const SUPERUSER_PROFILES = new Set([
  'business_admin',
  'administrator',
  'owner',
  'super_owner',
]);

/**
 * Baseline permission keys per profile (non-superuser). Unknown profiles fall
 * back to read-only (VIEW_ONLY).
 */
const ROLE_BASELINE: Record<string, string[]> = {
  inventory_manager: ALL_PERMISSIONS,
  chemist: sectionKeys([
    'products',
    'purchases',
    'sales',
    'transfers',
    'requisitions',
    'pos',
    'parties',
    'financials',
    'reports',
  ]),
  chemist_assistant: [
    ...VIEW_ONLY,
    permKey('sales', 'create'),
    permKey('pos', 'use'),
    permKey('requisitions', 'create'),
  ],
  logistics_executive: sectionKeys([
    'products',
    'transfers',
    'requisitions',
    'reports',
  ]),
  finance_manager: [
    ...VIEW_ONLY,
    ...sectionKeys(['financials']),
    permKey('sales', 'pay'),
    permKey('purchases', 'pay'),
  ],
  finance_assistant: [...VIEW_ONLY, permKey('financials', 'create')],
};

/**
 * Resolve the CODE-BASELINE permission keys for a profile. Superusers get all;
 * otherwise the role baseline, defaulting to read-only. This is the fallback
 * used when a tenant has not customised the role (see PermissionsService).
 */
export function resolvePermissions(
  profileKey: string | null | undefined,
): string[] {
  if (!profileKey) return VIEW_ONLY;
  if (SUPERUSER_PROFILES.has(profileKey)) return ALL_PERMISSIONS;
  return ROLE_BASELINE[profileKey] ?? VIEW_ONLY;
}

/** Display metadata for every role an admin can manage in the RBAC screen. */
export interface ManageableRole {
  key: string;
  label: string;
  /** Superuser roles always have full access and cannot be edited (anti-lockout). */
  isSuperuser: boolean;
}

export const MANAGEABLE_ROLES: ManageableRole[] = [
  { key: 'business_admin', label: 'Business Admin', isSuperuser: true },
  { key: 'administrator', label: 'Administrator', isSuperuser: true },
  { key: 'owner', label: 'Owner', isSuperuser: true },
  { key: 'super_owner', label: 'Super Owner', isSuperuser: true },
  { key: 'inventory_manager', label: 'Inventory Manager', isSuperuser: false },
  { key: 'chemist', label: 'Chemist', isSuperuser: false },
  { key: 'chemist_assistant', label: 'Chemist Assistant', isSuperuser: false },
  { key: 'logistics_executive', label: 'Logistics Executive', isSuperuser: false },
  { key: 'finance_manager', label: 'Finance Manager', isSuperuser: false },
  { key: 'finance_assistant', label: 'Finance Assistant', isSuperuser: false },
  // kalnostics clinical/business profile keys — editable so an admin can grant
  // them inventory permissions (they default to view-only until customised).
  { key: 'doctor', label: 'Doctor', isSuperuser: false },
  { key: 'branch_admin', label: 'Branch Admin', isSuperuser: false },
  { key: 'receptionist', label: 'Receptionist', isSuperuser: false },
  { key: 'lab_technician', label: 'Lab Technician', isSuperuser: false },
  { key: 'marketing_executive', label: 'Marketing Executive', isSuperuser: false },
  { key: 'phlebotomist', label: 'Phlebotomist', isSuperuser: false },
];
