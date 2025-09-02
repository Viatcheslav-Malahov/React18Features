import React, { Suspense, useMemo, useState, useTransition, useDeferredValue } from "react";
import { motion } from "framer-motion";
import { Search, Loader2, AlertTriangle, RefreshCcw } from "lucide-react";

/**
 * React 18 mini‑project demonstrating:
 * 1) Suspense for data fetching with an artificial async resource
 * 2) useTransition to keep the UI responsive during expensive filtering
 * 3) useDeferredValue to avoid blocking renders for low‑priority updates
 * 4) Basic Error Boundary usage
 *
 * How it works
 * - We simulate a small product API with latency (350–1200ms)
 * - "ProductsPanel" is wrapped in <Suspense> and reads from a resource that
 *   throws a promise until resolved (classic Suspense pattern without libs)
 * - The search box uses useTransition for filtering and useDeferredValue to
 *   keep keystrokes snappy while list updates are deferred
 */

// ----------------------------- Simulated API ------------------------------
const ALL_PRODUCTS: Array<{ id: string; title: string; brand: string; price: number }> = Array.from({ length: 250 }).map((_, i) => ({
  id: String(i + 1),
  title: [
    "Espresso Machine",
    "Induction Cooktop",
    "Chef Knife",
    "Cast‑Iron Skillet",
    "Bakeware Set",
    "Range Hood",
    "Dishwasher",
    "Steam Oven",
    "Combi Oven",
    "Sous‑vide Stick",
  ][i % 10] + " " + (i + 1),
  brand: ["Aran", "Bertazzoni", "Caesarstone", "Radianz"][i % 4],
  price: 99 + ((i * 17) % 900),
}));

function randomDelay(min = 350, max = 1200) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function fetchProducts(query: string): Promise<typeof ALL_PRODUCTS> {
  const q = query.toLowerCase().trim();
  const delay = randomDelay();
  return new Promise((resolve) => {
    setTimeout(() => {
      const filtered = ALL_PRODUCTS.filter((p) =>
        p.title.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)
      );
      resolve(filtered);
    }, delay);
  });
}

// Suspense resource primitive
function createResource<T>(promise: Promise<T>) {
  let status: "pending" | "success" | "error" = "pending";
  let result: any;
  const suspender = promise.then(
    (r) => {
      status = "success";
      result = r;
    },
    (e) => {
      status = "error";
      result = e;
    }
  );

  return {
    read() {
      if (status === "pending") throw suspender;
      if (status === "error") throw result;
      return result as T;
    },
  };
}

// ---------------------------- Error Boundary -----------------------------
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-5 w-5" /> Something went wrong
          </div>
          <pre className="mt-2 text-sm whitespace-pre-wrap opacity-80">{String(this.state.error)}</pre>
          <button
            className="mt-4 inline-flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-sm hover:bg-white"
            onClick={() => this.setState({ error: null })}
          >
            <RefreshCcw className="h-4 w-4" /> Try again
          </button>
        </div>
      );
    }
    return this.props.children as any;
  }
}

// --------------------------- UI Building Blocks --------------------------
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <header className="mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="text-3xl font-bold tracking-tight"
          >
            React 18 Demo — Suspense & Transitions
          </motion.h1>
          <p className="mt-2 text-gray-600">
            Type to search the catalog. Data loads through Suspense; input stays responsive thanks to
            <code className="mx-1 rounded bg-gray-100 px-1">useTransition</code> and
            <code className="mx-1 rounded bg-gray-100 px-1">useDeferredValue</code>.
          </p>
        </header>
        {children}
      </div>
    </div>
  );
}

function SearchBox({ value, onChange, isPending }: { value: string; onChange: (v: string) => void; isPending: boolean }) {
  return (
    <div className="relative">
      <input
        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pl-10 shadow-sm outline-none ring-0 focus:border-gray-300"
        placeholder="Search by title or brand…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
      {isPending && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> updating…
        </div>
      )}
    </div>
  );
}

// ------------------------------- Panels ----------------------------------
function ProductsPanel({ resource, query }: { resource: { read: () => typeof ALL_PRODUCTS }; query: string }) {
  // Low-priority render of query text, so large list renders don't block typing
  const deferredQuery = useDeferredValue(query);
  const data = resource.read();

  // Expensive filter simulated
  const visible = useMemo(() => {
    const q = deferredQuery.toLowerCase();
    // Simulate expensive work
    const started = performance.now();
    while (performance.now() - started < 8) {
      // busy wait ~8ms to mimic CPU-bound formatting/filtering
    }
    return data.filter((p) => p.title.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
  }, [data, deferredQuery]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="text-sm text-gray-500">{p.brand}</div>
          <div className="mt-1 font-medium">{p.title}</div>
          <div className="mt-2 text-lg">${p.price}</div>
        </motion.div>
      ))}
      {visible.length === 0 && (
        <div className="col-span-full rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          No results for “{deferredQuery}”.
        </div>
      )}
    </div>
  );
}

function ProductsFallback() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-gray-200 bg-white p-4">
          <div className="h-3 w-16 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-3/4 rounded bg-gray-200" />
          <div className="mt-4 h-6 w-1/3 rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

// ------------------------------ Root App ---------------------------------
export default function App() {
  const [query, setQuery] = useState("");
  const [resource, setResource] = useState(() => createResource(fetchProducts("")));
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string) {
    setQuery(next);
    // Transition keeps input responsive while triggering new data load
    startTransition(() => {
      setResource(createResource(fetchProducts(next)));
    });
  }

  return (
    <Shell>
      <div className="space-y-6">
        <SearchBox value={query} onChange={handleChange} isPending={isPending} />

        <ErrorBoundary>
          <Suspense fallback={<ProductsFallback />}>
            <ProductsPanel resource={resource} query={query} />
          </Suspense>
        </ErrorBoundary>

        <Tips />
      </div>
    </Shell>
  );
}

function Tips() {
  const tips = [
    "Type quickly — the input remains responsive while results update (useTransition).",
    "Delete your query to reload fresh data (Suspense resets on new resource).",
    "Notice skeletons while data is loading (Suspense fallback).",
    "Large lists + expensive filters benefit from useDeferredValue.",
  ];
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
      <div className="font-medium text-gray-900">Try these:</div>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {tips.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}
