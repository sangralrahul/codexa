import { PRODUCTS, type Product } from "./data";

/** Quantities by product id. */
export type Cart = Record<string, number>;

export function setQuantity(cart: Cart, id: string, qty: number): Cart {
  const next = { ...cart };
  if (qty <= 0) delete next[id];
  else next[id] = qty;
  return next;
}

export function cartLines(cart: Cart): { product: Product; qty: number }[] {
  return PRODUCTS.filter((p) => cart[p.id]).map((product) => ({ product, qty: cart[product.id] }));
}

export function cartTotals(cart: Cart) {
  const lines = cartLines(cart);
  const items = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = lines.reduce((n, l) => n + l.qty * l.product.price, 0);
  return { items, subtotal };
}
