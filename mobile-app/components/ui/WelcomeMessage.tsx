import React from "react";
import { View, StyleSheet } from "react-native";
import { Text, useTheme } from "react-native-paper";

export default function WelcomeMessage() {
  const theme = useTheme();

  const styles = StyleSheet.create({
    container: {
      alignItems: "flex-start",
      marginBottom: 32,
    },
    welcomeText: {
      color: theme.colors.surfaceVariant,
      fontWeight: "700",
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    appName: {
      color: theme.colors.surfaceVariant,
      fontSize: 30,
      fontWeight: "900",
    },
    slogan: {
      color: theme.colors.surfaceVariant,
      fontWeight: "500",
      textAlign: "left",
    },
  });

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.welcomeText}>
        Welcome to <Text style={styles.appName}>LawTime</Text>
      </Text>
      <Text variant="bodyLarge" style={styles.slogan}>
        Your AI-powered legal assistant
      </Text>
    </View>
  );
}
