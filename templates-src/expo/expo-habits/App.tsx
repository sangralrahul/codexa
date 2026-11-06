import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { HabitRow } from "./src/components/HabitRow";
import { NewHabit } from "./src/components/NewHabit";
import { WeekStrip } from "./src/components/WeekStrip";
import { dayKey, sampleHabits, type Habit, type HabitIcon } from "./src/habits";
import { useStoredState } from "./src/useStoredState";
import { colors, radius, space } from "./src/theme";

export default function App() {
  return (
    <SafeAreaProvider>
      <HabitsScreen />
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

function HabitsScreen() {
  const insets = useSafeAreaInsets();
  const [habits, setHabits] = useStoredState<Habit[]>("habits-v1", sampleHabits);
  const [selected, setSelected] = useState(() => new Date());
  const key = dayKey(selected);
  const doneCount = habits.filter((h) => h.done.includes(key)).length;
  const pct = habits.length ? Math.round((doneCount / habits.length) * 100) : 0;
  const isToday = key === dayKey(new Date());

  const toggle = (id: string) =>
    setHabits((list) => list.map((h) => (h.id !== id ? h : { ...h, done: h.done.includes(key) ? h.done.filter((d) => d !== key) : [...h.done, key] })));
  const remove = (id: string) => setHabits((list) => list.filter((h) => h.id !== id));
  const add = (name: string, icon: HabitIcon) => setHabits((list) => [...list, { id: `h${Date.now()}`, name, icon, goal: "Every day", done: [] }]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + space.xxl }]}>
      <View>
        <Text style={styles.date}>{selected.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</Text>
        <Text style={styles.title} accessibilityRole="header">
          {isToday ? "Today" : "Looking back"}
        </Text>
      </View>

      <View style={styles.progress} accessibilityLabel={`${doneCount} of ${habits.length} habits done`}>
        <View style={styles.progressText}>
          <Text style={styles.progressBig}>{pct}%</Text>
          <Text style={styles.progressSmall}>
            {doneCount} of {habits.length} habits done
          </Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
      </View>

      <WeekStrip selected={selected} onSelect={setSelected} habits={habits} />

      <View style={styles.list}>
        {habits.map((h) => (
          <HabitRow key={h.id} habit={h} day={key} onToggle={() => toggle(h.id)} onRemove={() => remove(h.id)} />
        ))}
        {habits.length === 0 ? <Text style={styles.empty}>No habits yet. Add the first one below.</Text> : null}
      </View>

      <NewHabit onAdd={add} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: space.lg, gap: space.xl },
  date: { fontSize: 14, color: colors.muted, fontWeight: "500" },
  title: { fontSize: 32, fontWeight: "700", color: colors.text, letterSpacing: -0.6 },
  progress: { backgroundColor: colors.accent, borderRadius: radius.lg, padding: space.xl, gap: space.md },
  progressText: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  progressBig: { fontSize: 40, fontWeight: "700", color: colors.accentText, letterSpacing: -1 },
  progressSmall: { fontSize: 14, color: "#c9e7d8", fontWeight: "500" },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.22)", overflow: "hidden" },
  fill: { height: 8, borderRadius: radius.pill, backgroundColor: "#ffffff" },
  list: { gap: space.sm },
  empty: { textAlign: "center", color: colors.muted, paddingVertical: space.xl },
});
