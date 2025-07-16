import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  SharedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  useAnimatedReaction,
} from "react-native-reanimated";
import { useAppTheme } from "@/theme/ThemeProvider";

interface ListeningIndicatorProps {
  isListening: SharedValue<number>;
}

export default function ListeningIndicator({ isListening }: ListeningIndicatorProps) {
  const { theme } = useAppTheme();

  // Internal sound wave animation shared values
  const soundWave1 = useSharedValue(0);
  const soundWave2 = useSharedValue(0);

  // Start/stop sound wave animations based on isListening value
  useAnimatedReaction(
    () => isListening.value,
    (current, previous) => {
      if (current > 0.5 && (previous === null || previous <= 0.5)) {
        // Start sound wave animations
        soundWave1.value = withRepeat(withTiming(1, { duration: 600 }), -1, true);
        soundWave2.value = withDelay(300, withRepeat(withTiming(1, { duration: 600 }), -1, true));
      } else if (current <= 0.5 && (previous === null || previous > 0.5)) {
        // Stop sound wave animations
        soundWave1.value = withTiming(0, { duration: 200 });
        soundWave2.value = withTiming(0, { duration: 200 });
      }
    },
    [isListening]
  );

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

  return (
    <Animated.View style={[styles.listeningIndicator, rListeningIndicatorStyles]}>
      <View style={styles.soundWaveContainer}>
        <Animated.View
          style={[styles.soundWave, rSoundWave1Styles, { backgroundColor: theme.colors.primary }]}
        />
        <Animated.View
          style={[styles.soundWave, rSoundWave2Styles, { backgroundColor: theme.colors.primary }]}
        />
        <Animated.View
          style={[styles.soundWave, rSoundWave1Styles, { backgroundColor: theme.colors.primary }]}
        />
        <Animated.View
          style={[styles.soundWave, rSoundWave2Styles, { backgroundColor: theme.colors.primary }]}
        />
        <Animated.View
          style={[styles.soundWave, rSoundWave1Styles, { backgroundColor: theme.colors.primary }]}
        />
      </View>
      <Text style={[styles.listeningText, { color: theme.colors.primary }]}>Listening...</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  listeningIndicator: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
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
});
