import React from "react";
import { View, StyleSheet } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";

/**
 * Reusable loading component for all loading scenarios across the app
 *
 * Usage examples:
 * - <LoadingComponent variant="settings" />
 * - <LoadingComponent variant="ai" message="Custom AI processing message..." />
 * - <LoadingComponent size="small" fullScreen={false} />
 */

export interface LoadingComponentProps {
  message?: string;
  size?: "small" | "large";
  fullScreen?: boolean;
  backgroundColor?: string;
  variant?: "default" | "processing" | "authentication" | "settings" | "tasks" | "ai";
}

// Pre-defined messages for common scenarios
const getDefaultMessage = (variant?: LoadingComponentProps["variant"]): string => {
  switch (variant) {
    case "processing":
      return "AI processing...";
    case "authentication":
      return "Checking authentication...";
    case "settings":
      return "Loading settings...";
    case "tasks":
      return "Loading tasks...";
    case "ai":
      return "AI analyzing...";
    default:
      return "Loading...";
  }
};

export default function LoadingComponent({
  message,
  size = "large",
  fullScreen = true,
  backgroundColor,
  variant = "default",
}: LoadingComponentProps) {
  const { theme } = useAppTheme();

  const displayMessage = message || getDefaultMessage(variant);

  const containerStyle = [
    fullScreen ? styles.fullScreenContainer : styles.inlineContainer,
    { backgroundColor: backgroundColor || theme.colors.background },
  ];

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={theme.colors.primary} />
      {displayMessage && (
        <Text variant="bodyMedium" style={[styles.message, { color: theme.colors.onBackground }]}>
          {displayMessage}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  inlineContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  message: {
    marginTop: SPACING.md,
    textAlign: "center",
  },
});
