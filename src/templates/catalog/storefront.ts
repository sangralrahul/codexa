import type { Template } from "../types";
import { USE_LOCAL_STORAGE, VITE_DEPS, VITE_SETTINGS, viteBase } from "../shared";

const files: Record<string, string> = {
  ...viteBase({
    name: "codexa-storefront",
    title: "Northwind Goods",
    readme: `# Storefront starter

Catalog with category filter and search, product detail, and a cart persisted in localStorage.
Checkout is a placeholder form — connect Stripe or Razorpay on a server before taking payments.

Product images are simple SVG illustrations in \`src/ProductArt.tsx\`, so the store looks finished before you have photos.
Replace them with your own images (or ask Codexa to) when you are ready.

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
  }),
  "src/useLocalStorage.ts": USE_LOCAL_STORAGE,
  "src/products.ts": `export type Product = { id: string; name: string; price: number; category: "Audio" | "Home" | "Outdoor"; description: string };

/** Replace with a fetch from your catalog API. Prices are in whole currency units. */
export const products: Product[] = [
  { id: "p1", name: "Studio headphones", price: 129, category: "Audio", description: "Closed-back headphones with a flat response for mixing." },
  { id: "p2", name: "Desk speaker", price: 89, category: "Audio", description: "Compact powered speaker with USB-C input." },
  { id: "p3", name: "Ceramic mug", price: 18, category: "Home", description: "Hand-glazed stoneware mug, 350 ml." },
  { id: "p4", name: "Linen throw", price: 64, category: "Home", description: "Stonewashed linen throw blanket." },
  { id: "p5", name: "Trail bottle", price: 24, category: "Outdoor", description: "Insulated steel bottle, 750 ml." },
  { id: "p6", name: "Packable jacket", price: 110, category: "Outdoor", description: "Lightweight windproof shell that packs into its pocket." },
];

export const categories = ["All", "Audio", "Home", "Outdoor"] as const;

export function formatPrice(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}
`,
  "src/cart.ts": `import { useLocalStorage } from "./useLocalStorage";
import { products } from "./products";

export type CartLine = { productId: string; qty: number };

export function useCart() {
  const [lines, setLines] = useLocalStorage<CartLine[]>("cart", []);

  const add = (productId: string) =>
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) return prev.map((l) => (l.productId === productId ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { productId, qty: 1 }];
    });
  const setQty = (productId: string, qty: number) =>
    setLines((prev) => (qty <= 0 ? prev.filter((l) => l.productId !== productId) : prev.map((l) => (l.productId === productId ? { ...l, qty } : l))));
  const clear = () => setLines([]);

  const items = lines
    .map((l) => ({ ...l, product: products.find((p) => p.id === l.productId) }))
    .filter((l): l is CartLine & { product: NonNullable<(typeof products)[number]> } => Boolean(l.product));
  const total = items.reduce((s, l) => s + l.product.price * l.qty, 0);
  const count = items.reduce((s, l) => s + l.qty, 0);

  return { items, total, count, add, setQty, clear };
}
`,
  "src/ProductArt.tsx": `import type { ReactNode } from "react";

/** Simple SVG product illustrations, so the catalog looks finished before you have photos. */
const art: Record<string, { bg: string; draw: ReactNode }> = {
  p1: {
    bg: "from-amber-100 to-amber-200",
    draw: (
      <g>
        <path d="M58 92 C58 40 142 40 142 92" fill="none" stroke="#312e81" strokeWidth="9" strokeLinecap="round" />
        <rect x="44" y="82" width="28" height="44" rx="12" fill="#4338ca" />
        <rect x="128" y="82" width="28" height="44" rx="12" fill="#4338ca" />
        <rect x="50" y="90" width="10" height="28" rx="5" fill="#a5b4fc" />
        <rect x="140" y="90" width="10" height="28" rx="5" fill="#a5b4fc" />
      </g>
    ),
  },
  p2: {
    bg: "from-amber-100 to-orange-200",
    draw: (
      <g>
        <rect x="68" y="30" width="64" height="100" rx="14" fill="#292524" />
        <circle cx="100" cy="98" r="20" fill="#44403c" />
        <circle cx="100" cy="98" r="9" fill="#f59e0b" />
        <circle cx="100" cy="56" r="9" fill="#44403c" />
        <circle cx="100" cy="56" r="4" fill="#fbbf24" />
      </g>
    ),
  },
  p3: {
    bg: "from-rose-100 to-rose-200",
    draw: (
      <g>
        <path d="M88 34 q6 -10 0 -20 M104 34 q6 -10 0 -20" fill="none" stroke="#fda4af" strokeWidth="4" strokeLinecap="round" />
        <path d="M128 70 h10 a16 16 0 0 1 0 32 h-10" fill="none" stroke="#be123c" strokeWidth="8" />
        <path d="M66 46 h66 v62 a20 20 0 0 1 -20 20 h-26 a20 20 0 0 1 -20 -20 z" fill="#e11d48" />
        <path d="M66 46 h66 v10 h-66 z" fill="#fb7185" />
      </g>
    ),
  },
  p4: {
    bg: "from-emerald-100 to-lime-100",
    draw: (
      <g>
        <rect x="44" y="96" width="112" height="26" rx="8" fill="#15803d" />
        <rect x="52" y="72" width="96" height="26" rx="8" fill="#22c55e" />
        <rect x="60" y="48" width="80" height="26" rx="8" fill="#86efac" />
        <path d="M70 48 v26 M86 48 v26 M114 72 v26 M130 72 v26 M60 96 v26 M80 96 v26" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="3" />
      </g>
    ),
  },
  p5: {
    bg: "from-cyan-100 to-sky-200",
    draw: (
      <g>
        <rect x="88" y="18" width="24" height="16" rx="5" fill="#0f172a" />
        <path d="M80 44 q0 -10 10 -10 h20 q10 0 10 10 v78 q0 10 -10 10 h-20 q-10 0 -10 -10 z" fill="#0284c7" />
        <rect x="80" y="70" width="40" height="22" fill="#7dd3fc" />
      </g>
    ),
  },
  p6: {
    bg: "from-amber-100 to-amber-100",
    draw: (
      <g>
        <path d="M76 34 l24 12 l24 -12 l30 18 l-10 30 l-12 -6 v58 h-64 v-58 l-12 6 l-10 -30 z" fill="#1e40af" />
        <path d="M100 46 v88" stroke="#93c5fd" strokeWidth="3" />
        <path d="M88 34 q12 14 24 0" fill="none" stroke="#1e3a8a" strokeWidth="5" strokeLinecap="round" />
      </g>
    ),
  },
};

export function ProductArt({ id, className }: { id: string; className?: string }) {
  const a = art[id];
  return (
    <div aria-hidden="true" className={"relative overflow-hidden bg-gradient-to-br " + (a ? a.bg : "from-slate-100 to-slate-200") + " " + (className ?? "")}>
      <svg viewBox="0 0 200 150" className="absolute inset-0 h-full w-full">
        <ellipse cx="100" cy="134" rx="54" ry="7" fill="#0f172a" opacity="0.08" />
        {a ? a.draw : null}
      </svg>
    </div>
  );
}
`,
  "src/App.tsx": `import { useMemo, useState } from "react";
import { categories, formatPrice, products, type Product } from "./products";
import { useCart } from "./cart";
import { Cart } from "./Cart";
import { ProductArt } from "./ProductArt";

type View = { kind: "catalog" } | { kind: "product"; id: string } | { kind: "cart" };

export default function App() {
  const [view, setView] = useState<View>({ kind: "catalog" });
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [query, setQuery] = useState("");
  const cart = useCart();

  const visible = useMemo(
    () => products.filter((p) => (category === "All" || p.category === category) && p.name.toLowerCase().includes(query.toLowerCase())),
    [category, query],
  );

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="bg-stone-900 px-4 py-2 text-center text-xs text-stone-300">Sample catalog · prices in USD · checkout is a placeholder</div>
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <button type="button" onClick={() => setView({ kind: "catalog" })} className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-stone-900 text-sm text-white">N</span>
            Northwind Goods
          </button>
          <nav className="hidden items-center gap-6 text-sm text-stone-600 md:flex" aria-label="Shop">
            {categories.slice(1).map((c) => (
              <button key={c} type="button" onClick={() => { setCategory(c); setView({ kind: "catalog" }); }} className="hover:text-stone-900">
                {c}
              </button>
            ))}
          </nav>
          <button type="button" onClick={() => setView({ kind: "cart" })} className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-stone-50" aria-label={"Open cart, " + cart.count + " items"}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path d="M6 6h15l-1.5 9h-12zM6 6L5 3H2M9 20a1 1 0 100-2 1 1 0 000 2zM18 20a1 1 0 100-2 1 1 0 000 2z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Cart
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-stone-900 px-1.5 text-[11px] text-white">{cart.count}</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {view.kind === "cart" ? (
          <Cart cart={cart} onBack={() => setView({ kind: "catalog" })} />
        ) : view.kind === "product" ? (
          <ProductDetail product={products.find((p) => p.id === view.id)} onAdd={cart.add} onBack={() => setView({ kind: "catalog" })} />
        ) : (
          <>
            <section className="grid items-center gap-8 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100 px-8 py-10 md:grid-cols-[1.1fr_1fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">Spring collection</p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Considered goods for desk, home and trail.</h1>
                <p className="mt-4 max-w-md text-stone-600">A small catalog to start from. Swap in your products, photos and prices.</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {["p1", "p3", "p5"].map((id, i) => (
                  <ProductArt key={id} id={id} className={"aspect-[3/4] rounded-2xl shadow-lg shadow-orange-900/10 " + (i === 1 ? "-translate-y-4" : "translate-y-2")} />
                ))}
              </div>
            </section>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    aria-pressed={category === c}
                    className={"rounded-full border px-4 py-1.5 text-sm transition " + (category === c ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white hover:border-stone-300")}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products" aria-label="Search products" className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm outline-none focus:border-stone-400 sm:w-64" />
            </div>
            {visible.length === 0 ? (
              <div className="mt-10 rounded-2xl border border-dashed border-stone-300 p-10 text-center">
                <p className="font-medium">No products match your search.</p>
                <button type="button" onClick={() => { setQuery(""); setCategory("All"); }} className="mt-3 text-sm text-orange-700 underline">
                  Clear filters
                </button>
              </div>
            ) : (
              <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((p) => (
                  <li key={p.id} className="group flex flex-col rounded-2xl border border-stone-200 bg-white p-3 transition hover:shadow-lg hover:shadow-stone-900/5">
                    <button type="button" onClick={() => setView({ kind: "product", id: p.id })} className="block overflow-hidden rounded-xl" aria-label={"View " + p.name}>
                      <ProductArt id={p.id} className="aspect-[4/3] transition duration-500 group-hover:scale-[1.03]" />
                    </button>
                    <div className="flex items-start justify-between gap-3 px-1 pt-4">
                      <div>
                        <h2 className="font-medium">{p.name}</h2>
                        <p className="text-sm text-stone-500">{p.category}</p>
                      </div>
                      <span className="font-semibold">{formatPrice(p.price)}</span>
                    </div>
                    <div className="mt-auto flex gap-2 px-1 pb-1 pt-4">
                      <button type="button" onClick={() => setView({ kind: "product", id: p.id })} className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm hover:bg-stone-50">
                        Details
                      </button>
                      <button type="button" onClick={() => cart.add(p.id)} className="flex-1 rounded-xl bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700">
                        Add to cart
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function ProductDetail({ product, onAdd, onBack }: { product: Product | undefined; onAdd: (id: string) => void; onBack: () => void }) {
  if (!product) {
    return (
      <div>
        <p>Product not found.</p>
        <button type="button" onClick={onBack} className="mt-4 text-sm text-orange-700">
          Back to catalog
        </button>
      </div>
    );
  }
  return (
    <article className="grid gap-10 md:grid-cols-2">
      <ProductArt id={product.id} className="aspect-square rounded-3xl" />
      <div className="py-4">
        <button type="button" onClick={onBack} className="text-sm text-orange-700">
          ← Back to catalog
        </button>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{product.category}</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{product.name}</h1>
        <p className="mt-4 text-lg leading-relaxed text-stone-600">{product.description}</p>
        <p className="mt-8 text-3xl font-semibold">{formatPrice(product.price)}</p>
        <button type="button" onClick={() => onAdd(product.id)} className="mt-6 rounded-xl bg-stone-900 px-6 py-3 text-sm font-medium text-white hover:bg-stone-700">
          Add to cart
        </button>
      </div>
    </article>
  );
}
`,
  "src/Cart.tsx": `import { useState, type FormEvent } from "react";
import { formatPrice } from "./products";
import type { useCart } from "./cart";
import { ProductArt } from "./ProductArt";

export function Cart({ cart, onBack }: { cart: ReturnType<typeof useCart>; onBack: () => void }) {
  const [placed, setPlaced] = useState(false);

  function checkout(e: FormEvent) {
    e.preventDefault();
    // PLACEHOLDER: send the cart to your server, create a Stripe/Razorpay order there, then redirect to the hosted checkout.
    setPlaced(true);
    cart.clear();
  }

  if (placed) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-semibold">Order recorded locally</h1>
        <p className="mt-2 text-slate-600">No payment was taken. Wire the checkout form to a payment provider on your server.</p>
        <button type="button" onClick={onBack} className="mt-6 rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
          Continue shopping
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Your cart</h1>
        {cart.items.length === 0 ? (
          <p className="mt-6 text-slate-500">
            Your cart is empty.{" "}
            <button type="button" onClick={onBack} className="text-blue-600">
              Browse products
            </button>
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-slate-200">
            {cart.items.map((l) => (
              <li key={l.productId} className="flex items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-4">
                  <ProductArt id={l.productId} className="h-16 w-16 rounded-xl" />
                  <div>
                  <p className="font-medium">{l.product.name}</p>
                  <p className="text-sm text-slate-500">{formatPrice(l.product.price)} each</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => cart.setQty(l.productId, l.qty - 1)} className="size-8 rounded-md border border-slate-300" aria-label={"Decrease quantity of " + l.product.name}>
                    −
                  </button>
                  <span className="w-6 text-center text-sm" aria-live="polite">
                    {l.qty}
                  </span>
                  <button type="button" onClick={() => cart.setQty(l.productId, l.qty + 1)} className="size-8 rounded-md border border-slate-300" aria-label={"Increase quantity of " + l.product.name}>
                    +
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <form onSubmit={checkout} className="h-fit space-y-3 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="font-medium">Checkout (placeholder)</h2>
        <label className="block text-sm">
          <span>Email</span>
          <input type="email" required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span>Shipping address</span>
          <textarea required className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" rows={3} />
        </label>
        <div className="flex justify-between border-t border-slate-200 pt-3 text-sm">
          <span>Total</span>
          <span className="font-semibold">{formatPrice(cart.total)}</span>
        </div>
        <button type="submit" disabled={cart.items.length === 0} className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          Place order
        </button>
        <p className="text-xs text-slate-500">No payment provider is connected in this template.</p>
      </form>
    </div>
  );
}
`,
};

export const storefrontTemplate: Template = {
  id: "vite-react-storefront",
  name: "Ecommerce storefront",
  description: "A product catalog with category filters and search, product detail view, and a cart kept in local state.",
  longDescription:
    "Catalog, product detail and cart screens driven by a typed in-memory product list. The cart is persisted to localStorage through a small hook, quantities can be adjusted inline, and the checkout form is explicitly a placeholder: it records the order locally and tells you where to plug in Stripe or Razorpay on the server.",
  category: "ecommerce",
  tags: ["react", "ecommerce", "cart", "catalog", "tailwind"],
  framework: "vite-react",
  dependencies: VITE_DEPS,
  settings: VITE_SETTINGS,
  prebuilt: true,
  featured: true,
  difficulty: "intermediate",
  previewPath: "/",
  files,
};
