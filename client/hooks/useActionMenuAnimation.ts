import { useState, useCallback } from "react";
import {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
  interpolate,
  Easing,
  WithSpringConfig,
} from "react-native-reanimated";
import { useAppTheme } from "@/theme/ThemeProvider";

const DURATION = 300;
const TRANSLATE_Y = -80;

export function useActionMenuAnimation() {
  const { theme } = useAppTheme();

  // Animation shared values
  const transYCamera = useSharedValue(0);
  const transYManual = useSharedValue(0);
  const transYAudio = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Action states
  const menuState = useSharedValue(0);
  const cameraState = useSharedValue(0);
  const manualState = useSharedValue(0);
  const audioState = useSharedValue(0);
  const audioRecordingState = useSharedValue(0); // 0=idle, 1=recording

  // Camera options menu state
  const [cameraMenuVisible, setCameraMenuVisible] = useState(false);
  // Menu open React state (synced with menuState shared value)
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = useCallback(() => {
    // Close camera menu if it's open
    if (cameraMenuVisible) {
      setCameraMenuVisible(false);
    }

    if (isMenuOpen) {
      // Closing menu
      setIsMenuOpen(false);
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

      // Hide background overlay and set menu to closed
      menuState.value = withTiming(0, { duration: DURATION });
    } else {
      // Opening menu
      setIsMenuOpen(true);
      const config: WithSpringConfig = { damping: 12 };
      transYManual.value = withDelay(0, withSpring(TRANSLATE_Y, config));
      transYCamera.value = withDelay(DURATION / 8, withSpring(TRANSLATE_Y, config));
      transYAudio.value = withDelay(DURATION / 4, withSpring(TRANSLATE_Y, config));
      opacity.value = withTiming(0, {
        duration: DURATION,
      });

      // Show background overlay and set menu to open
      menuState.value = withTiming(0.9, { duration: DURATION });
    }
  }, [cameraMenuVisible, isMenuOpen, transYManual, transYCamera, transYAudio, opacity, menuState]);

  // Animation handlers
  const animateAudioPressIn = useCallback(() => {
    // Press feedback (immediate)
    audioState.value = withTiming(1, { duration: 100 });
    // Start recording - single state handles all functionality
    audioRecordingState.value = withTiming(1, { duration: 200 });
  }, [audioState, audioRecordingState]);

  const animateAudioPressOut = useCallback(() => {
    // Release press feedback (immediate)
    audioState.value = withTiming(0, { duration: 100 });
    // Stop recording - single state handles all functionality
    audioRecordingState.value = withTiming(0, { duration: 200 });
  }, [audioState, audioRecordingState]);

  const animateManualPressIn = useCallback(() => {
    manualState.value = withTiming(1, { duration: 100 });
  }, [manualState]);

  const animateManualPressOut = useCallback(() => {
    manualState.value = withTiming(0, { duration: 100 });
  }, [manualState]);

  const animateCameraPressIn = useCallback(() => {
    cameraState.value = withTiming(1, { duration: 100 });
  }, [cameraState]);

  const animateCameraPressOut = useCallback(() => {
    cameraState.value = withTiming(0, { duration: 100 });
  }, [cameraState]);

  // Animated styles
  const rManualAnimateStyles = useAnimatedStyle(() => {
    const menuScale = interpolate(transYManual.value, [TRANSLATE_Y, 0], [1, 0]);
    const pressScale = interpolate(manualState.value, [0, 1], [1, 0.9]);

    return {
      transform: [
        { translateY: interpolate(transYManual.value, [TRANSLATE_Y, 0], [TRANSLATE_Y * 0.5, 0]) },
        {
          translateX: interpolate(transYManual.value, [TRANSLATE_Y, 0], [TRANSLATE_Y * 0.866, 0]),
        },
        { scale: menuScale * pressScale },
      ],
      backgroundColor:
        audioRecordingState.value > 0.5 ? theme.colors.onSurfaceDisabled : theme.colors.error,
      opacity: interpolate(manualState.value, [0, 1], [1, 0.6]),
    };
  }, [theme.colors.error, theme.colors.onSurfaceDisabled]);

  const rCameraAnimateStyles = useAnimatedStyle(() => {
    const menuScale = interpolate(transYCamera.value, [TRANSLATE_Y, 0], [1, 0]);
    const pressScale = interpolate(cameraState.value, [0, 1], [1, 0.9]);

    return {
      transform: [{ translateY: transYCamera.value }, { scale: menuScale * pressScale }],
      backgroundColor:
        audioRecordingState.value > 0.5 ? theme.colors.onSurfaceDisabled : theme.colors.error,
      opacity: interpolate(cameraState.value, [0, 1], [1, 0.6]),
    };
  }, [theme.colors.error, theme.colors.onSurfaceDisabled]);

  const rAudioAnimateStyles = useAnimatedStyle(() => {
    const baseScale = interpolate(transYAudio.value, [TRANSLATE_Y, 0], [1, 0]);
    const recordingScale = interpolate(audioRecordingState.value, [0, 1], [1, 1.1]);
    const pressScale = interpolate(audioState.value, [0, 1], [1, 0.9]);

    return {
      transform: [
        { translateY: interpolate(transYAudio.value, [TRANSLATE_Y, 0], [TRANSLATE_Y * 0.5, 0]) },
        {
          translateX: interpolate(transYAudio.value, [TRANSLATE_Y, 0], [-TRANSLATE_Y * 0.866, 0]),
        },
        { scale: baseScale * recordingScale * pressScale },
      ],
      backgroundColor: theme.colors.error,
      opacity: interpolate(audioState.value, [0, 1], [1, 0.6]), // Press feedback opacity
    };
  }, [theme.colors.error]);

  const rMenuAnimateStyles = useAnimatedStyle(() => {
    return {
      transform: [{ rotateZ: `${interpolate(opacity.value, [0, 1], [45, 0])}deg` }],
    };
  }, []);

  const rMenuButtonStyles = useAnimatedStyle(() => {
    const pressScale = interpolate(menuState.value, [0, 0.1, 1], [1, 0.9, 1]); // Press feedback during transition
    return {
      backgroundColor: menuState.value > 0.1 ? theme.colors.primary : theme.colors.error,
      transform: [{ scale: pressScale }],
    };
  }, [theme.colors.primary, theme.colors.error]);

  return {
    // State
    cameraMenuVisible,
    setCameraMenuVisible,
    isMenuOpen,
    menuState,
    audioRecordingState,
    
    // Functions
    toggleMenu,
    animateAudioPressIn,
    animateAudioPressOut,
    animateManualPressIn,
    animateManualPressOut,
    animateCameraPressIn,
    animateCameraPressOut,
    
    // Animated styles
    rManualAnimateStyles,
    rCameraAnimateStyles,
    rAudioAnimateStyles,
    rMenuAnimateStyles,
    rMenuButtonStyles,
  };
}