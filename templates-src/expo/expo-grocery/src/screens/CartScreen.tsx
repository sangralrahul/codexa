import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { STORE, money } from "../data";
import { cartLines, cartTotals, type Cart } from "../cart";
import { Stepper } from "../components/Stepper";
import { colors, radius, space } from "../theme";

const DELIVERY_FEE = 3.99;

export function CartScreen({ cart, onQuantity, onShop }: { cart: Cart; onQuantity: (id: string, qty: number) => void; onShop: () => void }) {
  const insets = useSafeAreaInsets();
  const [checkout, setCheckout] = useState(false);
  const lines = cartLines(cart);
  const { subtotal } = cartTotals(cart);
  const delivery = subtotal >= STORE.freeDeliveryOver || subtotal === 0 ? 0 : DELIVERY_FEE;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg }]}>
      <Text style={styles.title} accessibilityRole="header">
        Your cart
      </Text>
      {lines.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="basket-outline" size={48} color={colors.muted} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Pressable onPress={onShop} accessibilityRole="button" style={styles.primary}>
            <Text style={styles.primaryText}>Start shopping</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            {lines.map(({ product, qty }, i) => (
              <View key={product.id} style={[styles.line, i > 0 && styles.divider]}>
                <View style={[styles.thumb, { backgroundColor: product.tint }]}>
                  <Ionicons name={product.icon} size={22} color={colors.text} style={{ opacity: 0.75 }} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.name}>{product.name}</Text>
                  <Text style={styles.muted}>{money(product.price * qty)}</Text>
                </View>
                <Stepper name={product.name} qty={qty} onChange={(n) => onQuantity(product.id, n)} compact />
              </View>
            ))}
          </View>
          <View style={styles.card}>
            <Row label="Subtotal" value={money(subtotal)} />
            <Row label="Delivery" value={delivery === 0 ? "Free" : money(delivery)} />
            <Row label="Total" value={money(subtotal + delivery)} strong />
          </View>
          {delivery > 0 ? <Text style={styles.hint}>Add {money(STORE.freeDeliveryOver - subtotal)} more for free delivery.</Text> : null}
          <Pressable accessibilityRole="button" style={styles.primary} onPress={() => setCheckout(true)}>
            <Text style={styles.primaryText}>Go to checkout</Text>
          </Pressable>
          {checkout ? (
            <Text style={styles.hint} accessibilityLiveRegion="polite">
              Checkout is not connected yet. Ask Codexa to add a payment provider.
            </Text>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.muted, strong && styles.strong]}>{label}</Text>
      <Text style={[styles.value, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.lg },
  title: { fontSize: 28, fontWeight: "700", color: colors.text, letterSpacing: -0.5 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg, gap: space.md },
  line: { flexDirection: "row", alignItems: "center", gap: space.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: space.md },
  thumb: { width: 44, height: 44, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
  row: { flexDirection: "row", justifyContent: "space-between" },
  value: { fontSize: 14, color: colors.text, fontWeight: "500" },
  strong: { fontSize: 16, fontWeight: "700", color: colors.text },
  hint: { textAlign: "center", fontSize: 13, color: colors.muted },
  primary: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: space.lg, paddingHorizontal: space.xl, alignItems: "center" },
  primaryText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
  empty: { alignItems: "center", gap: space.md, paddingVertical: space.xxl },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: colors.text },
});
