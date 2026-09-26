"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_QUANTITY, orderTotal, parseNewOrder, toPrice } from "@/lib/new-order";

// New order form (VS-245), used on /admin/orders and from an inquiry on /admin/inquiries.
// Validation and the total come from new-order.ts, the same rules POST /api/orders applies.

interface ProductOption { id: string; name: string; price: string | null; requiresPrescription: boolean }
interface Row { productId: string; quantity: string }

export interface NewOrderPrefill { customerName?: string; customerContact?: string; productId?: string | null }

const label = "text-[10px] tracking-[0.1em] uppercase mb-1 block";
const input = "w-full px-3 py-2 rounded-[3px] border text-[13px]";
const inputStyle = { borderColor: "rgba(0,0,0,0.15)", background: "#ffffff", color: "var(--ink)" };
const peso = (n: number) => `₱${n.toLocaleString()}`;

export default function NewOrderForm({
  prefill,
  onCreated,
  onCancel,
}: {
  prefill?: NewOrderPrefill;
  onCreated: (order: { id: string }) => void;
  onCancel: () => void;
}) {
  const [products, setProducts] = useState<ProductOption[] | null>(null);
  const [customerName, setCustomerName] = useState(prefill?.customerName ?? "");
  const [customerContact, setCustomerContact] = useState(prefill?.customerContact ?? "");
  const [customerAddress, setCustomerAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([{ productId: prefill?.productId ?? "", quantity: "1" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State updates are async, so two clicks in the same tick would both see saving=false.
  const inFlight = useRef(false);

  // GET /api/products returns active products only. A prefilled product that isn't in that list
  // (inactive or deleted since the inquiry) is cleared so staff pick again.
  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((json) => {
        const list: ProductOption[] = json.data ?? [];
        setProducts(list);
        setRows((prev) => prev.map((r) => (list.some((p) => p.id === r.productId) ? r : { ...r, productId: "" })));
      })
      .catch(() => setProducts([]));
  }, []);

  const productById = new Map((products ?? []).map((p) => [p.id, p]));
  const body = {
    customerName,
    customerContact,
    customerAddress,
    notes,
    items: rows.map((r) => ({ productId: r.productId, quantity: r.quantity.trim() === "" ? NaN : Number(r.quantity) })),
  };
  const parsed = parseNewOrder(body);
  const { total, incomplete } = orderTotal(
    rows
      .filter((r) => productById.has(r.productId))
      .map((r) => ({ quantity: Number(r.quantity) || 0, price: toPrice(productById.get(r.productId)!.price) })),
  );

  const setRow = (i: number, patch: Partial<Row>) => setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = async () => {
    if (!parsed.ok || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.value),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.data) {
        setError(json?.error ?? "Couldn't create the order. Please try again.");
        return;
      }
      onCreated(json.data);
    } catch {
      setError("Couldn't create the order. Please try again.");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="p-4 rounded-[4px] flex flex-col gap-3" style={{ background: "var(--cream)" }}>
      <div className="text-[12px] font-medium" style={{ color: "var(--ink)" }}>New order</div>

      <label>
        <span className={label} style={{ color: "var(--ink-faint)" }}>Customer name</span>
        <input className={input} style={inputStyle} value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
      </label>
      <label>
        <span className={label} style={{ color: "var(--ink-faint)" }}>Contact: phone or Messenger</span>
        <input className={input} style={inputStyle} value={customerContact} onChange={(e) => setCustomerContact(e.target.value)} />
      </label>
      <label>
        <span className={label} style={{ color: "var(--ink-faint)" }}>Shipping address (optional)</span>
        <textarea className={input} style={inputStyle} rows={2} value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
        <span className="text-[11px] mt-1 block" style={{ color: "var(--ink-muted)" }}>Needed before you can confirm and send to the OMS</span>
      </label>
      <label>
        <span className={label} style={{ color: "var(--ink-faint)" }}>Notes (optional)</span>
        <textarea className={input} style={inputStyle} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      <div>
        <span className={label} style={{ color: "var(--ink-faint)" }}>Items</span>
        {products === null ? (
          <div className="text-[12px]" style={{ color: "var(--ink-faint)" }}>Loading products…</div>
        ) : (
          <div className="flex flex-col gap-2">
            {rows.map((row, i) => {
              const product = productById.get(row.productId);
              const price = product ? toPrice(product.price) : null;
              return (
                <div key={i}>
                  <div className="flex gap-2 items-center">
                    <select
                      aria-label={`Product ${i + 1}`}
                      className={input}
                      style={inputStyle}
                      value={row.productId}
                      onChange={(e) => setRow(i, { productId: e.target.value })}
                    >
                      <option value="">Choose a product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id} disabled={rows.some((r, j) => j !== i && r.productId === p.id)}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label={`Quantity ${i + 1}`}
                      type="number"
                      min={1}
                      max={MAX_QUANTITY}
                      step={1}
                      className="w-[72px] px-2 py-2 rounded-[3px] border text-[13px]"
                      style={inputStyle}
                      value={row.quantity}
                      onChange={(e) => setRow(i, { quantity: e.target.value })}
                    />
                    <div className="text-[12px] w-[110px] text-right flex-shrink-0" style={{ color: "var(--ink)" }}>
                      {product ? (price === null ? "Price on inquiry" : peso(price)) : ""}
                    </div>
                    <button
                      type="button"
                      onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                      disabled={rows.length === 1}
                      aria-label={`Remove item ${i + 1}`}
                      className="text-[10px] tracking-[0.06em] uppercase px-2 py-2 rounded-[3px] border"
                      style={{ color: "var(--ink-muted)", borderColor: "rgba(0,0,0,0.15)", opacity: rows.length === 1 ? 0.4 : 1 }}
                    >
                      Remove
                    </button>
                  </div>
                  {product?.requiresPrescription && (
                    <p className="text-[11px] mt-1" style={{ color: "#C62828" }}>
                      Confirming this order will be refused: prescription products can&apos;t be sent to the OMS yet.
                    </p>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => setRows((prev) => [...prev, { productId: "", quantity: "1" }])}
              disabled={rows.length >= products.length}
              className="self-start text-[10px] tracking-[0.06em] uppercase px-3 py-2 rounded-[3px] border"
              style={{ color: "var(--ink-muted)", borderColor: "rgba(0,0,0,0.15)" }}
            >
              Add item
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-end text-[13px] font-medium" style={{ color: "var(--ink)" }}>
        Total: {peso(total)}
      </div>
      {incomplete && (
        <p className="text-[11px] text-right -mt-2" style={{ color: "var(--ink-muted)" }}>
          Total is incomplete: products priced on inquiry are left out.
        </p>
      )}

      {error && <p className="text-[12px]" style={{ color: "#C62828" }}>{error}</p>}
      {!parsed.ok && <p className="text-[11px]" style={{ color: "var(--ink-faint)" }}>{parsed.error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!parsed.ok || saving}
          className="text-[10px] tracking-[0.06em] uppercase px-3 py-2 rounded-[3px]"
          style={{ background: "var(--teal)", color: "white", opacity: !parsed.ok || saving ? 0.6 : 1, cursor: !parsed.ok || saving ? "not-allowed" : "pointer" }}
        >
          {saving ? "Saving…" : "Save order"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="text-[10px] tracking-[0.06em] uppercase px-3 py-2 rounded-[3px] border"
          style={{ color: "var(--ink-muted)", borderColor: "rgba(0,0,0,0.15)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
