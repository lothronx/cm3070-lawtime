import React, { useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useAppTheme } from "@/theme/ThemeProvider";
import { FontAwesome, Ionicons, Feather } from "@expo/vector-icons";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  WithSpringConfig,
  withTiming,
} from "react-native-reanimated";
import FullScreenBackgroundOverlay from "@/components/FullScreenBackgroundOverlay";
import TapToCloseOverlay from "@/components/TapToCloseOverlay";
import ListeningIndicator from "@/components/ListeningIndicator";

const DURATION = 300;
const TRANSLATE_Y = -80;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ActionMenuProps {
  onCameraPress?: () => void;
  onAudioHoldStart?: () => void;
  onAudioHoldEnd?: () => void;
  onManualPress?: () => void;
  visible?: boolean;
}

export default function ActionMenu({
  onCameraPress,
  onAudioHoldStart,
  onAudioHoldEnd,
  onManualPress,
  visible = true,
}: ActionMenuProps) {
  const { theme } = useAppTheme();

  const isOpened = useRef(false);
  const transYCamera = useSharedValue(0);
  const transYManual = useSharedValue(0);
  const transYAudio = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Press state shared values for dimming effect
  const cameraPressed = useSharedValue(0);
  const manualPressed = useSharedValue(0);
  const audioPressed = useSharedValue(0);
  const menuPressed = useSharedValue(0);

  // Hold state for audio button
  const audioHolding = useSharedValue(0);
  const audioPulse = useSharedValue(0);

  // Listening indicator state
  const isListening = useSharedValue(0);
  const soundWave1 = useSharedValue(0);
  const soundWave2 = useSharedValue(0);

  // Background overlay state
  const backgroundOverlay = useSharedValue(0);
  const isOpenedShared = useSharedValue(0);

  const rManualAnimateStyles = useAnimatedStyle(() => {
    const menuScale = interpolate(transYManual.value, [TRANSLATE_Y, 0], [1, 0]);
    const pressScale = interpolate(manualPressed.value, [0, 1], [1, 0.9]);

    return {
      transform: [
        { translateY: interpolate(transYManual.value, [TRANSLATE_Y, 0], [TRANSLATE_Y * 0.5, 0]) },
        {
          translateX: interpolate(transYManual.value, [TRANSLATE_Y, 0], [TRANSLATE_Y * 0.866, 0]),
        },
        { scale: menuScale * pressScale },
      ],
      backgroundColor: theme.colors.secondary,
      opacity: interpolate(manualPressed.value, [0, 1], [1, 0.6]),
    };
  }, []);

  const rCameraAnimateStyles = useAnimatedStyle(() => {
    const menuScale = interpolate(transYCamera.value, [TRANSLATE_Y, 0], [1, 0]);
    const pressScale = interpolate(cameraPressed.value, [0, 1], [1, 0.9]);

    return {
      transform: [{ translateY: transYCamera.value }, { scale: menuScale * pressScale }],

      backgroundColor: theme.colors.secondary,
      opacity: interpolate(cameraPressed.value, [0, 1], [1, 0.6]),
    };
  }, []);

  const rAudioAnimateStyles = useAnimatedStyle(() => {
    const baseScale = interpolate(transYAudio.value, [TRANSLATE_Y, 0], [1, 0]);
    const holdScale = interpolate(audioHolding.value, [0, 1], [1, 1.2]);
    const pulseScale = interpolate(audioPulse.value, [0, 1], [1, 1.1]);

    return {
      transform: [
        { translateY: interpolate(transYAudio.value, [TRANSLATE_Y, 0], [TRANSLATE_Y * 0.5, 0]) },
        { translateX: interpolate(transYAudio.value, [TRANSLATE_Y, 0], [-TRANSLATE_Y * 0.866, 0]) },
        { scale: baseScale * holdScale * pulseScale },
      ],
      backgroundColor: audioHolding.value > 0.5 ? theme.colors.primary : theme.colors.secondary,
      opacity: interpolate(audioPressed.value, [0, 1], [1, 0.6]),
    };
  }, []);

  const rMenuAnimateStyles = useAnimatedStyle(() => {
    return {
      transform: [{ rotateZ: interpolate(opacity.value, [0, 1], [45, 0]).toString() + "deg" }],
    };
  }, []);

  const rMenuButtonStyles = useAnimatedStyle(() => {
    const pressScale = interpolate(menuPressed.value, [0, 1], [1, 0.9]);
    return {
      backgroundColor: isOpenedShared.value > 0 ? theme.colors.primary : theme.colors.secondary,
      transform: [{ scale: pressScale }],
    };
  }, []);

  const handlePress = () => {
    if (isOpened.current) {
      transYManual.value = withDelay(
        DURATION / 4,
        withTiming(0, { duration: DURATION, easing: Easing.bezierFn(0.36, 0, 0.66, -0.56) })
      );
      transYCamera.value = withDelay(
        DURATION / 8,
        withTiming(0, { duration: DURATION, easing: Easing.bezierFn(0.36, 0, 0.66, -0.56) })
      );
      transYAudio.value = withDelay(
        0,
        withTiming(0, { duration: DURATION, easing: Easing.bezierFn(0.36, 0, 0.66, -0.56) })
      );
      opacity.value = withTiming(1, {
        duration: DURATION,
      });

      // Hide background overlay
      backgroundOverlay.value = withTiming(0, { duration: DURATION });
      isOpenedShared.value = withTiming(0, { duration: DURATION });
    } else {
      const config: WithSpringConfig = { damping: 12 };
      transYManual.value = withDelay(0, withSpring(TRANSLATE_Y, config));
      transYCamera.value = withDelay(DURATION / 8, withSpring(TRANSLATE_Y, config));
      transYAudio.value = withDelay(DURATION / 4, withSpring(TRANSLATE_Y, config));
      opacity.value = withTiming(0, {
        duration: DURATION,
      });

      // Show background overlay
      backgroundOverlay.value = withTiming(0.9, { duration: DURATION });
      isOpenedShared.value = withTiming(1, { duration: DURATION });
    }

    isOpened.current = !isOpened.current;
  };

  if (!visible) {
    return null;
  }

  return (
    <>
      {/* Full Screen Background Overlay */}
      <FullScreenBackgroundOverlay backgroundOverlay={backgroundOverlay} />

      {/* Tap to Close Overlay - Only visible when menu is opened */}
      <TapToCloseOverlay
        isOpenedShared={isOpenedShared}
        onPress={() => {
          if (isOpened.current) {
            handlePress();
          }
        }}
      />

      {/* Listening Indicator - Centered on Screen */}
      <ListeningIndicator
        isListening={isListening}
        soundWave1={soundWave1}
        soundWave2={soundWave2}
      />

      <View style={styles.container}>
        {/* Main Action Button */}
        <AnimatedPressable
          style={[styles.menuButton, rMenuButtonStyles, { transform: [{ scale: 1 }] }]}
          onPress={handlePress}>
          <Animated.View style={rMenuAnimateStyles}>
            <Ionicons name="add" size={46} color={theme.colors.onSecondary} />
          </Animated.View>
        </AnimatedPressable>
        <AnimatedPressable
          style={[styles.actionButton, rCameraAnimateStyles]}
          onPress={onCameraPress}
          onPressIn={() => {
            cameraPressed.value = withTiming(1, { duration: 100 });
          }}
          onPressOut={() => {
            cameraPressed.value = withTiming(0, { duration: 100 });
          }}>
          <FontAwesome name="camera" size={26} color={theme.colors.onSecondary} />
        </AnimatedPressable>
        <AnimatedPressable
          style={[styles.actionButton, rManualAnimateStyles]}
          onPress={onManualPress}
          onPressIn={() => {
            manualPressed.value = withTiming(1, { duration: 100 });
          }}
          onPressOut={() => {
            manualPressed.value = withTiming(0, { duration: 100 });
          }}>
          <Feather name="type" size={26} color={theme.colors.onSecondary} />
        </AnimatedPressable>
        <AnimatedPressable
          style={[styles.actionButton, rAudioAnimateStyles]}
          onPressIn={() => {
            audioPressed.value = withTiming(1, { duration: 100 });
            audioHolding.value = withTiming(1, { duration: 200 });
            audioPulse.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);

            // Start listening indicator
            isListening.value = withTiming(1, { duration: 300 });

            // Start sound wave animations with different delays and durations
            soundWave1.value = withRepeat(withTiming(1, { duration: 600 }), -1, true);
            soundWave2.value = withDelay(
              300,
              withRepeat(withTiming(1, { duration: 600 }), -1, true)
            );

            onAudioHoldStart?.();
          }}
          onPressOut={() => {
            audioPressed.value = withTiming(0, { duration: 100 });
            audioHolding.value = withTiming(0, { duration: 200 });
            audioPulse.value = withTiming(0, { duration: 100 });

            // Stop listening indicator
            isListening.value = withTiming(0, { duration: 300 });

            // Stop sound wave animations
            soundWave1.value = withTiming(0, { duration: 200 });
            soundWave2.value = withTiming(0, { duration: 200 });

            onAudioHoldEnd?.();
          }}>
          <FontAwesome name="microphone" size={26} color={theme.colors.onSecondary} />
        </AnimatedPressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: "100%",
    bottom: 40,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  menuButton: {
    width: 70,
    height: 70,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 4,
  },
  actionButton: {
    bottom: 10,
    width: 50,
    height: 50,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    position: "absolute",
    zIndex: 3,
  },
});
