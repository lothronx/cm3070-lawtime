import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { interpolate, useAnimatedStyle, SharedValue } from "react-native-reanimated";
import { useAppTheme } from "@/theme/ThemeProvider";

interface ListeningIndicatorProps {
  isListening: SharedValue<number>;
  soundWave1: SharedValue<number>;
  soundWave2: SharedValue<number>;
}

export default function ListeningIndicator({
  isListening,
  soundWave1,
  soundWave2,
}: ListeningIndicatorProps) {
  const { theme } = useAppTheme();

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
          style={[styles.soundWave, rSoundWave1Styles, { backgroundColor: theme.colors.secondary }]}
        />
        <Animated.View
          style={[styles.soundWave, rSoundWave2Styles, { backgroundColor: theme.colors.secondary }]}
        />
        <Animated.View
          style={[styles.soundWave, rSoundWave1Styles, { backgroundColor: theme.colors.secondary }]}
        />
        <Animated.View
          style={[styles.soundWave, rSoundWave2Styles, { backgroundColor: theme.colors.secondary }]}
        />
        <Animated.View
          style={[styles.soundWave, rSoundWave1Styles, { backgroundColor: theme.colors.secondary }]}
        />
      </View>
      <Text style={[styles.listeningText, { color: theme.colors.secondary }]}>Listening...</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
});
