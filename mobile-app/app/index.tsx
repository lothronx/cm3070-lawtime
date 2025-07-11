import React from "react";
import { View, StyleSheet } from "react-native";
import { useAppTheme } from "../theme/ThemeProvider";
import ActionMenu from "@/components/navigation/ActionMenu";
import Header from "@/components/Header";

export default function Calendar() {
  const { theme } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Calendar" variant="main" />

      <ActionMenu />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 160,
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  previewBlock: {
    gap: 12,
  },
});
