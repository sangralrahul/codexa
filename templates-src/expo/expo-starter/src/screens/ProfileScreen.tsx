import { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { Screen } from "../components/Screen";
import { colors, radius, space, type } from "../theme";

export function ProfileScreen() {
  const [settings, setSettings] = useState({ reminders: true, weekly: false, haptics: true });
  const toggle = (key: keyof typeof settings) => setSettings((s) => ({ ...s, [key]: !s[key] }));

  return (
    <Screen title="Profile">
      <View style={styles.person}>
        <View style={styles.avatar}>
          <Text style={styles.initials}>AR</Text>
        </View>
        <View>
          <Text style={type.heading}>Alex Rivera</Text>
          <Text style={type.caption}>alex@example.com</Text>
        </View>
      </View>

      <Text style={styles.groupLabel}>Notifications</Text>
      <View style={styles.card}>
        <Row label="Daily reminders" value={settings.reminders} onChange={() => toggle("reminders")} />
        <Row label="Weekly summary" value={settings.weekly} onChange={() => toggle("weekly")} divider />
        <Row label="Haptic feedback" value={settings.haptics} onChange={() => toggle("haptics")} divider />
      </View>

      <Text style={[type.caption, styles.footnote]}>Settings are kept in memory. Ask Codexa to save them with AsyncStorage.</Text>
    </Screen>
  );
}

function Row({ label, value, onChange, divider }: { label: string; value: boolean; onChange: () => void; divider?: boolean }) {
  return (
    <View style={[styles.row, divider && styles.divider]}>
      <Text style={type.body}>{label}</Text>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.border }} thumbColor="#ffffff" accessibilityLabel={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  person: { flexDirection: "row", alignItems: "center", gap: space.lg, backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 18, fontWeight: "700", color: colors.accent },
  groupLabel: { ...type.caption, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: -space.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, paddingVertical: space.md },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  footnote: { textAlign: "center" },
});
