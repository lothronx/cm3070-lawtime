import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-paper";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";

export default function WelcomeMessage() {
  const { theme } = useAppTheme();

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={[styles.headline, { color: theme.colors.onPrimary }]}>
        Welcome to{" "}
        <Text
          style={[
            {
              color: theme.colors.onPrimary,
            },
            styles.headlineVariant,
          ]}>
          LawTime
        </Text>
      </Text>
      <Text variant="bodyLarge" style={{ color: theme.colors.onPrimary }}>
        Your AI-powered scheduling assistant
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
    marginBottom: SPACING.lg,
  },
  headline: {
    fontWeight: "700",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  headlineVariant: {
    fontSize: 30,
    fontWeight: "900",
  },
});
