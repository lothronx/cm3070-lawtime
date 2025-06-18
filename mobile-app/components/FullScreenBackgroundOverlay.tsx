import React from "react";
import { StyleSheet } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useAppTheme } from "../theme/ThemeProvider";

interface FullScreenBackgroundOverlayProps {
  backgroundOverlay: Animated.SharedValue<number>;
}

export default function FullScreenBackgroundOverlay({
  backgroundOverlay,
}: FullScreenBackgroundOverlayProps) {
  const { theme } = useAppTheme();

  const rBackgroundOverlayStyles = useAnimatedStyle(() => {
    return {
      opacity: backgroundOverlay.value,
    };
  }, []);

  return (
    <Animated.View
      style={[
        styles.fullScreenOverlay,
        rBackgroundOverlayStyles,
        { backgroundColor: theme.colors.primaryContainer },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  fullScreenOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
});
