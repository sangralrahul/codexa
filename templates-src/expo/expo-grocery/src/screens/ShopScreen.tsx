import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CATEGORIES, PRODUCTS, STORE, type CategoryId } from "../data";
import type { Cart } from "../cart";
import { ProductCard } from "../components/ProductCard";
import { colors, radius, space } from "../theme";

export function ShopScreen({ cart, onQuantity }: { cart: Cart; onQuantity: (id: string, qty: number) => void }) {
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<CategoryId>("all");
  const [query, setQuery] = useState("");

  const products = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter((p) => (category === "all" || p.category === category) && (!q || p.name.toLowerCase().includes(q)));
  }, [category, query]);

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
      <View style={styles.topRow}>
        <View>
          <Text style={styles.deliverTo}>Deliver to</Text>
          <View style={styles.addressRow}>
            <Text style={styles.address}>{STORE.address}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.text} />
          </View>
        </View>
        <View style={styles.eta}>
          <Ionicons name="time-outline" size={14} color={colors.accent} />
          <Text style={styles.etaText}>{STORE.eta}</Text>
        </View>
      </View>

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput value={query} onChangeText={setQuery} placeholder={`Search ${STORE.name}`} placeholderTextColor={colors.muted} style={styles.searchInput} accessibilityLabel="Search products" />
      </View>

      <View style={styles.promo}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.promoTitle}>Free delivery over ${STORE.freeDeliveryOver}</Text>
          <Text style={styles.promoBody}>Fresh produce from local farms, picked this morning.</Text>
        </View>
        <Ionicons name="bicycle" size={40} color={colors.highlight} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} accessibilityRole="tablist">
        {CATEGORIES.map((c) => {
          const active = c.id === category;
          return (
            <Pressable key={c.id} onPress={() => setCategory(c.id)} accessibilityRole="tab" accessibilityState={{ selected: active }} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.sectionTitle}>{category === "all" ? "Popular this week" : CATEGORIES.find((c) => c.id === category)?.label}</Text>
    </View>
  );

  return (
    <FlatList
      data={products}
      keyExtractor={(p) => p.id}
      numColumns={2}
      ListHeaderComponent={header}
      ListEmptyComponent={<Text style={styles.empty}>No products match “{query}”.</Text>}
      columnWrapperStyle={styles.columns}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => <ProductCard product={item} qty={cart[item.id] ?? 0} onChange={(qty) => onQuantity(item.id, qty)} />}
      style={styles.screen}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: space.lg, paddingBottom: 120, gap: space.xl },
  columns: { gap: space.lg },
  header: { gap: space.lg },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  deliverTo: { fontSize: 12, color: colors.muted, fontWeight: "500" },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  address: { fontSize: 17, fontWeight: "700", color: colors.text },
  eta: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.accentSoft, paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill },
  etaText: { fontSize: 13, fontWeight: "600", color: colors.accent },
  search: { flexDirection: "row", alignItems: "center", gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: space.md },
  searchInput: { flex: 1, paddingVertical: space.md, fontSize: 15, color: colors.text },
  promo: { flexDirection: "row", alignItems: "center", gap: space.lg, backgroundColor: colors.accent, borderRadius: radius.lg, padding: space.lg },
  promoTitle: { color: "#ffffff", fontSize: 17, fontWeight: "700" },
  promoBody: { color: "#cfe3d5", fontSize: 13, lineHeight: 18 },
  chips: { gap: space.sm },
  chip: { paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radius.pill, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.text },
  chipText: { fontSize: 14, fontWeight: "600", color: colors.text },
  chipTextActive: { color: "#ffffff" },
  sectionTitle: { fontSize: 20, fontWeight: "700", color: colors.text, letterSpacing: -0.3 },
  empty: { textAlign: "center", color: colors.muted, paddingVertical: space.xxl },
});
