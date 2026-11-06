import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius } from "../theme";

/** "+" when the item is not in the cart, "− 2 +" once it is. */
export function Stepper({ name, qty, onChange, compact }: { name: string; qty: number; onChange: (qty: number) => void; compact?: boolean }) {
  if (qty === 0) {
    return (
      <Pressable onPress={() => onChange(1)} accessibilityRole="button" accessibilityLabel={`Add ${name} to cart`} hitSlop={6} style={({ pressed }) => [styles.add, pressed && { opacity: 0.8 }]}>
        <Ionicons name="add" size={20} color="#ffffff" />
      </Pressable>
    );
  }
  return (
    <View style={[styles.stepper, compact && styles.compact]}>
      <Pressable onPress={() => onChange(qty - 1)} accessibilityRole="button" accessibilityLabel={`Remove one ${name}`} hitSlop={6} style={styles.step}>
        <Ionicons name={qty === 1 ? "trash-outline" : "remove"} size={16} color="#ffffff" />
      </Pressable>
      <Text style={styles.qty} accessibilityLabel={`${qty} in cart`}>
        {qty}
      </Text>
      <Pressable onPress={() => onChange(qty + 1)} accessibilityRole="button" accessibilityLabel={`Add one more ${name}`} hitSlop={6} style={styles.step}>
        <Ionicons name="add" size={16} color="#ffffff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  add: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  stepper: { flexDirection: "row", alignItems: "center", backgroundColor: colors.accent, borderRadius: radius.pill, height: 34 },
  compact: { alignSelf: "flex-start" },
  step: { width: 32, height: 34, alignItems: "center", justifyContent: "center" },
  qty: { minWidth: 18, textAlign: "center", color: "#ffffff", fontWeight: "700", fontSize: 14 },
});
