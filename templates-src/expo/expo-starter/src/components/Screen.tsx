import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, space, type } from "../theme";

/** A scrolling screen with a large title that clears the status bar and notch. */
export function Screen({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingTop: insets.top + space.lg }]}>
      <View style={styles.header}>
        {subtitle ? <Text style={type.caption}>{subtitle}</Text> : null}
        <Text style={type.title} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.lg },
  header: { gap: 2, marginBottom: space.xs },
});
