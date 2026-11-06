import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TabBar, type TabId } from "./src/components/TabBar";
import { ShopScreen } from "./src/screens/ShopScreen";
import { CartScreen } from "./src/screens/CartScreen";
import { AccountScreen } from "./src/screens/AccountScreen";
import { cartTotals, setQuantity, type Cart } from "./src/cart";
import { money } from "./src/data";
import { colors, radius, space } from "./src/theme";

export default function App() {
  const [tab, setTab] = useState<TabId>("shop");
  const [cart, setCart] = useState<Cart>({ p2: 1, p4: 1 });
  const totals = cartTotals(cart);
  const onQuantity = (id: string, qty: number) => setCart((c) => setQuantity(c, id, qty));

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <View style={styles.screen}>
          {tab === "shop" ? <ShopScreen cart={cart} onQuantity={onQuantity} /> : tab === "cart" ? <CartScreen cart={cart} onQuantity={onQuantity} onShop={() => setTab("shop")} /> : <AccountScreen />}
          {tab === "shop" && totals.items > 0 ? (
            <Pressable onPress={() => setTab("cart")} accessibilityRole="button" style={({ pressed }) => [styles.cartBar, pressed && { opacity: 0.9 }]}>
              <View style={styles.cartCount}>
                <Text style={styles.cartCountText}>{totals.items}</Text>
              </View>
              <Text style={styles.cartLabel}>View cart</Text>
              <Text style={styles.cartTotal}>{money(totals.subtotal)}</Text>
              <Ionicons name="chevron-forward" size={18} color="#ffffff" />
            </Pressable>
          ) : null}
        </View>
        <TabBar active={tab} onChange={setTab} cartCount={totals.items} />
      </View>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1 },
  cartBar: {
    position: "absolute",
    left: space.lg,
    right: space.lg,
    bottom: space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: colors.text,
    borderRadius: radius.pill,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    boxShadow: "0px 6px 16px rgba(0, 0, 0, 0.18)",
  },
  cartCount: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.highlight, alignItems: "center", justifyContent: "center" },
  cartCountText: { fontSize: 13, fontWeight: "700", color: colors.text },
  cartLabel: { flex: 1, color: "#ffffff", fontSize: 16, fontWeight: "600" },
  cartTotal: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
});
