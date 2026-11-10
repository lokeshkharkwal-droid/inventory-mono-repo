import { Request } from 'express';

/**
 * Business-user JWT access-token payload — the SAME token kalnostics-new issues
 * (CLAUDE.md §5.1). inventory-backend only *validates* it (shared `JWT_SECRET`);
 * refresh/issuance stays in kalnostics-new.
 *
 * `active_branch_type` is kept as a loose string here (rather than importing
 * kalnostics-new's `BranchType` enum) because this service owns a different
 * Prisma schema; the value is passed through for feature-gating only.
 */
export interface JwtPayload {
  /** Person UUID — the identity of the logged-in user. */
  person_id: string;
  /** Active tenant context. */
  tenant_id: string;
  /** Active branch the user is working at (null for tenant-level profiles). */
  active_branch_id: string | null;
  /** Type of the active branch (e.g. INVENTORY, BLOOD_BANK, DIAGNOSTIC). */
  active_branch_type: string | null;
  /** Active profile key — determines permissions for this session. */
  active_profile_key: string | null;
  /** True when viewing the patient-portal context (vs. staff context). */
  is_patient_context: boolean;
  /** Every branch+profile assignment for this person (for the switcher UI). */
  profiles: JwtProfileEntry[];
  /** Whether this person has a patient record anywhere on the platform. */
  is_patient: boolean;
  /** Platform MRN — null if never registered as a patient. */
  platform_mrn: string | null;
  /** Referral panel this session is scoped to (B2B only), null otherwise. */
  referral_panel_id: string | null;
  /** Standard JWT — issued at (Unix seconds). */
  iat?: number;
  /** Standard JWT — expiry (Unix seconds). */
  exp?: number;
}

/**
 * One entry per branch+profile combination embedded in the JWT.
 * `branch_*` fields are null for tenant-level profiles (e.g. business_admin).
 */
export interface JwtProfileEntry {
  branch_id: string | null;
  branch_name: string | null;
  branch_type: string | null;
  profile_key: string;
  profile_label: string;
  is_default: boolean;
}

/** The Express request after business authentication (`@CurrentUser()` reads `user`). */
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
