import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { money, type Product } from "../data";
import { colors, radius, space } from "../theme";
import { Stepper } from "./Stepper";

export function ProductCard({ product, qty, onChange }: { product: Product; qty: number; onChange: (qty: number) => void }) {
  return (
    <View style={styles.card}>
      <View style={[styles.tile, { backgroundColor: product.tint }]}>
        <Ionicons name={product.icon} size={44} color={colors.text} style={{ opacity: 0.75 }} />
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.unit}>{product.unit}</Text>
      </View>
      <View style={styles.footer}>
        <Text style={styles.price}>{money(product.price)}</Text>
        <Stepper name={product.name} qty={qty} onChange={onChange} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: space.sm },
  tile: { aspectRatio: 1.2, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  info: { gap: 2, minHeight: 44 },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  unit: { fontSize: 13, color: colors.muted },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  price: { fontSize: 16, fontWeight: "700", color: colors.text },
});
