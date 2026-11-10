/**
 * Max request body size in MB. Express's default JSON limit (100kb) is too small
 * for legitimate rich-text / bulk-import payloads (e.g. a large CSV preview or a
 * long notes field). DTOs still enforce tighter per-field limits on top of this.
 */
export const REQUEST_BODY_LIMIT_MB = 10;
