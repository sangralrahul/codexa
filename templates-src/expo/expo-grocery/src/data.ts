/** Catalogue for the store: categories and products. Replace with your own data or an API call. */
export type CategoryId = "all" | "fruit" | "veg" | "dairy" | "bakery" | "pantry" | "drinks";

export type Product = {
  id: string;
  name: string;
  unit: string;
  price: number;
  category: Exclude<CategoryId, "all">;
  /** Ionicons glyph and tile colour stand in for product photos. */
  icon: "nutrition" | "leaf" | "egg" | "pizza" | "cafe" | "water" | "fish" | "ice-cream" | "flower" | "beer";
  tint: string;
};

export const STORE = { name: "Greengate Market", eta: "25–35 min", address: "24 Elm Street", freeDeliveryOver: 35 };

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "fruit", label: "Fruit" },
  { id: "veg", label: "Vegetables" },
  { id: "dairy", label: "Dairy & eggs" },
  { id: "bakery", label: "Bakery" },
  { id: "pantry", label: "Pantry" },
  { id: "drinks", label: "Drinks" },
];

export const PRODUCTS: Product[] = [
  { id: "p1", name: "Honeycrisp apples", unit: "1 kg bag", price: 4.49, category: "fruit", icon: "nutrition", tint: "#fde2e1" },
  { id: "p2", name: "Baby spinach", unit: "200 g", price: 2.79, category: "veg", icon: "leaf", tint: "#dcf3e3" },
  { id: "p3", name: "Free-range eggs", unit: "Dozen", price: 5.25, category: "dairy", icon: "egg", tint: "#fbf1d9" },
  { id: "p4", name: "Stone-baked pizza bases", unit: "2 × 250 g", price: 6.1, category: "bakery", icon: "pizza", tint: "#f4e6d7" },
  { id: "p5", name: "Whole bean coffee", unit: "340 g", price: 11.9, category: "pantry", icon: "cafe", tint: "#ece4dc" },
  { id: "p6", name: "Sparkling water", unit: "6 × 330 ml", price: 3.99, category: "drinks", icon: "water", tint: "#dfeefa" },
  { id: "p7", name: "Bananas", unit: "Bunch of 6", price: 1.89, category: "fruit", icon: "nutrition", tint: "#fbf3cf" },
  { id: "p8", name: "Greek yoghurt", unit: "500 g", price: 3.6, category: "dairy", icon: "ice-cream", tint: "#eef0f3" },
  { id: "p9", name: "Atlantic salmon", unit: "2 fillets", price: 9.8, category: "pantry", icon: "fish", tint: "#fde4da" },
  { id: "p10", name: "Tulip bunch", unit: "10 stems", price: 7.5, category: "veg", icon: "flower", tint: "#fbe1ec" },
];

export function money(n: number) {
  return `$${n.toFixed(2)}`;
}
