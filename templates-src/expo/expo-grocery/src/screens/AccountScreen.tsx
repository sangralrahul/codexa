import type { ComponentProps } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { STORE } from "../data";
import { colors, radius, space } from "../theme";

type Item = { icon: ComponentProps<typeof Ionicons>["name"]; label: string; value: string };

const DETAILS: Item[] = [
  { icon: "location-outline", label: "Delivery address", value: STORE.address },
  { icon: "card-outline", label: "Payment", value: "Not set up" },
  { icon: "storefront-outline", label: "Store", value: STORE.name },
  { icon: "time-outline", label: "Usual delivery", value: STORE.eta },
];

export function AccountScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg }]}>
      <Text style={styles.title} accessibilityRole="header">
        Account
      </Text>
      <View style={styles.card}>
        {DETAILS.map((d, i) => (
          <View key={d.label} style={[styles.row, i > 0 && styles.divider]}>
            <Ionicons name={d.icon} size={20} color={colors.accent} />
            <Text style={styles.label}>{d.label}</Text>
            <Text style={styles.value}>{d.value}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.note}>Sign-in, saved addresses and order history are not built yet. Describe them to Codexa to add them.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.lg },
  title: { fontSize: 28, fontWeight: "700", color: colors.text, letterSpacing: -0.5 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: space.lg },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.lg },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  label: { flex: 1, fontSize: 15, color: colors.text },
  value: { fontSize: 14, color: colors.muted },
  note: { fontSize: 13, color: colors.muted, textAlign: "center", lineHeight: 19 },
});
