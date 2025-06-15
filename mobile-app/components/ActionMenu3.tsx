import React, { useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../theme/ThemeProvider";
import { FontAwesome, Ionicons, Feather } from "@expo/vector-icons";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  WithSpringConfig,
  withTiming,
} from "react-native-reanimated";

const DURATION = 400;
const TRANSLATE_Y = -80;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ActionMenuProps {
  onFilePress?: () => void;
  onMicrophonePress?: () => void;
  onAddPress?: () => void;
  visible?: boolean;
}

export default function ActionMenu({
  onFilePress,
  onMicrophonePress,
  onAddPress,
  visible = true,
}: ActionMenuProps) {
  const { theme } = useAppTheme();

  const isOpened = useRef(false);
  const transYCamera = useSharedValue(0);
  const transYManual = useSharedValue(0);
  const transYAudio = useSharedValue(0);
  const opacity = useSharedValue(1);

  const rCameraAnimateStyles = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: transYCamera.value },
        { scale: interpolate(transYCamera.value, [TRANSLATE_Y, 0], [1, 0]) },
      ],
      backgroundColor: theme.colors.secondary,
    };
  }, []);

  const rManualAnimateStyles = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: interpolate(transYManual.value, [TRANSLATE_Y, 0], [TRANSLATE_Y / 2, 0]) },
        { translateX: interpolate(transYManual.value, [TRANSLATE_Y, 0], [-50, 0]) },
        { scale: interpolate(transYManual.value, [TRANSLATE_Y, 0], [1, 0]) },
      ],
      backgroundColor: theme.colors.secondary,
    };
  }, []);

  const rAudioAnimateStyles = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: interpolate(transYAudio.value, [TRANSLATE_Y, 0], [30, 0]) },
        { translateX: transYAudio.value },
        { scale: interpolate(transYAudio.value, [TRANSLATE_Y, 0], [1, 0]) },
      ],
      backgroundColor: theme.colors.secondary,
    };
  }, []);

  const rAddAnimateStyles = useAnimatedStyle(() => {
    return {
      transform: [{ rotateZ: interpolate(opacity.value, [0, 1], [45, 0]).toString() + "deg" }],
      backgroundColor: theme.colors.secondary,
    };
  }, []);

  const handlePress = () => {
    if (isOpened.current) {
      transYCamera.value = withDelay(
        DURATION,
        withTiming(0, { duration: DURATION, easing: Easing.bezierFn(0.36, 0, 0.66, -0.56) })
      );
      transYManual.value = withDelay(
        DURATION / 2,
        withTiming(0, { duration: DURATION, easing: Easing.bezierFn(0.36, 0, 0.66, -0.56) })
      );
      transYAudio.value = withDelay(
        0,
        withTiming(0, { duration: DURATION, easing: Easing.bezierFn(0.36, 0, 0.66, -0.56) })
      );
      opacity.value = withTiming(1, {
        duration: DURATION,
      });
    } else {
      const config: WithSpringConfig = { damping: 12 };
      transYCamera.value = withDelay(0, withSpring(TRANSLATE_Y, config));
      transYManual.value = withDelay(DURATION / 2, withSpring(TRANSLATE_Y, config));
      transYAudio.value = withDelay(DURATION, withSpring(TRANSLATE_Y, config));
      opacity.value = withTiming(0, {
        duration: DURATION,
      });
    }

    isOpened.current = !isOpened.current;
  };

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Main Action Button */}
      <Pressable
        style={({ pressed }) => [
          styles.plusButton,
          {
            backgroundColor: theme.colors.secondary,
            transform: [{ scale: pressed ? 0.9 : 1 }],
          },
        ]}
        accessibilityLabel="Open action menu"
        accessibilityRole="button"
        onPress={handlePress}>
        <Animated.View style={rAddAnimateStyles}>
          <Ionicons name="add" size={36} color={theme.colors.onSecondary} />
        </Animated.View>
      </Pressable>
      <AnimatedPressable style={[styles.cameraButton, rCameraAnimateStyles]}>
        <FontAwesome name="camera" size={28} color={theme.colors.onSecondary} />
      </AnimatedPressable>
      <AnimatedPressable style={[styles.cameraButton, rManualAnimateStyles]}>
        <Feather name="type" size={26} color={theme.colors.onSecondary} />
      </AnimatedPressable>
      <AnimatedPressable style={[styles.cameraButton, rAudioAnimateStyles]}>
        <FontAwesome name="microphone" size={28} color={theme.colors.onSecondary} />
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 50,
    right: 30,
  },
  plusButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 1,
  },
  cameraButton: {
    width: 50,
    height: 50,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    position: "absolute",
  },
});
