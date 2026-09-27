"use client";

import { useSyncExternalStore } from "react";
import {
  CART_KEY, addItem, cartCount, parseCart, removeItem, serializeCart, setQty as setLineQty, type CartItem,
} from "./cart";

// One cart per browser, shared by every component and every open tab (VS-253, spec 0002).
// The snapshot is cached by its raw string so useSyncExternalStore gets a stable reference;
// the server snapshot is always empty, so the first render matches the server (no hydration
// mismatch) and the saved cart appears right after.

const EMPTY: CartItem[] = [];
const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedItems: CartItem[] = EMPTY;

function read(): CartItem[] {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(CART_KEY);
  } catch {
    return cachedItems; // storage blocked (private mode): keep the in memory cart
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedItems = parseCart(raw);
  }
  return cachedItems;
}

function update(change: (items: CartItem[]) => CartItem[]) {
  const current = read();
  const next = change(current);
  if (next === current) return;
  cachedRaw = serializeCart(next);
  cachedItems = next;
  try {
    window.localStorage.setItem(CART_KEY, cachedRaw);
  } catch {
    // Storage full or blocked: the cart still works for this page view.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === CART_KEY || e.key === null) listener(); // another tab changed or cleared it
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export const clearCart = () => update(() => EMPTY); // for checkout (7.3), once the order is saved

export function useCart() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    items,
    count: cartCount(items),
    add: (slug: string, qty: number, maxQty: number) => update((i) => addItem(i, slug, qty, maxQty)),
    setQty: (slug: string, qty: number) => update((i) => setLineQty(i, slug, qty)),
    remove: (slug: string) => update((i) => removeItem(i, slug)),
    // Applies a quote's lowered quantity only if the line still holds the quantity that quote was
    // sent with, so a change the customer made meanwhile is never overwritten (spec 0002, AC-9).
    adjust: (slug: string, fromQty: number, toQty: number) =>
      update((i) => (i.find((l) => l.slug === slug)?.qty === fromQty ? setLineQty(i, slug, toQty) : i)),
  };
}
