import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { colors, radius, space, type } from "../theme";

const STEPS = [
  { id: "edit", title: "Change this screen", detail: "Open src/screens/HomeScreen.tsx and edit the text." },
  { id: "ask", title: "Describe a feature", detail: "Ask Codexa for a new screen, a form or a list." },
  { id: "phone", title: "Open it on your phone", detail: "Preview → Your Device, then scan with Expo Go." },
  { id: "publish", title: "Publish the web version", detail: "Publish builds the web app and gives it a URL." },
];

export function HomeScreen({ onExplore }: { onExplore: () => void }) {
  const [done, setDone] = useState<Record<string, boolean>>({ edit: false });
  const count = STEPS.filter((s) => done[s.id]).length;

  return (
    <Screen title="Your new app" subtitle="Welcome">
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Built with React Native and Expo</Text>
        <Text style={styles.heroBody}>The same code runs on iOS, Android and the web. Everything you see is a View, Text or Pressable.</Text>
        <Pressable onPress={onExplore} accessibilityRole="button" style={({ pressed }) => [styles.heroButton, pressed && { opacity: 0.85 }]}>
          <Text style={styles.heroButtonText}>Explore the building blocks</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.accent} />
        </Pressable>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={type.heading}>Getting started</Text>
          <Text style={type.caption}>
            {count} of {STEPS.length} done
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(count / STEPS.length) * 100}%` }]} />
        </View>
        <View style={styles.card}>
          {STEPS.map((s, i) => {
            const checked = Boolean(done[s.id]);
            return (
              <Pressable
                key={s.id}
                onPress={() => setDone((d) => ({ ...d, [s.id]: !checked }))}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                style={({ pressed }) => [styles.row, i > 0 && styles.rowDivider, pressed && { backgroundColor: colors.background }]}
              >
                <Ionicons name={checked ? "checkmark-circle" : "ellipse-outline"} size={24} color={checked ? colors.success : colors.border} />
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, checked && styles.rowTitleDone]}>{s.title}</Text>
                  <Text style={type.caption}>{s.detail}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.accent, borderRadius: radius.lg, padding: space.xl, gap: space.sm },
  heroTitle: { color: "#ffffff", fontSize: 20, fontWeight: "700", letterSpacing: -0.3 },
  heroBody: { color: "#dbe4fb", fontSize: 15, lineHeight: 22 },
  heroButton: {
    marginTop: space.sm,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    backgroundColor: "#ffffff",
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: 10,
  },
  heroButtonText: { color: colors.accent, fontWeight: "600", fontSize: 14 },
  section: { gap: space.md },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  progressTrack: { height: 6, borderRadius: radius.pill, backgroundColor: colors.border, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.success },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { ...type.body, fontWeight: "600" },
  rowTitleDone: { color: colors.muted, textDecorationLine: "line-through" },
});
