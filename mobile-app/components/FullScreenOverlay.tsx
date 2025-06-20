import React from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, SharedValue } from "react-native-reanimated";
import { useAppTheme } from "../theme/ThemeProvider";

const AnimatedTouchable = Animated.createAnimatedComponent(Pressable);

interface FullScreenOverlayProps {
  opacityValue: SharedValue<number>;
  onPress?: () => void;
}

export default function FullScreenOverlay({ opacityValue, onPress }: FullScreenOverlayProps) {
  const { theme } = useAppTheme();

  const FullScreenOverlayStyles = useAnimatedStyle(() => {
    return {
      backgroundColor: theme.colors.primaryContainer,
      opacity: opacityValue.value,
      pointerEvents: opacityValue.value > 0 ? "auto" : "none",
    };
  }, []);

  // If onPress is provided, use AnimatedTouchable, otherwise use Animated.View
  const Component = onPress ? AnimatedTouchable : Animated.View;

  return (
    <Component style={[styles.fullScreenOverlay, FullScreenOverlayStyles]} onPress={onPress} />
  );
}

const styles = StyleSheet.create({
  fullScreenOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
});
