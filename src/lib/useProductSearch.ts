"use client";

import { useEffect, useRef, useState } from "react";

export interface SearchProduct {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  category: string;
  price: string | null;
}

const RESULTS_LIMIT = 5;
const DEBOUNCE_MS = 250;

// Shared by the navbar's in-pill search input and its results dropdown.
// `active` is the search-open flag — query/results reset the moment it
// flips true, so a stale query from a previous session doesn't flash.
export function useProductSearch(active: boolean) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset during render (comparing against the previous `active` value)
  // rather than in an effect — this is reacting to a prop flip, which
  // React's docs recommend handling at render time instead.
  const [wasActive, setWasActive] = useState(active);
  if (active !== wasActive) {
    setWasActive(active);
    if (active) {
      setQuery("");
      setResults([]);
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    // Nothing to fetch — callers hide the results panel themselves when
    // the query is empty, so no state needs clearing here.
    if (!q) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setLoading(true);
    });
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(q)}&active=true`);
        const json = await res.json();
        setResults((json.data as SearchProduct[]).slice(0, RESULTS_LIMIT));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return { query, setQuery, results, loading };
}
