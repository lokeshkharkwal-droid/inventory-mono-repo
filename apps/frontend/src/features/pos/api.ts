import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { request } from '@/lib/http';

export interface PosRegister {
  id: string;
  name: string;
  branchId: string;
  isActive: boolean;
}

export interface PosSession {
  id: string;
  registerId: string;
  status: string;
  openingCash: number;
  closingCash: number | null;
  expectedCash: number | null;
  openedAt: string;
}

export interface PosProduct {
  id: string;
  code: string;
  name: string;
  price: number;
  totalQuantity: number;
}

const KEY = ['pos'] as const;

export function useRegisters() {
  return useQuery({
    queryKey: [...KEY, 'registers'],
    queryFn: () => request<PosRegister[]>('GET', '/pos/registers'),
  });
}

export function useCreateRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      request<PosRegister>('POST', '/pos/registers', { body: { name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'registers'] }),
  });
}

export function useCurrentSession() {
  return useQuery({
    queryKey: [...KEY, 'session'],
    queryFn: () => request<PosSession | null>('GET', '/pos/sessions/current'),
  });
}

export function useOpenSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { registerId: string; openingCash: number }) =>
      request<PosSession>('POST', '/pos/sessions/open', { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'session'] }),
  });
}

export function useCloseSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; closingCash: number }) =>
      request('POST', `/pos/sessions/${input.id}/close`, {
        body: { closingCash: input.closingCash },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'session'] }),
  });
}

export function usePosLookup(search: string) {
  return useQuery({
    queryKey: [...KEY, 'lookup', search],
    queryFn: () =>
      request<PosProduct[]>('GET', '/pos/lookup', {
        query: { search: search || undefined },
      }),
  });
}

export function useCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      request('POST', '/pos/checkout', { body: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

/** Result of a cashier-PIN check. `configured` is false when no PIN is set. */
export interface PinVerifyResult {
  valid: boolean;
  configured: boolean;
}

export function useVerifyPin() {
  return useMutation({
    mutationFn: (pin: string) =>
      request<PinVerifyResult>('POST', '/pos/verify-pin', { body: { pin } }),
  });
}

/** A payment gateway's configured/balance status (balance null = not fetched). */
export interface GatewayBalance {
  gateway: string;
  configured: boolean;
  balance: number | null;
}

export function useGatewayBalances() {
  return useQuery({
    queryKey: [...KEY, 'gateway-balances'],
    queryFn: () => request<GatewayBalance[]>('GET', '/pos/gateway-balances'),
  });
}

// ── Held (suspended) bills ──────────────────────────────────────────────────
export interface HeldBill {
  id: string;
  label: string;
  cart: unknown;
  createdAt: string;
}

export function useHeldBills() {
  return useQuery({
    queryKey: [...KEY, 'held-bills'],
    queryFn: () => request<HeldBill[]>('GET', '/pos/held-bills'),
  });
}

export function useHoldBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { label: string; cart: unknown }) =>
      request('POST', '/pos/held-bills', { body: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'held-bills'] }),
  });
}

export function useDeleteHeldBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => request('DELETE', `/pos/held-bills/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [...KEY, 'held-bills'] }),
  });
}

// ── Serial / barcode lookup ─────────────────────────────────────────────────
export interface SerialLookupResult {
  serialNo: string;
  status: string;
  product: { id: string; name: string; code: string; price: number };
}

/** Look up a product by serial/batch number (POS scanner). */
export function useSerialLookup() {
  return useMutation({
    mutationFn: (serial: string) =>
      request<SerialLookupResult>('GET', '/pos/serial-lookup', {
        query: { serial },
      }),
  });
}
