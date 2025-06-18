import React from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";

const AnimatedTouchable = Animated.createAnimatedComponent(Pressable);

interface TapToCloseOverlayProps {
  isOpenedShared: Animated.SharedValue<number>;
  onPress: () => void;
}

export default function TapToCloseOverlay({ isOpenedShared, onPress }: TapToCloseOverlayProps) {
  const rTapToCloseOverlayStyles = useAnimatedStyle(() => {
    return {
      opacity: isOpenedShared.value > 0 ? 1 : 0,
      pointerEvents: isOpenedShared.value > 0 ? "auto" : "none",
    };
  }, []);

  return (
    <AnimatedTouchable
      style={[styles.tapToCloseOverlay, rTapToCloseOverlayStyles]}
      onPress={onPress}
    />
  );
}

const styles = StyleSheet.create({
  tapToCloseOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
});
