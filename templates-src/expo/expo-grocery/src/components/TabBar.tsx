import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, space } from "../theme";

export type TabId = "shop" | "cart" | "account";
type IconName = ComponentProps<typeof Ionicons>["name"];

const TABS: { id: TabId; label: string; icon: IconName; activeIcon: IconName }[] = [
  { id: "shop", label: "Shop", icon: "storefront-outline", activeIcon: "storefront" },
  { id: "cart", label: "Cart", icon: "basket-outline", activeIcon: "basket" },
  { id: "account", label: "Account", icon: "person-outline", activeIcon: "person" },
];

export function TabBar({ active, onChange, cartCount }: { active: TabId; onChange: (t: TabId) => void; cartCount: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.sm) }]} accessibilityRole="tablist">
      {TABS.map((t) => {
        const selected = t.id === active;
        return (
          <Pressable key={t.id} onPress={() => onChange(t.id)} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={t.id === "cart" && cartCount ? `Cart, ${cartCount} items` : t.label} style={styles.tab}>
            <View>
              <Ionicons name={selected ? t.activeIcon : t.icon} size={24} color={selected ? colors.accent : colors.muted} />
              {t.id === "cart" && cartCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cartCount}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, selected && { color: colors.accent }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", backgroundColor: colors.background, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: space.sm },
  tab: { flex: 1, alignItems: "center", gap: 2, paddingVertical: space.xs },
  label: { fontSize: 11, fontWeight: "600", color: colors.muted },
  badge: { position: "absolute", top: -4, right: -10, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.highlight, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeText: { fontSize: 11, fontWeight: "700", color: colors.text },
});
