import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KaltrosException } from '../../common/exceptions/kaltros.exception';

/** A staff user as surfaced to the inventory role-assignment picker. */
export interface AssignableUser {
  personId: string;
  name: string;
  username: string | null;
  email: string | null;
}

/**
 * Reads the tenant's staff list from kalnostics-new (`GET /users/manage`) so the
 * inventory role-assignment screen can offer a people picker. Forwards the
 * caller's Bearer token; never caches identity.
 */
@Injectable()
export class KalnosticsUserClient {
  private readonly logger = new Logger(KalnosticsUserClient.name);

  constructor(private readonly config: ConfigService) {}

  /** List assignable staff users (optionally filtered by a search term). */
  async listUsers(
    bearerToken: string,
    search?: string,
  ): Promise<AssignableUser[]> {
    const baseUrl = this.config.get<string>('kalnostics.baseUrl');
    const timeoutMs = this.config.get<number>('kalnostics.timeoutMs') ?? 15000;
    if (!baseUrl) {
      throw new KaltrosException(
        'IDENTITY_NOT_CONFIGURED',
        'Identity service is not configured.',
        { reason: 'KALNOSTICS_API_BASE_URL missing' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const url = new URL(`${baseUrl}/users/manage`);
    url.searchParams.set('limit', '100');
    if (search) url.searchParams.set('search', search);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url.toString(), {
        headers: { Authorization: bearerToken },
        signal: controller.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.error(`users fetch failed: ${res.status} ${text.slice(0, 300)}`);
        throw new KaltrosException(
          'IDENTITY_FETCH_FAILED',
          'Could not load the user list.',
          { status: res.status },
          HttpStatus.BAD_GATEWAY,
        );
      }
      const json = (await res.json()) as {
        data?: {
          data?: Array<{
            id: string;
            employeeName?: string;
            username?: string | null;
            email?: string | null;
          }>;
        };
      };
      const rows = json.data?.data ?? [];
      return rows.map((r) => ({
        personId: r.id,
        name: r.employeeName || r.username || r.id,
        username: r.username ?? null,
        email: r.email ?? null,
      }));
    } catch (err) {
      if (err instanceof KaltrosException) throw err;
      this.logger.error(`users fetch error: ${String(err)}`);
      throw new KaltrosException(
        'IDENTITY_UNREACHABLE',
        'Identity service is unreachable.',
        { error: String(err) },
        HttpStatus.BAD_GATEWAY,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
