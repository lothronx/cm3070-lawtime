import { useState, useCallback, useEffect } from "react";
import {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
  interpolate,
  Easing,
  WithSpringConfig,
  withRepeat,
} from "react-native-reanimated";
import { useAppTheme } from "@/theme/ThemeProvider";

const DURATION = 300;
const TRANSLATE_Y = -80;

export function useActionMenuAnimation(isRecording: boolean = false) {
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

  // Recording animation states
  const recordingPulse = useSharedValue(0);
  const recordingColorProgress = useSharedValue(0);

  // Camera options menu state
  const [cameraMenuVisible, setCameraMenuVisible] = useState(false);
  // Menu open React state (synced with menuState shared value)
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Start/stop recording animation based on isRecording prop
  useEffect(() => {
    if (isRecording) {
      // Start pulsing animation
      recordingPulse.value = withRepeat(
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1, // Infinite repeat
        true // Reverse (creates pulse effect)
      );

      // Animate color to recording state
      recordingColorProgress.value = withTiming(1, { duration: 200 });
    } else {
      // Stop pulsing animation
      recordingPulse.value = withTiming(0, { duration: 200 });

      // Animate color back to normal
      recordingColorProgress.value = withTiming(0, { duration: 200 });
    }
  }, [isRecording, recordingPulse, recordingColorProgress]);

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
      const config: WithSpringConfig = {
        damping: 12,
        mass: 1,
        stiffness: 100,
      };
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
  }, [audioState]);

  const animateAudioPressOut = useCallback(() => {
    // Release press feedback (immediate)
    audioState.value = withTiming(0, { duration: 100 });
  }, [audioState]);

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
      backgroundColor: isRecording ? theme.colors.onSurfaceDisabled : theme.colors.error,
      opacity: interpolate(manualState.value, [0, 1], [1, 0.6]),
    };
  }, [theme.colors.error, theme.colors.onSurfaceDisabled, isRecording]);

  const rCameraAnimateStyles = useAnimatedStyle(() => {
    const menuScale = interpolate(transYCamera.value, [TRANSLATE_Y, 0], [1, 0]);
    const pressScale = interpolate(cameraState.value, [0, 1], [1, 0.9]);

    return {
      transform: [{ translateY: transYCamera.value }, { scale: menuScale * pressScale }],
      backgroundColor: isRecording ? theme.colors.onSurfaceDisabled : theme.colors.error,
      opacity: interpolate(cameraState.value, [0, 1], [1, 0.6]),
    };
  }, [theme.colors.error, theme.colors.onSurfaceDisabled, isRecording]);

  const rAudioAnimateStyles = useAnimatedStyle(() => {
    const baseScale = interpolate(transYAudio.value, [TRANSLATE_Y, 0], [1, 0]);
    const pressScale = interpolate(audioState.value, [0, 1], [1, 0.9]);

    // Recording pulse effect - creates breathing animation
    const pulseScale = interpolate(recordingPulse.value, [0, 1], [1.1, 1.25]);
    const finalScale = isRecording ? pulseScale : 1.0;

    // Color interpolation from error (red) to a darker red when recording
    const recordingColor = `rgba(220, 38, 38, ${interpolate(recordingColorProgress.value, [0, 1], [1, 0.9])})`;
    const normalColor = theme.colors.error;

    return {
      transform: [
        { translateY: interpolate(transYAudio.value, [TRANSLATE_Y, 0], [TRANSLATE_Y * 0.5, 0]) },
        {
          translateX: interpolate(transYAudio.value, [TRANSLATE_Y, 0], [-TRANSLATE_Y * 0.866, 0]),
        },
        { scale: baseScale * finalScale * pressScale },
      ],
      backgroundColor: isRecording ? recordingColor : normalColor,
      opacity: interpolate(audioState.value, [0, 1], [1, 0.6]),
    };
  }, [theme.colors.error, isRecording]);

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