/**
 * SiteAdmin JWT payload (kalnostics-new CLAUDE.md §5.2). Shares `JWT_SECRET`
 * with the business token but carries a `type: 'siteadmin'` discriminator so a
 * business token can never be used on a SiteAdmin route and vice-versa. The
 * inventory backend only consumes this token (to guard the master-product
 * catalogue) — it never issues one; login lives in kalnostics-new.
 */
export interface SiteAdminJwtPayload {
  /** Discriminator — must be `'siteadmin'`. */
  type: 'siteadmin';
  /** SiteAdmin user UUID. */
  siteadmin_id: string;
  /** Email (display + audit). */
  email: string;
  /** Cumulative role (content_admin → operations_admin → full_admin → super_owner). */
  role: string;
  iat?: number;
  exp?: number;
}
