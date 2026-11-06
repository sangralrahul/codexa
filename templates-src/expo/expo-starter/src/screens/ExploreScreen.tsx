import { useMemo, useState, type ComponentProps } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../components/Screen";
import { colors, radius, space, type } from "../theme";

type Item = { name: string; detail: string; icon: ComponentProps<typeof Ionicons>["name"] };

const BLOCKS: Item[] = [
  { name: "View", detail: "The box every layout is made of. Flexbox, column by default.", icon: "square-outline" },
  { name: "Text", detail: "All text must sit inside a Text element.", icon: "text-outline" },
  { name: "Pressable", detail: "Anything tappable, with pressed and focus states.", icon: "hand-left-outline" },
  { name: "ScrollView", detail: "A scrolling container for short content.", icon: "swap-vertical-outline" },
  { name: "FlatList", detail: "Long or endless lists, rendered lazily.", icon: "list-outline" },
  { name: "TextInput", detail: "Single and multi-line text fields.", icon: "create-outline" },
  { name: "Image", detail: "Local or remote images with resize modes.", icon: "image-outline" },
  { name: "Switch", detail: "An on/off toggle that follows the platform style.", icon: "toggle-outline" },
  { name: "StyleSheet", detail: "Typed style objects instead of CSS classes.", icon: "color-palette-outline" },
];

export function ExploreScreen() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? BLOCKS.filter((b) => `${b.name} ${b.detail}`.toLowerCase().includes(q)) : BLOCKS;
  }, [query]);

  return (
    <Screen title="Explore" subtitle="React Native building blocks">
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search components" placeholderTextColor={colors.muted} style={styles.input} accessibilityLabel="Search components" autoCorrect={false} />
      </View>
      <View style={styles.list}>
        {results.map((b) => (
          <View key={b.name} style={styles.item}>
            <View style={styles.icon}>
              <Ionicons name={b.icon} size={20} color={colors.accent} />
            </View>
            <View style={styles.itemText}>
              <Text style={styles.itemName}>{b.name}</Text>
              <Text style={type.caption}>{b.detail}</Text>
            </View>
          </View>
        ))}
        {results.length === 0 ? <Text style={[type.caption, styles.empty]}>Nothing matches “{query}”.</Text> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: space.md,
  },
  input: { flex: 1, paddingVertical: space.md, fontSize: 15, color: colors.text },
  list: { gap: space.sm },
  item: { flexDirection: "row", gap: space.md, alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md },
  icon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center" },
  itemText: { flex: 1, gap: 2 },
  itemName: { ...type.body, fontWeight: "600" },
  empty: { textAlign: "center", paddingVertical: space.xl },
});
