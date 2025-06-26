import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, Animated, ViewStyle } from "react-native";
import { useAppTheme } from "../../theme/ThemeProvider";

interface ErrorDialogProps {
  visible: boolean;
  message: string;
  duration?: number;
  onDismiss?: () => void;
}

/**
 * A reusable error dialog component that displays a message in the center of the screen
 * and automatically dismisses after a specified duration with fade in/out animations
 */
export default function ErrorDialog({
  visible,
  message,
  duration = 1000, // Default 1 second
  onDismiss,
}: ErrorDialogProps) {
  const { theme } = useAppTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      // Clear any existing timeout
      if (timeout.current) {
        clearTimeout(timeout.current);
      }

      // Fade in
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Set timeout to dismiss
      timeout.current = setTimeout(() => {
        // Fade out
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          // Call onDismiss callback after fade out completes
          if (onDismiss) {
            onDismiss();
          }
        });
      }, duration);
    } else {
      // Reset opacity when not visible
      opacity.setValue(0);
    }

    // Cleanup on unmount
    return () => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
    };
  }, [visible, duration, opacity, onDismiss]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: theme.colors.errorContainer, opacity } as ViewStyle,
      ]}>
      <Text style={[styles.text, { color: theme.colors.onErrorContainer }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: "50%",
    left: "10%",
    right: "10%",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  text: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});
