import type { Template } from "../types";
import { USE_LOCAL_STORAGE, VITE_DEPS, VITE_SETTINGS, viteBase } from "../shared";

const files: Record<string, string> = {
  ...viteBase({
    name: "codexa-storefront",
    title: "Storefront",
    readme: `# Storefront starter

Catalog with category filter and search, product detail, and a cart persisted in localStorage.
Checkout is a placeholder form — connect Stripe or Razorpay on a server before taking payments.

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
  "src/App.tsx": `import { useMemo, useState } from "react";
import { categories, formatPrice, products, type Product } from "./products";
import { useCart } from "./cart";
import { Cart } from "./Cart";

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
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button type="button" onClick={() => setView({ kind: "catalog" })} className="font-semibold tracking-tight">
            Northwind Goods
          </button>
          <button type="button" onClick={() => setView({ kind: "cart" })} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50" aria-label={"Open cart, " + cart.count + " items"}>
            Cart ({cart.count})
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
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
                {categories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    aria-pressed={category === c}
                    className={"rounded-full border px-3 py-1 text-sm " + (category === c ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 hover:bg-slate-50")}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search products" aria-label="Search products" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm sm:w-64" />
            </div>
            {visible.length === 0 ? (
              <p className="mt-10 text-center text-slate-500">No products match your search.</p>
            ) : (
              <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((p) => (
                  <li key={p.id} className="flex flex-col rounded-xl border border-slate-200 p-4">
                    <div aria-hidden="true" className="aspect-[4/3] rounded-lg bg-slate-100" />
                    <h2 className="mt-3 font-medium">{p.name}</h2>
                    <p className="text-sm text-slate-500">{p.category}</p>
                    <div className="mt-auto flex items-center justify-between pt-4">
                      <span className="font-semibold">{formatPrice(p.price)}</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setView({ kind: "product", id: p.id })} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
                          Details
                        </button>
                        <button type="button" onClick={() => cart.add(p.id)} className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white hover:bg-slate-700">
                          Add
                        </button>
                      </div>
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
        <button type="button" onClick={onBack} className="mt-4 text-sm text-blue-600">
          Back to catalog
        </button>
      </div>
    );
  }
  return (
    <article className="grid gap-8 md:grid-cols-2">
      <div aria-hidden="true" className="aspect-square rounded-xl bg-slate-100" />
      <div>
        <button type="button" onClick={onBack} className="text-sm text-blue-600">
          ← Back to catalog
        </button>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{product.name}</h1>
        <p className="mt-1 text-slate-500">{product.category}</p>
        <p className="mt-4 text-slate-700">{product.description}</p>
        <p className="mt-6 text-2xl font-semibold">{formatPrice(product.price)}</p>
        <button type="button" onClick={() => onAdd(product.id)} className="mt-4 rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700">
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
                <div>
                  <p className="font-medium">{l.product.name}</p>
                  <p className="text-sm text-slate-500">{formatPrice(l.product.price)} each</p>
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
      <form onSubmit={checkout} className="h-fit space-y-3 rounded-xl border border-slate-200 p-5">
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
