import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UpstreamException } from '../common/exceptions/kaltros.exception';
import { getBearerToken } from './context/request-token.context';

/** Query params accepted by the client (serialized to a query string). */
export type QueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

/** Shape of the kalnostics-new response envelope we unwrap. */
interface KalnosticsEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  meta?: Record<string, unknown>;
}

/**
 * Base HTTP client for calling the kalnostics-new API (the single runtime seam
 * that replaces the legacy `Yii_session` coupling). It:
 *   - prefixes requests with `KALNOSTICS_API_BASE_URL`,
 *   - forwards the caller's bearer token (from `requestTokenContext`),
 *   - unwraps the `{ success, data, meta }` envelope,
 *   - enforces a per-attempt timeout,
 *   - raises `UpstreamException` (502) on any failure.
 *
 * Typed clients (e.g. `KalnosticsBranchClient`) wrap this with endpoint methods.
 * Uses Node's global `fetch` (Node ≥ 18) — no extra HTTP dependency.
 */
@Injectable()
export class KalnosticsHttpService {
  private readonly logger = new Logger(KalnosticsHttpService.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    this.baseUrl = config
      .getOrThrow<string>('KALNOSTICS_API_BASE_URL')
      .replace(/\/+$/, '');
    this.timeoutMs = config.get<number>('KALNOSTICS_API_TIMEOUT_MS', 15000);
  }

  /**
   * GET `path` (relative to the kalnostics base URL) and return the unwrapped
   * `data`. Forwards the caller's bearer token.
   * @param path e.g. `/branches/options`
   * @param params optional query params (undefined/null values are dropped)
   */
  async get<T>(path: string, params?: QueryParams): Promise<T> {
    return this.request<T>('GET', path, { params });
  }

  /** POST `body` to `path` and return the unwrapped `data`. */
  async post<T>(
    path: string,
    body?: unknown,
    params?: QueryParams,
  ): Promise<T> {
    return this.request<T>('POST', path, { body, params });
  }

  private async request<T>(
    method: string,
    path: string,
    opts: { params?: QueryParams; body?: unknown },
  ): Promise<T> {
    const url = this.buildUrl(path, opts.params);
    const token = getBearerToken();

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      this.logger.error(`kalnostics ${method} ${url} failed: ${String(err)}`);
      throw new UpstreamException('The kalnostics service did not respond.', {
        method,
        url,
        cause: String(err),
      });
    } finally {
      clearTimeout(timer);
    }

    let envelope: KalnosticsEnvelope<T> | undefined;
    try {
      envelope = (await response.json()) as KalnosticsEnvelope<T>;
    } catch {
      envelope = undefined;
    }

    if (!response.ok || !envelope?.success) {
      const code = envelope?.error?.code ?? `HTTP_${response.status}`;
      const message =
        envelope?.error?.message ??
        `kalnostics ${method} ${path} → ${response.status}`;
      throw new UpstreamException(message, {
        method,
        url,
        status: response.status,
        code,
      });
    }

    return envelope.data as T;
  }

  private buildUrl(path: string, params?: QueryParams): string {
    const rel = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${rel}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, String(value));
        }
      }
    }
    return url.toString();
  }
}
