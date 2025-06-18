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
  withRepeat,
  withSpring,
  WithSpringConfig,
  withTiming,
} from "react-native-reanimated";

const DURATION = 200;
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

  // Hold state for audio button
  const audioHolding = useSharedValue(0);
  const audioPulse = useSharedValue(0);

  // Listening indicator state
  const isListening = useSharedValue(0);
  const soundWave1 = useSharedValue(0);
  const soundWave2 = useSharedValue(0);

  // Background overlay state
  const backgroundOverlay = useSharedValue(0);

  const rCameraAnimateStyles = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: interpolate(transYCamera.value, [TRANSLATE_Y, 0], [TRANSLATE_Y * 0.5, 0]) },
        {
          translateX: interpolate(transYCamera.value, [TRANSLATE_Y, 0], [TRANSLATE_Y * 0.866, 0]),
        },
        { scale: interpolate(transYCamera.value, [TRANSLATE_Y, 0], [1, 0]) },
      ],
      backgroundColor: theme.colors.secondary,
      opacity: interpolate(cameraPressed.value, [0, 1], [1, 0.6]),
    };
  }, []);

  const rManualAnimateStyles = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: transYManual.value },
        { scale: interpolate(transYManual.value, [TRANSLATE_Y, 0], [1, 0]) },
      ],
      backgroundColor: theme.colors.secondary,
      opacity: interpolate(manualPressed.value, [0, 1], [1, 0.6]),
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

  // Listening indicator styles
  const rListeningIndicatorStyles = useAnimatedStyle(() => {
    return {
      opacity: isListening.value,
      transform: [{ scale: interpolate(isListening.value, [0, 1], [0.8, 1]) }],
    };
  }, []);

  const rSoundWave1Styles = useAnimatedStyle(() => {
    return {
      transform: [{ scaleY: interpolate(soundWave1.value, [0, 1], [0.3, 1]) }],
      opacity: interpolate(soundWave1.value, [0, 1], [0.4, 1]),
    };
  }, []);

  const rSoundWave2Styles = useAnimatedStyle(() => {
    return {
      transform: [{ scaleY: interpolate(soundWave2.value, [0, 1], [0.3, 1]) }],
      opacity: interpolate(soundWave2.value, [0, 1], [0.4, 1]),
    };
  }, []);

  // Background overlay styles
  const rBackgroundOverlayStyles = useAnimatedStyle(() => {
    return {
      opacity: backgroundOverlay.value,
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

      // Hide background overlay
      backgroundOverlay.value = withTiming(0, { duration: DURATION });
    } else {
      const config: WithSpringConfig = { damping: 12 };
      transYCamera.value = withDelay(0, withSpring(TRANSLATE_Y, config));
      transYManual.value = withDelay(DURATION / 2, withSpring(TRANSLATE_Y, config));
      transYAudio.value = withDelay(DURATION, withSpring(TRANSLATE_Y, config));
      opacity.value = withTiming(0, {
        duration: DURATION,
      });

      // Show background overlay
      backgroundOverlay.value = withTiming(0.9, { duration: DURATION });
    }

    isOpened.current = !isOpened.current;
  };

  if (!visible) {
    return null;
  }

  return (
    <>
      {/* Full Screen Background Overlay */}
      <Animated.View
        style={[
          styles.fullScreenOverlay,
          rBackgroundOverlayStyles,
          { backgroundColor: theme.colors.primaryContainer },
        ]}
      />

      {/* Listening Indicator - Centered on Screen */}
      <Animated.View style={[styles.listeningIndicator, rListeningIndicatorStyles]}>
        <View style={styles.soundWaveContainer}>
          <Animated.View
            style={[
              styles.soundWave,
              rSoundWave1Styles,
              { backgroundColor: theme.colors.secondary },
            ]}
          />
          <Animated.View
            style={[
              styles.soundWave,
              rSoundWave2Styles,
              { backgroundColor: theme.colors.secondary },
            ]}
          />
          <Animated.View
            style={[
              styles.soundWave,
              rSoundWave1Styles,
              { backgroundColor: theme.colors.secondary },
            ]}
          />
          <Animated.View
            style={[
              styles.soundWave,
              rSoundWave2Styles,
              { backgroundColor: theme.colors.secondary },
            ]}
          />
          <Animated.View
            style={[
              styles.soundWave,
              rSoundWave1Styles,
              { backgroundColor: theme.colors.secondary },
            ]}
          />
        </View>
        <Text style={[styles.listeningText, { color: theme.colors.secondary }]}>Listening...</Text>
      </Animated.View>

      <View style={styles.container}>
        {/* Main Action Button */}
        <Pressable
          style={({ pressed }) => [
            styles.menuButton,
            {
              backgroundColor: isOpened.current ? theme.colors.primary : theme.colors.secondary,
              transform: [{ scale: pressed ? 0.9 : 1 }],
            },
          ]}
          onPress={handlePress}>
          <Animated.View style={rMenuAnimateStyles}>
            <Ionicons name="add" size={46} color={theme.colors.onSecondary} />
          </Animated.View>
        </Pressable>
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
  fullScreenOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  container: {
    position: "absolute",
    width: "100%",
    bottom: 40,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  listeningIndicator: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 200,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  listeningText: {
    fontSize: 20,
    fontWeight: "600",
    margin: 20,
  },
  soundWaveContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  soundWave: {
    width: 6,
    height: 16,
    borderRadius: 999,
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
    zIndex: 1,
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
    zIndex: 1,
  },
});
