/**
 * Central HTTP layer for inventory-frontend — a single Axios instance that owns:
 *   • token storage (in-memory access token + localStorage mirror),
 *   • attaching `Authorization: Bearer <accessToken>` to every request,
 *   • unwrapping the backend's `{ success, data, meta }` envelope,
 *   • silent, single-flight token refresh on 401 + one retry,
 *   • a logout signal the AuthProvider subscribes to on hard auth failure.
 *
 * Requests go to the inventory-backend (`VITE_API_BASE`). Identity is owned by
 * kalnostics-new, so login + refresh hit `VITE_KALNOSTICS_API_BASE`. Adapted
 * from kaltros-fe/src/lib/http.ts so both frontends share one contract.
 */
import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { beginRequest, endRequest } from '@/lib/request-activity';

const BASE_URL: string = import.meta.env.VITE_API_BASE || '';
const KALNOSTICS_BASE: string = import.meta.env.VITE_KALNOSTICS_API_BASE || '';
const REQUEST_TIMEOUT_MS = 30_000;

/** Typed API error carrying the backend's machine-readable `error.code`. */
export class ApiError extends Error {
  public readonly errorCode: string | null;

  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly method: string,
    public readonly path: string,
    errorCode: string | null = null,
  ) {
    super(`${method} ${path} → ${status} ${statusText}`);
    this.name = 'ApiError';
    this.errorCode = errorCode;
  }
}

// ─── Token store (shared key space with the kalnostics ecosystem) ─────────────
const TOKEN_KEY = 'kalnostic_token';
const REFRESH_TOKEN_KEY = 'kalnostic_refresh_token';

let _accessToken: string | null = null;

export function setAuthToken(token: string | null): void {
  _accessToken = token;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function getAuthToken(): string | null {
  return _accessToken;
}

export function setRefreshToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
    else localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Restore the access token from localStorage at app boot. */
export function initAuthFromStorage(): void {
  try {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) _accessToken = stored;
  } catch {
    /* ignore */
  }
}

export function clearTokens(): void {
  setAuthToken(null);
  setRefreshToken(null);
}

// ─── Logout signal ────────────────────────────────────────────────────────────
type LogoutListener = () => void;
const logoutListeners = new Set<LogoutListener>();

export function onAuthLogout(listener: LogoutListener): () => void {
  logoutListeners.add(listener);
  return () => {
    logoutListeners.delete(listener);
  };
}

function emitLogout(): void {
  logoutListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* ignore */
    }
  });
}

// ─── Envelope unwrapping ──────────────────────────────────────────────────────
interface MetaEnvelope<T> {
  success: boolean;
  data: T;
  meta?: unknown;
}

function isEnvelope(body: unknown): body is MetaEnvelope<unknown> {
  return (
    typeof body === 'object' &&
    body !== null &&
    'success' in body &&
    'data' in body
  );
}

function unwrap<T>(body: unknown): T {
  if (isEnvelope(body)) {
    if (body.success === false) {
      throw new ApiError(
        0,
        extractServerMessage(body) ?? 'Request failed',
        '',
        '',
      );
    }
    return body.data as T;
  }
  return body as T;
}

// ─── Axios instance ───────────────────────────────────────────────────────────
export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * True when a request opted out of the global loading overlay via `silent: true`
 * (e.g. background polls like the unread-count badge, or filter-dropdown option
 * fetches that render their own inline spinner). Such requests must skip BOTH
 * `beginRequest` and `endRequest` so the in-flight counter stays balanced.
 */
function isSilentConfig(config: unknown): boolean {
  return (
    typeof config === 'object' &&
    config !== null &&
    (config as { silent?: boolean }).silent === true
  );
}

/**
 * Global loading signal: bump the in-flight counter on every outgoing request
 * and release it when the request settles (success or error). Registered on
 * BOTH the `api` instance and the bare `axios` default (the latter covers the
 * auth/login/refresh/upload calls below, which hit kalnostics-new directly and
 * don't go through `api`). A single `GlobalLoadingOverlay` renders the branded
 * loader whenever the counter is non-zero, so any API call shows the loader.
 *
 * Requests flagged `silent: true` (see `RequestOptions`) are skipped entirely so
 * background polls and dropdown option fetches don't flash the full-screen loader.
 */
function attachLoadingSignal(instance: AxiosInstance): void {
  instance.interceptors.request.use(
    (config) => {
      if (!isSilentConfig(config)) beginRequest();
      return config;
    },
    (error) => {
      // Request never left (config/interceptor error) — release immediately.
      if (!isSilentConfig(error?.config)) endRequest();
      return Promise.reject(error);
    },
  );
  instance.interceptors.response.use(
    (response) => {
      if (!isSilentConfig(response.config)) endRequest();
      return response;
    },
    (error) => {
      if (!isSilentConfig(error?.config)) endRequest();
      return Promise.reject(error);
    },
  );
}

attachLoadingSignal(api);
attachLoadingSignal(axios);

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry) {
      original._retry = true;
      const refreshed = await refresh();
      if (refreshed) return api.request(original);
      clearTokens();
      emitLogout();
    }

    return Promise.reject(toApiError(error));
  },
);

function extractServerCode(body: unknown): string | null {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const err = (body as { error?: unknown }).error;
    if (typeof err === 'object' && err !== null && 'code' in err) {
      const code = (err as { code?: unknown }).code;
      if (typeof code === 'string') return code;
    }
  }
  return null;
}

function extractServerMessage(body: unknown): string | null {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const err = (body as { error?: unknown }).error;
    if (typeof err === 'object' && err !== null && 'message' in err) {
      const message = (err as { message?: unknown }).message;
      if (typeof message === 'string') return message;
      if (
        Array.isArray(message) &&
        message.every((m) => typeof m === 'string') &&
        message.length > 0
      ) {
        return message.join(', ');
      }
    }
  }
  return null;
}

/** Best human-readable message from a caught error, for toasts. */
export function getApiErrorMessage(
  err: unknown,
  fallback = 'Something went wrong.',
): string {
  if (err instanceof ApiError) return err.statusText;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function toApiError(error: AxiosError): ApiError {
  const method = (error.config?.method ?? 'GET').toUpperCase();
  const path = error.config?.url ?? '';
  if (error.code === 'ECONNABORTED') {
    return new ApiError(408, 'Request Timeout', method, path);
  }
  const status = error.response?.status ?? 0;
  const statusText =
    extractServerMessage(error.response?.data) ||
    error.response?.statusText ||
    error.message ||
    'Network Error';
  const errorCode = extractServerCode(error.response?.data);
  return new ApiError(status, statusText, method, path, errorCode);
}

// ─── Login + silent refresh (against kalnostics-new) ──────────────────────────
interface AuthTokens {
  accessToken?: string;
  refreshToken?: string;
}

/** Log in via kalnostics-new and store the issued tokens. */
export async function login(identifier: string, password: string): Promise<void> {
  const res = await axios.post(
    `${KALNOSTICS_BASE}/auth/login`,
    { identifier, password },
    { headers: { 'Content-Type': 'application/json' } },
  );
  const data = unwrap<AuthTokens>(res.data);
  if (!data?.accessToken) throw new ApiError(0, 'Login failed', 'POST', '/auth/login');
  setAuthToken(data.accessToken);
  if (data.refreshToken) setRefreshToken(data.refreshToken);
}

// ─── File upload (to kalnostics-new business attachments → S3) ────────────────
/**
 * Upload a single file (image or document) to kalnostics-new's business
 * attachment endpoint and return its public URL. Used for product image + gallery
 * uploads; the inventory backend stores only the returned URL.
 */
export async function uploadAttachment(file: File): Promise<string> {
  const token = getAuthToken();
  const fd = new FormData();
  fd.append('file', file);
  const res = await axios.post(`${KALNOSTICS_BASE}/uploads/attachment`, fd, {
    headers: { Authorization: `Bearer ${token ?? ''}` },
    timeout: REQUEST_TIMEOUT_MS,
  });
  const data = unwrap<{ url: string }>(res.data);
  if (!data?.url) throw new ApiError(0, 'Upload failed', 'POST', '/uploads/attachment');
  return data.url;
}

/**
 * Upload a single document to the INVENTORY backend's own DigitalOcean Spaces
 * endpoint (`POST /uploads/attachment` on `VITE_API_BASE`) and return its public
 * URL. Used by the "Document" attachment fields on transfers / quotes /
 * requisitions / purchases / materials; the backend stores only the returned URL
 * in the existing attachmentUrl/document fields.
 */
export async function uploadInventoryDocument(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  // Go through the `api` instance so the Bearer token is attached AND a 401 is
  // transparently refreshed + retried (a bare axios call would not refresh).
  // Override the instance's default JSON Content-Type with `undefined` so the
  // browser sets `multipart/form-data` with the correct boundary for FormData.
  const res = await api.post(`/uploads/attachment`, fd, {
    headers: { 'Content-Type': undefined as unknown as string },
    timeout: REQUEST_TIMEOUT_MS,
  });
  const data = unwrap<{ url: string }>(res.data);
  if (!data?.url) throw new ApiError(0, 'Upload failed', 'POST', '/uploads/attachment');
  return data.url;
}

// ─── JWT payload + profile switching ──────────────────────────────────────────
/** One of the user's assignable profiles, embedded in the access token. */
export interface JwtProfile {
  branch_id: string | null;
  branch_name: string | null;
  branch_type: string | null;
  profile_key: string;
  profile_label: string;
  is_default: boolean;
}
export interface JwtPayload {
  person_id: string;
  tenant_id: string;
  active_branch_id: string | null;
  active_profile_key: string | null;
  profiles?: JwtProfile[];
}

/** Decode the current access token's payload (no verification — display only). */
export function getTokenPayload(): JwtPayload | null {
  const token = getAuthToken();
  if (!token) return null;
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json))) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Switch the active profile/branch via kalnostics-new and store the new tokens.
 * Mirrors the kaltros-fe switcher; the caller typically reloads afterwards so
 * all queries (permissions, lists) re-fetch under the new context.
 */
export async function switchProfile(
  profileKey: string,
  branchId: string | null,
): Promise<void> {
  const token = getAuthToken();
  const res = await axios.post(
    `${KALNOSTICS_BASE}/auth/switch-profile`,
    { profileKey, branchId: branchId ?? undefined },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token ?? ''}`,
      },
    },
  );
  const data = unwrap<AuthTokens>(res.data);
  if (!data?.accessToken) {
    throw new ApiError(0, 'Profile switch failed', 'POST', '/auth/switch-profile');
  }
  setAuthToken(data.accessToken);
  if (data.refreshToken) setRefreshToken(data.refreshToken);
}

let _refreshPromise: Promise<boolean> | null = null;

export function refresh(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return false;
      const res = await axios.post(
        `${KALNOSTICS_BASE}/auth/refresh`,
        { refreshToken },
        { headers: { 'Content-Type': 'application/json' } },
      );
      const data = unwrap<AuthTokens>(res.data);
      if (!data?.accessToken) return false;
      setAuthToken(data.accessToken);
      if (data.refreshToken) setRefreshToken(data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();
  return _refreshPromise;
}

// ─── Request helpers ──────────────────────────────────────────────────────────
export interface RequestOptions {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
  /**
   * Opt this request out of the global loading overlay. Use for background polls
   * (e.g. the unread-count badge) and filter-dropdown option fetches that render
   * their own inline spinner — so they don't flash the full-screen loader.
   */
  silent?: boolean;
}

/** Issue a request and return the unwrapped payload. */
export async function request<T>(
  method: string,
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const res = await api.request<unknown>({
    method,
    url: path,
    data: opts.body,
    params: opts.query,
    ...(opts.timeoutMs != null ? { timeout: opts.timeoutMs } : {}),
    ...(opts.silent ? { silent: true } : {}),
  });
  if (res.status === 204) return undefined as T;
  return unwrap<T>(res.data);
}

/** Pagination info carried in the backend's `meta` envelope. */
export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Like `request`, but returns both the `data` array and the `meta` block. */
export async function requestPaged<T>(
  method: string,
  path: string,
  opts: RequestOptions = {},
): Promise<{ data: T[]; meta: PageMeta }> {
  const res = await api.request<MetaEnvelope<T[]> & { meta: PageMeta }>({
    method,
    url: path,
    params: opts.query,
    ...(opts.silent ? { silent: true } : {}),
  });
  if (res.data.success === false) {
    throw new ApiError(0, extractServerMessage(res.data) ?? 'Request failed', '', '');
  }
  return { data: res.data.data, meta: res.data.meta };
}
