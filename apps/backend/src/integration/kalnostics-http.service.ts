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

  /**
   * GET a kalnostics paginated endpoint and return a `{ data, total, page, limit }`
   * object (lifting the kalnostics `meta` pagination back onto the payload) so the
   * inventory ResponseInterceptor can re-expose `totalPages` to the frontend.
   */
  async getPaged<T>(
    path: string,
    params?: QueryParams,
  ): Promise<{ data: T[]; total: number; page: number; limit: number }> {
    const env = await this.requestEnvelope<T[]>('GET', path, { params });
    const meta = (env.meta ?? {}) as {
      total?: number;
      page?: number;
      limit?: number;
    };
    const data = env.data ?? [];
    return {
      data,
      total: meta.total ?? data.length,
      page: meta.page ?? 1,
      limit: meta.limit ?? data.length,
    };
  }

  private async request<T>(
    method: string,
    path: string,
    opts: { params?: QueryParams; body?: unknown },
  ): Promise<T> {
    const envelope = await this.requestEnvelope<T>(method, path, opts);
    return envelope.data as T;
  }

  /**
   * POST `body` to `path` and return the raw response bytes as a `Buffer`. For
   * kalnostics endpoints that stream a binary (e.g. a rendered `application/pdf`)
   * instead of the JSON envelope. Forwards the caller's bearer token; on a
   * non-2xx response it parses the JSON error envelope (if any) and raises
   * `UpstreamException`.
   */
  async postBinary(path: string, body?: unknown): Promise<Buffer> {
    const url = this.buildUrl(path);
    const token = getBearerToken();

    const headers: Record<string, string> = { Accept: 'application/pdf' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      this.logger.error(`kalnostics POST ${url} failed: ${String(err)}`);
      throw new UpstreamException('The kalnostics service did not respond.', {
        method: 'POST',
        url,
        cause: String(err),
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      let code = `HTTP_${response.status}`;
      let message = `kalnostics POST ${path} → ${response.status}`;
      try {
        const env = (await response.json()) as KalnosticsEnvelope<unknown>;
        code = env.error?.code ?? code;
        message = env.error?.message ?? message;
      } catch {
        /* non-JSON error body — keep the status-based defaults */
      }
      throw new UpstreamException(message, {
        method: 'POST',
        url,
        status: response.status,
        code,
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private async requestEnvelope<T>(
    method: string,
    path: string,
    opts: { params?: QueryParams; body?: unknown },
  ): Promise<KalnosticsEnvelope<T>> {
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

    return envelope;
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
