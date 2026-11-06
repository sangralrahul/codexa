import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TabBar, type TabId } from "./src/components/TabBar";
import { HomeScreen } from "./src/screens/HomeScreen";
import { ExploreScreen } from "./src/screens/ExploreScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { colors } from "./src/theme";

/**
 * The app shell: one screen at a time above a bottom tab bar. Navigation is plain React state, so
 * adding a screen means adding a tab in src/components/TabBar.tsx and a branch below.
 */
export default function App() {
  const [tab, setTab] = useState<TabId>("home");
  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <View style={styles.screen}>
          {tab === "home" ? <HomeScreen onExplore={() => setTab("explore")} /> : tab === "explore" ? <ExploreScreen /> : <ProfileScreen />}
        </View>
        <TabBar active={tab} onChange={setTab} />
      </View>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1 },
});
