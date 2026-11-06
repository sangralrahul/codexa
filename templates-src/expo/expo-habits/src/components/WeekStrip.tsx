import { Pressable, StyleSheet, Text, View } from "react-native";
import { dayKey, lastSevenDays, type Habit } from "../habits";
import { colors, radius, space } from "../theme";

/** The last seven days; tap one to check habits off for that day. A dot marks days with everything done. */
export function WeekStrip({ selected, onSelect, habits }: { selected: Date; onSelect: (d: Date) => void; habits: Habit[] }) {
  const selectedKey = dayKey(selected);
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {lastSevenDays().map((d) => {
        const key = dayKey(d);
        const active = key === selectedKey;
        const complete = habits.length > 0 && habits.every((h) => h.done.includes(key));
        return (
          <Pressable
            key={key}
            onPress={() => onSelect(d)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            style={[styles.day, active && styles.dayActive]}
          >
            <Text style={[styles.weekday, active && styles.textActive]}>{d.toLocaleDateString("en-US", { weekday: "narrow" })}</Text>
            <Text style={[styles.date, active && styles.textActive]}>{d.getDate()}</Text>
            <View style={[styles.dot, complete && (active ? styles.dotOnActive : styles.dotOn)]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space.xs },
  day: { flex: 1, alignItems: "center", gap: 2, paddingVertical: space.sm, borderRadius: radius.md, backgroundColor: colors.surface },
  dayActive: { backgroundColor: colors.text },
  weekday: { fontSize: 12, color: colors.muted, fontWeight: "500" },
  date: { fontSize: 17, fontWeight: "700", color: colors.text },
  textActive: { color: "#ffffff" },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2, backgroundColor: "transparent" },
  dotOn: { backgroundColor: colors.accent },
  dotOnActive: { backgroundColor: "#6ee7b7" },
});
