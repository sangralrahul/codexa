import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatWhen, type Note } from "../notes";
import { colors, space } from "../theme";

/** Edits save as you type; Back returns to the list (empty notes are dropped there). */
export function NoteEditor({ note, onChange, onBack, onDelete }: { note: Note; onChange: (patch: Partial<Note>) => void; onBack: () => void; onDelete: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.toolbar, { paddingTop: insets.top + space.sm }]}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to notes" hitSlop={8} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.accent} />
          <Text style={styles.backText}>Notes</Text>
        </Pressable>
        <View style={styles.actions}>
          <Pressable onPress={() => onChange({ pinned: !note.pinned })} accessibilityRole="button" accessibilityLabel={note.pinned ? "Unpin note" : "Pin note"} accessibilityState={{ selected: note.pinned }} hitSlop={8} style={styles.icon}>
            <Ionicons name={note.pinned ? "pin" : "pin-outline"} size={22} color={colors.accent} />
          </Pressable>
          <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel="Delete note" hitSlop={8} style={styles.icon}>
            <Ionicons name="trash-outline" size={22} color={colors.accent} />
          </Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.xxl }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.when}>Edited {formatWhen(note.updatedAt)}</Text>
        <TextInput value={note.title} onChangeText={(title) => onChange({ title })} placeholder="Title" placeholderTextColor={colors.faint} style={styles.title} accessibilityLabel="Note title" />
        <TextInput
          value={note.body}
          onChangeText={(body) => onChange({ body })}
          placeholder="Start writing…"
          placeholderTextColor={colors.faint}
          style={styles.text}
          multiline
          textAlignVertical="top"
          accessibilityLabel="Note text"
          autoFocus={!note.title && !note.body}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.sm, paddingBottom: space.sm },
  back: { flexDirection: "row", alignItems: "center", paddingVertical: space.xs },
  backText: { fontSize: 17, color: colors.accent },
  actions: { flexDirection: "row", gap: space.sm },
  icon: { padding: space.sm },
  body: { paddingHorizontal: space.xl, gap: space.sm },
  when: { fontSize: 12, color: colors.faint, textAlign: "center" },
  title: { fontSize: 26, fontWeight: "700", color: colors.text, paddingVertical: space.sm },
  text: { fontSize: 17, lineHeight: 26, color: colors.text, minHeight: 320 },
});
