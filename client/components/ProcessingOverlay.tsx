import { StyleSheet, Animated } from "react-native";
import { ActivityIndicator, Text, Portal } from "react-native-paper";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";
import { useProcessing } from "@/hooks/infrastructure/useProcessing";
import { useEffect, useRef } from "react";

/**
 * Processing Overlay Props
 */
export interface ProcessingOverlayProps {
  visible?: boolean;
  message?: string;
}

/**
 * Processing Overlay Component
 *
 * Shows a loading spinner with optional message.
 * Automatically controlled by useProcessing hook or manual props.
 */
export function ProcessingOverlay({ visible, message }: ProcessingOverlayProps) {
  const { theme } = useAppTheme();
  const { isProcessing, currentMessage } = useProcessing();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isVisible = visible !== undefined ? visible : isProcessing;
  const displayMessage = message || currentMessage || "Processing...";

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isVisible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isVisible, fadeAnim]);

  if (!isVisible) return null;

  return (
    <Portal>
      <Animated.View
        style={[
          styles.overlay,
          {
            backgroundColor: `${theme.colors.surfaceVariant}CC`,
            opacity: fadeAnim,
          },
        ]}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text variant="bodyMedium" style={[styles.message, { color: theme.colors.onBackground }]}>
          {displayMessage}
        </Text>
      </Animated.View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: SPACING.xxl,
    zIndex: 999999,
    elevation: 999999,
  },
  message: {
    textAlign: "center",
    fontSize: 16,
    marginTop: SPACING.md,
  },
});
