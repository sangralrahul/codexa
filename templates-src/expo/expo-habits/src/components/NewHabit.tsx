import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ICONS, type HabitIcon } from "../habits";
import { colors, radius, space } from "../theme";

/** A collapsed "New habit" button that opens into a small form (name + icon). */
export function NewHabit({ onAdd }: { onAdd: (name: string, icon: HabitIcon) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<HabitIcon>("leaf");

  const submit = () => {
    const n = name.trim();
    if (!n) return;
    onAdd(n, icon);
    setName("");
    setOpen(false);
  };

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" style={({ pressed }) => [styles.add, pressed && { opacity: 0.7 }]}>
        <Ionicons name="add" size={20} color={colors.accent} />
        <Text style={styles.addText}>New habit</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.form}>
      <Text style={styles.label}>Name</Text>
      <TextInput value={name} onChangeText={setName} placeholder="e.g. Stretch for 5 minutes" placeholderTextColor={colors.faint} style={styles.input} autoFocus onSubmitEditing={submit} returnKeyType="done" accessibilityLabel="Habit name" />
      <Text style={styles.label}>Icon</Text>
      <View style={styles.icons}>
        {ICONS.map((i) => (
          <Pressable key={i} onPress={() => setIcon(i)} accessibilityRole="radio" accessibilityState={{ checked: icon === i }} accessibilityLabel={i} style={[styles.iconChoice, icon === i && styles.iconChoiceOn]}>
            <Ionicons name={i} size={18} color={icon === i ? "#ffffff" : colors.muted} />
          </Pressable>
        ))}
      </View>
      <View style={styles.actions}>
        <Pressable onPress={() => setOpen(false)} accessibilityRole="button" style={styles.secondary}>
          <Text style={styles.secondaryText}>Cancel</Text>
        </Pressable>
        <Pressable onPress={submit} accessibilityRole="button" disabled={!name.trim()} style={[styles.primary, !name.trim() && { opacity: 0.5 }]}>
          <Text style={styles.primaryText}>Add habit</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  add: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.xs, paddingVertical: space.md, borderRadius: radius.md, borderWidth: 1, borderStyle: "dashed", borderColor: colors.faint },
  addText: { fontSize: 15, fontWeight: "600", color: colors.accent },
  form: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg, gap: space.sm },
  label: { fontSize: 13, fontWeight: "600", color: colors.muted },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: space.md, fontSize: 15, color: colors.text },
  icons: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  iconChoice: { width: 38, height: 38, borderRadius: radius.sm, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  iconChoiceOn: { backgroundColor: colors.accent },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: space.sm, marginTop: space.sm },
  secondary: { paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.sm },
  secondaryText: { fontSize: 15, fontWeight: "600", color: colors.muted },
  primary: { paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.sm, backgroundColor: colors.accent },
  primaryText: { fontSize: 15, fontWeight: "600", color: "#ffffff" },
});
