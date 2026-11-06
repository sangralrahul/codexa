import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { dayKey, lastSevenDays, streak, type Habit } from "../habits";
import { colors, radius, space } from "../theme";

/** One habit: tap the circle to check it off for the selected day, long-press the row to delete it. */
export function HabitRow({ habit, day, onToggle, onRemove }: { habit: Habit; day: string; onToggle: () => void; onRemove: () => void }) {
  const done = habit.done.includes(day);
  const days = streak(habit);
  return (
    <Pressable onLongPress={onRemove} accessibilityHint="Long-press to delete this habit" style={styles.card}>
      <View style={styles.icon}>
        <Ionicons name={habit.icon} size={20} color={colors.accent} />
      </View>
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {habit.name}
        </Text>
        <View style={styles.meta}>
          <View style={styles.week} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {lastSevenDays().map((d) => (
              <View key={d.toISOString()} style={[styles.cell, habit.done.includes(dayKey(d)) && styles.cellOn]} />
            ))}
          </View>
          <Text style={styles.streak}>{days > 0 ? `${days}-day streak` : habit.goal}</Text>
        </View>
      </View>
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`Mark ${habit.name} as done`}
        hitSlop={8}
        style={({ pressed }) => [styles.check, done && styles.checkOn, pressed && { transform: [{ scale: 0.92 }] }]}
      >
        {done ? <Ionicons name="checkmark" size={20} color="#ffffff" /> : null}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: space.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  icon: { width: 42, height: 42, borderRadius: radius.sm, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, gap: 6 },
  name: { fontSize: 16, fontWeight: "600", color: colors.text },
  meta: { flexDirection: "row", alignItems: "center", gap: space.sm },
  week: { flexDirection: "row", gap: 3 },
  cell: { width: 8, height: 8, borderRadius: 2, backgroundColor: colors.border },
  cellOn: { backgroundColor: colors.accent },
  streak: { fontSize: 12, color: colors.muted, fontWeight: "500" },
  check: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
});
