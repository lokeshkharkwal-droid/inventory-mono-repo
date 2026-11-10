import * as Joi from 'joi';

/**
 * Joi schema for environment variables.
 *
 * `ConfigModule.forRoot` runs this at boot. If a required var is missing or
 * malformed, the app refuses to start — failing fast beats a confusing runtime
 * crash later (mirrors kalnostics-new / SKILL.md §7).
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3100),

  // Shared Postgres DB (the kalnostics-new database). inventory-backend owns
  // only the inventory_* tables within it.
  DATABASE_URL: Joi.string().uri().required(),

  // Must equal kalnostics-new's JWT_SECRET so we validate the same business
  // access tokens locally (no auth round-trip).
  JWT_SECRET: Joi.string().min(32).required(),

  // When true, PrismaService sets app.current_tenant_id per request so Postgres
  // RLS (prisma/rls.sql) enforces tenant isolation. Default false.
  RLS_ENABLED: Joi.boolean().default(false),

  // kalnostics-new integration API (base URL incl. its /api/v1 prefix).
  KALNOSTICS_API_BASE_URL: Joi.string().uri().required(),
  KALNOSTICS_API_TIMEOUT_MS: Joi.number().integer().min(1000).default(15000),

  // Comma-separated allowed frontend origins; '*' permissive fallback in dev.
  CORS_ORIGIN: Joi.string().default('*'),

  // Legacy MySQL source — only read by the data-migration script, never at
  // runtime. All optional so the app boots without them.
  LEGACY_MYSQL_HOST: Joi.string().allow('').optional(),
  LEGACY_MYSQL_PORT: Joi.number().port().optional(),
  LEGACY_MYSQL_USER: Joi.string().allow('').optional(),
  LEGACY_MYSQL_PASSWORD: Joi.string().allow('').optional(),
  LEGACY_MYSQL_DATABASE: Joi.string().allow('').optional(),
  LEGACY_MYSQL_TABLE_PREFIX: Joi.string().allow('').default('ez_'),
});
