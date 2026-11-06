import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, space } from "../theme";

export type TabId = "home" | "explore" | "profile";
type IconName = ComponentProps<typeof Ionicons>["name"];

const TABS: { id: TabId; label: string; icon: IconName; activeIcon: IconName }[] = [
  { id: "home", label: "Home", icon: "home-outline", activeIcon: "home" },
  { id: "explore", label: "Explore", icon: "compass-outline", activeIcon: "compass" },
  { id: "profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
];

export function TabBar({ active, onChange }: { active: TabId; onChange: (tab: TabId) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.sm) }]} accessibilityRole="tablist">
      {TABS.map((t) => {
        const selected = t.id === active;
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange(t.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={t.label}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <Ionicons name={selected ? t.activeIcon : t.icon} size={24} color={selected ? colors.accent : colors.muted} />
            <Text style={[styles.label, selected && styles.labelActive]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: space.sm,
  },
  tab: { flex: 1, alignItems: "center", gap: 2, paddingVertical: space.xs },
  pressed: { opacity: 0.6 },
  label: { fontSize: 11, fontWeight: "500", color: colors.muted },
  labelActive: { color: colors.accent },
});
