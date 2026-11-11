import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Minus,
  Trash2,
  Search,
  Lock,
  CreditCard,
  PauseCircle,
  PlayCircle,
  ScanLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getApiErrorMessage } from '@/lib/http';
import { InfiniteSelect } from '@/components/shared/InfiniteSelect';
import {
  useRegisters,
  useCreateRegister,
  useCurrentSession,
  useOpenSession,
  useCloseSession,
  usePosLookup,
  useCheckout,
  useVerifyPin,
  useGatewayBalances,
  useHeldBills,
  useHoldBill,
  useDeleteHeldBill,
  useSerialLookup,
  type PosProduct,
} from '@/features/pos/api';

interface CartLine {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

const selectCls =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

/** POS terminal: open/close a register, scan/search products, take payment. */
export function PosPage() {
  const { data: session } = useCurrentSession();
  const { data: registers } = useRegisters();
  const createRegister = useCreateRegister();
  const openSession = useOpenSession();
  const closeSession = useCloseSession();
  const checkout = useCheckout();
  const verifyPin = useVerifyPin();
  const { data: gateways } = useGatewayBalances();
  const { data: heldBills } = useHeldBills();
  const holdBill = useHoldBill();
  const deleteHeldBill = useDeleteHeldBill();
  const serialLookup = useSerialLookup();

  const [search, setSearch] = useState('');
  const { data: products } = usePosLookup(search);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [serial, setSerial] = useState('');

  // Register open/close controls
  const [registerId, setRegisterId] = useState('');
  const [openingCash, setOpeningCash] = useState('0');

  // Cashier-PIN lock: start locked if a PIN is configured for this tenant.
  const [locked, setLocked] = useState(false);
  const [pinChecked, setPinChecked] = useState(false);
  const [pin, setPin] = useState('');

  useEffect(() => {
    if (!session || pinChecked) return;
    let cancelled = false;
    // Probe whether a PIN is configured (empty PIN never validates) and, if so,
    // lock the terminal until the cashier enters it.
    verifyPin
      .mutateAsync('')
      .then((res) => {
        if (cancelled) return;
        setLocked(res.configured);
        setPinChecked(true);
      })
      .catch(() => {
        if (!cancelled) setPinChecked(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, pinChecked]);

  const onUnlock = async () => {
    try {
      const res = await verifyPin.mutateAsync(pin);
      if (res.valid) {
        setLocked(false);
        setPin('');
        toast.success('Terminal unlocked');
      } else {
        toast.error('Incorrect PIN');
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not verify PIN'));
    }
  };

  const total = useMemo(
    () => cart.reduce((s, l) => s + l.price * l.quantity, 0),
    [cart],
  );

  const addToCart = (p: PosProduct) => {
    setCart((prev) => {
      const found = prev.find((l) => l.productId === p.id);
      if (found) {
        return prev.map((l) =>
          l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [...prev, { productId: p.id, name: p.name, price: p.price, quantity: 1 }];
    });
  };

  const setQty = (productId: string, qty: number) =>
    setCart((prev) =>
      prev
        .map((l) => (l.productId === productId ? { ...l, quantity: qty } : l))
        .filter((l) => l.quantity > 0),
    );

  const onOpenRegister = async () => {
    if (!registerId) {
      toast.error('Select a register.');
      return;
    }
    try {
      await openSession.mutateAsync({ registerId, openingCash: Number(openingCash || 0) });
      toast.success('Register opened');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not open register'));
    }
  };

  const onCloseRegister = async () => {
    if (!session) return;
    const counted = prompt('Enter counted cash in drawer:');
    if (counted == null) return;
    try {
      await closeSession.mutateAsync({ id: session.id, closingCash: Number(counted || 0) });
      toast.success('Register closed');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not close register'));
    }
  };

  const onNewRegister = async () => {
    const name = prompt('Register name:');
    if (!name) return;
    try {
      await createRegister.mutateAsync(name);
      toast.success('Register created');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not create register'));
    }
  };

  const onCheckout = async () => {
    if (!customerId) {
      toast.error('Select a customer.');
      return;
    }
    if (cart.length === 0) {
      toast.error('Cart is empty.');
      return;
    }
    try {
      await checkout.mutateAsync({
        customerId,
        items: cart.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          price: l.price,
        })),
        payments: [{ amount: total, method: paymentMethod }],
      });
      toast.success('Sale completed');
      setCart([]);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Checkout failed'));
    }
  };

  const onScanSerial = async () => {
    const code = serial.trim();
    if (!code) return;
    try {
      const res = await serialLookup.mutateAsync(code);
      addToCart({
        id: res.product.id,
        code: res.product.code,
        name: res.product.name,
        price: res.product.price,
        totalQuantity: 0,
      });
      setSerial('');
      toast.success(`Added ${res.product.name}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Serial not found'));
    }
  };

  const onHoldBill = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty.');
      return;
    }
    const label = prompt('Label for this held bill:') ?? '';
    try {
      await holdBill.mutateAsync({ label: label || 'Held bill', cart });
      setCart([]);
      toast.success('Bill held');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not hold bill'));
    }
  };

  const onResumeBill = async (id: string, savedCart: unknown) => {
    if (Array.isArray(savedCart)) {
      setCart(savedCart as CartLine[]);
    }
    try {
      await deleteHeldBill.mutateAsync(id);
    } catch {
      /* non-fatal: the bill is resumed into the cart regardless */
    }
  };

  // ── No open session: show the open-register panel ──
  if (!session) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-xl font-semibold">Point of Sale</h1>
        <Card>
          <CardHeader>
            <CardTitle>Open a register</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="register">Register</Label>
              <select
                id="register"
                className={selectCls}
                value={registerId}
                onChange={(e) => setRegisterId(e.target.value)}
              >
                <option value="">—</option>
                {(registers ?? []).map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="openingCash">Opening cash</Label>
              <Input
                id="openingCash"
                type="number"
                step="any"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
              />
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={onNewRegister}>
                New register
              </Button>
              <Button onClick={onOpenRegister} disabled={openSession.isPending}>
                Open register
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Locked terminal: require the cashier PIN ──
  if (locked) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-xl font-semibold">Point of Sale</h1>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" /> Terminal locked
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pin">Cashier PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                value={pin}
                autoFocus
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void onUnlock();
                }}
              />
            </div>
            <Button
              className="w-full"
              onClick={onUnlock}
              disabled={verifyPin.isPending || !pin}
            >
              Unlock
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Open session: the terminal ──
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Point of Sale</h1>
          <p className="text-sm text-muted-foreground">
            Register open · opening cash {session.openingCash.toFixed(2)}
          </p>
        </div>
        <div className="flex gap-2">
          {pinChecked && (
            <Button
              variant="outline"
              onClick={() => setLocked(true)}
              title="Lock terminal"
            >
              <Lock className="h-4 w-4" /> Lock
            </Button>
          )}
          <Button variant="outline" onClick={onHoldBill} title="Hold bill">
            <PauseCircle className="h-4 w-4" /> Hold
          </Button>
          <Button variant="outline" onClick={onCloseRegister}>
            Close register
          </Button>
        </div>
      </div>

      {(heldBills ?? []).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PauseCircle className="h-4 w-4" /> Held bills
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(heldBills ?? []).map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-1 rounded-md border px-2 py-1 text-sm"
              >
                <span className="font-medium">{b.label}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Resume"
                  onClick={() => onResumeBill(b.id, b.cart)}
                >
                  <PlayCircle className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Discard"
                  onClick={() => deleteHeldBill.mutate(b.id)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {(gateways ?? []).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" /> Payment gateways
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            {(gateways ?? []).map((g) => (
              <div
                key={g.gateway}
                className="rounded-md border px-3 py-2 text-sm"
              >
                <div className="font-medium">{g.gateway}</div>
                <div className="text-muted-foreground">
                  {!g.configured
                    ? 'Not configured'
                    : g.balance == null
                      ? 'Connected'
                      : g.balance.toFixed(2)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Product search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-4 w-4" /> Products
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Scan serial / batch…"
                value={serial}
                onChange={(e) => setSerial(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void onScanSerial();
                }}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={onScanSerial}
                disabled={serialLookup.isPending || !serial.trim()}
                title="Look up serial"
              >
                <ScanLine className="h-4 w-4" />
              </Button>
            </div>
            <Input
              placeholder="Search by code or name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="max-h-[50vh] space-y-1 overflow-auto">
              {(products ?? []).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addToCart(p)}
                  className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  <span>
                    <span className="font-medium">{p.name}</span>{' '}
                    <span className="text-muted-foreground">({p.code})</span>
                  </span>
                  <span>{p.price.toFixed(2)}</span>
                </button>
              ))}
              {(products ?? []).length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No products.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cart */}
        <Card>
          <CardHeader>
            <CardTitle>Cart</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-[35vh] space-y-2 overflow-auto">
              {cart.map((l) => (
                <div key={l.productId} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">{l.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => setQty(l.productId, l.quantity - 1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-6 text-center">{l.quantity}</span>
                  <Button variant="ghost" size="icon" onClick={() => setQty(l.productId, l.quantity + 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                  <span className="w-16 text-right">{(l.price * l.quantity).toFixed(2)}</span>
                  <Button variant="ghost" size="icon" onClick={() => setQty(l.productId, 0)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              ))}
              {cart.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Cart is empty.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="customer">Customer</Label>
              <InfiniteSelect
                id="customer"
                value={customerId}
                onChange={setCustomerId}
                queryKey={['customers']}
                path="/customers"
                getOptionValue={(c) => c.id}
                getOptionLabel={(c) => c.name}
                placeholder="Select customer…"
                clearable
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="method">Payment method</Label>
              <select
                id="method"
                className={selectCls}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank transfer</option>
              </select>
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-lg font-semibold">{total.toFixed(2)}</span>
            </div>
            <Button className="w-full" onClick={onCheckout} disabled={checkout.isPending}>
              {checkout.isPending ? 'Processing…' : 'Checkout'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
