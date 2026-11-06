import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatWhen, noteTitle, sortNotes, type Note } from "../notes";
import { colors, radius, space } from "../theme";

export function NotesList({ notes, onOpen, onCreate }: { notes: Note[]; onOpen: (id: string) => void; onCreate: () => void }) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortNotes(notes).filter((n) => !q || `${n.title}\n${n.body}`.toLowerCase().includes(q));
  }, [notes, query]);

  return (
    <View style={styles.screen}>
      <FlatList
        data={visible}
        keyExtractor={(n) => n.id}
        contentContainerStyle={[styles.list, { paddingTop: insets.top + space.lg, paddingBottom: insets.bottom + 110 }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              Notes
            </Text>
            <Text style={styles.count}>
              {notes.length} {notes.length === 1 ? "note" : "notes"}
            </Text>
            <View style={styles.search}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Search notes" placeholderTextColor={colors.faint} style={styles.searchInput} accessibilityLabel="Search notes" />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={40} color={colors.faint} />
            <Text style={styles.emptyText}>{query ? `Nothing matches “${query}”.` : "No notes yet. Tap + to write one."}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => onOpen(item.id)} accessibilityRole="button" style={({ pressed }) => [styles.card, pressed && { backgroundColor: colors.accentSoft }]}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {noteTitle(item)}
              </Text>
              {item.pinned ? <Ionicons name="pin" size={14} color={colors.accent} accessibilityLabel="Pinned" /> : null}
            </View>
            <Text style={styles.cardBody} numberOfLines={2}>
              {item.body.replace(/\n+/g, " · ") || "No text"}
            </Text>
            <Text style={styles.cardWhen}>{formatWhen(item.updatedAt)}</Text>
          </Pressable>
        )}
      />
      <Pressable onPress={onCreate} accessibilityRole="button" accessibilityLabel="New note" style={({ pressed }) => [styles.fab, { bottom: insets.bottom + space.xl }, pressed && { transform: [{ scale: 0.95 }] }]}>
        <Ionicons name="add" size={28} color="#ffffff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: space.lg, gap: space.sm },
  header: { gap: space.xs, marginBottom: space.md },
  title: { fontSize: 34, fontWeight: "700", color: colors.text, letterSpacing: -0.7 },
  count: { fontSize: 14, color: colors.muted },
  search: { marginTop: space.md, flexDirection: "row", alignItems: "center", gap: space.sm, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, paddingHorizontal: space.md },
  searchInput: { flex: 1, paddingVertical: space.md, fontSize: 15, color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg, gap: 4, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  cardTop: { flexDirection: "row", alignItems: "center", gap: space.sm },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.text },
  cardBody: { fontSize: 14, lineHeight: 20, color: colors.muted },
  cardWhen: { fontSize: 12, color: colors.faint, marginTop: 2 },
  empty: { alignItems: "center", gap: space.md, paddingVertical: space.xxl },
  emptyText: { color: colors.muted, fontSize: 15 },
  fab: { position: "absolute", right: space.xl, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", boxShadow: "0px 6px 16px rgba(120, 53, 15, 0.3)" },
});
