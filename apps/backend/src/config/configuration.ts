/**
 * Typed configuration factory.
 *
 * Groups raw env vars into a structured, strongly-typed object so services can
 * read `config.get('kalnostics.baseUrl')` instead of scattering `process.env`
 * lookups. Registered via `ConfigModule.forRoot({ load: [configuration] })`.
 */
export const configuration = () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3100', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
  kalnostics: {
    // Base URL of the kalnostics-new backend, including its /api/v1 prefix.
    baseUrl: process.env.KALNOSTICS_API_BASE_URL,
    // Per-attempt HTTP timeout (ms) for integration calls.
    timeoutMs: parseInt(process.env.KALNOSTICS_API_TIMEOUT_MS ?? '15000', 10),
  },
  legacyMysql: {
    host: process.env.LEGACY_MYSQL_HOST,
    port: parseInt(process.env.LEGACY_MYSQL_PORT ?? '3306', 10),
    user: process.env.LEGACY_MYSQL_USER,
    password: process.env.LEGACY_MYSQL_PASSWORD,
    database: process.env.LEGACY_MYSQL_DATABASE,
    tablePrefix: process.env.LEGACY_MYSQL_TABLE_PREFIX ?? 'ez_',
  },
});

export type AppConfiguration = ReturnType<typeof configuration>;
