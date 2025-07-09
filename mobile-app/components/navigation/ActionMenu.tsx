import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useAppTheme } from "@/theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome, Ionicons, Feather } from "@expo/vector-icons";
import { Snackbar } from "react-native-paper";
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
import FullScreenOverlay from "@/components/navigation/FullScreenOverlay";
import ListeningIndicator from "@/components/navigation/ListeningIndicator";
import CameraOptionsMenu from "@/components/navigation/CameraOptionsMenu";
import { useActionMenu } from "@/components/navigation/hooks/useActionMenu";

const DURATION = 300;
const TRANSLATE_Y = -80;
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ActionMenuProps {
  visible?: boolean;
}

export default function ActionMenu({ visible = true }: ActionMenuProps) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const {
    onPhotoLibrary,
    onTakePhoto,
    onChooseFile,
    onAudioHoldStart,
    onAudioHoldEnd,
    onManualPress,
    showTooShortWarning,
    dismissTooShortWarning,
  } = useActionMenu();

  const transYCamera = useSharedValue(0);
  const transYManual = useSharedValue(0);
  const transYAudio = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Press state shared values for dimming effect
  const cameraPressed = useSharedValue(0);
  const manualPressed = useSharedValue(0);
  const menuPressed = useSharedValue(0);

  // Single audio state: 0=idle, 1=recording
  const audioState = useSharedValue(0);

  // Menu open state
  const isOpenedShared = useSharedValue(0);

  // Menu state
  const [menuOpen, setMenuOpen] = useState(false);
  // Camera options menu state
  const [cameraMenuVisible, setCameraMenuVisible] = useState(false);

  const handleFullScreenOverlay = React.useCallback(() => {
    if (cameraMenuVisible) {
      setCameraMenuVisible(false);
    }
    // Only close menu if it's actually open
    if (menuOpen) {
      toggleMenu();
    }
  }, [cameraMenuVisible, menuOpen]);

  // Camera options handlers
  const handlePhotoLibrary = () => {
    toggleMenu();
    onPhotoLibrary();
  };

  const handleTakePhoto = () => {
    toggleMenu();
    onTakePhoto();
  };

  const handleChooseFile = () => {
    toggleMenu();
    onChooseFile();
  };

  const handleCameraPress = () => {
    if (!cameraMenuVisible) {
      setCameraMenuVisible(true);
    } else {
      setCameraMenuVisible(false);
    }
  };

  const handleManualPress = () => {
    if (cameraMenuVisible) {
      setCameraMenuVisible(false);
    }
    toggleMenu();
    onManualPress();
  };

  const handleAudioPressIn = () => {
    // Close camera menu if open
    if (cameraMenuVisible) {
      setCameraMenuVisible(false);
    }

    // Start recording - single state handles all functionality
    audioState.value = withTiming(1, { duration: 200 });

    onAudioHoldStart();
  };

  const handleAudioPressOut = () => {
    // Stop recording - single state handles all functionality
    audioState.value = withTiming(0, { duration: 200 });

    // Let parent handle validation and return success/failure
    const shouldCloseMenu = onAudioHoldEnd();
    
    // Only close menu if recording was successful
    if (shouldCloseMenu) {
      toggleMenu();
    }
  };

  const toggleMenu = () => {
    // Close camera menu if it's open
    if (cameraMenuVisible) {
      setCameraMenuVisible(false);
    }

    if (menuOpen) {
      setMenuOpen(false);
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

      // Hide background overlay and closing layer
      isOpenedShared.value = withTiming(0, { duration: DURATION });
    } else {
      setMenuOpen(true);
      const config: WithSpringConfig = { damping: 12 };
      transYManual.value = withDelay(0, withSpring(TRANSLATE_Y, config));
      transYCamera.value = withDelay(DURATION / 8, withSpring(TRANSLATE_Y, config));
      transYAudio.value = withDelay(DURATION / 4, withSpring(TRANSLATE_Y, config));
      opacity.value = withTiming(0, {
        duration: DURATION,
      });

      // Show background overlay and closing layer
      isOpenedShared.value = withTiming(0.9, { duration: DURATION });
    }
  };

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
      backgroundColor: theme.colors.error,
      opacity: interpolate(manualPressed.value, [0, 1], [1, 0.6]),
    };
  }, []);

  const rCameraAnimateStyles = useAnimatedStyle(() => {
    const menuScale = interpolate(transYCamera.value, [TRANSLATE_Y, 0], [1, 0]);
    const pressScale = interpolate(cameraPressed.value, [0, 1], [1, 0.9]);

    return {
      transform: [{ translateY: transYCamera.value }, { scale: menuScale * pressScale }],

      backgroundColor: theme.colors.error,
      opacity: interpolate(cameraPressed.value, [0, 1], [1, 0.6]),
    };
  }, []);

  const rAudioAnimateStyles = useAnimatedStyle(() => {
    const baseScale = interpolate(transYAudio.value, [TRANSLATE_Y, 0], [1, 0]);
    const recordingScale = interpolate(audioState.value, [0, 1], [1, 1.1]);

    return {
      transform: [
        { translateY: interpolate(transYAudio.value, [TRANSLATE_Y, 0], [TRANSLATE_Y * 0.5, 0]) },
        {
          translateX: interpolate(transYAudio.value, [TRANSLATE_Y, 0], [-TRANSLATE_Y * 0.866, 0]),
        },
        { scale: baseScale * recordingScale },
      ],
      backgroundColor: audioState.value > 0.5 ? theme.colors.primary : theme.colors.error,
      opacity: interpolate(audioState.value, [0, 1], [1, 0.9]),
    };
  }, [theme.colors.primary, theme.colors.error]);

  const rMenuAnimateStyles = useAnimatedStyle(() => {
    return {
      transform: [{ rotateZ: `${interpolate(opacity.value, [0, 1], [45, 0])}deg` }],
    };
  }, []);

  const rMenuButtonStyles = useAnimatedStyle(() => {
    const pressScale = interpolate(menuPressed.value, [0, 1], [1, 0.9]);
    return {
      backgroundColor: isOpenedShared.value > 0 ? theme.colors.primary : theme.colors.error,
      transform: [{ scale: pressScale }],
    };
  }, [theme.colors.primary, theme.colors.error]);

  if (!visible) {
    return null;
  }

  return (
    <>
      {/* Audio Too Short Snackbar */}
      <View style={styles.snackbarContainer}>
        <Snackbar
          visible={showTooShortWarning}
          onDismiss={dismissTooShortWarning}
          duration={2000}
          style={{ backgroundColor: theme.colors.error }}>
          Audio too short to process
        </Snackbar>
      </View>

      {/* Full Screen Background overlay */}
      <FullScreenOverlay opacityValue={isOpenedShared} onPress={handleFullScreenOverlay} />

      {/* Listening Indicator */}
      <ListeningIndicator isListening={audioState} />

      {/* Camera Options Menu */}
      <CameraOptionsMenu
        visible={cameraMenuVisible && menuOpen}
        onDismiss={() => setCameraMenuVisible(false)}
        onPhotoLibrary={handlePhotoLibrary}
        onTakePhoto={handleTakePhoto}
        onChooseFile={handleChooseFile}
      />

      <View style={[styles.container, { bottom: insets.bottom + 40 }]}>
        {/* Main Action Button */}
        <AnimatedPressable
          style={[styles.menuButton, rMenuButtonStyles, { transform: [{ scale: 1 }] }]}
          onPress={toggleMenu}
          onPressIn={() => {
            menuPressed.value = withTiming(1, { duration: 100 });
          }}
          onPressOut={() => {
            menuPressed.value = withTiming(0, { duration: 100 });
          }}>
          <Animated.View style={rMenuAnimateStyles}>
            <Ionicons name="add" size={46} color={theme.colors.onError} />
          </Animated.View>
        </AnimatedPressable>

        {/* Manual Button */}
        <AnimatedPressable
          style={[styles.actionButton, rManualAnimateStyles]}
          onPress={handleManualPress}
          onPressIn={() => {
            manualPressed.value = withTiming(1, { duration: 100 });
          }}
          onPressOut={() => {
            manualPressed.value = withTiming(0, { duration: 100 });
          }}>
          <Feather name="type" size={26} color={theme.colors.onError} />
        </AnimatedPressable>

        {/* Camera Button */}
        <AnimatedPressable
          style={[styles.actionButton, rCameraAnimateStyles]}
          onPress={handleCameraPress}
          onPressIn={() => {
            cameraPressed.value = withTiming(1, { duration: 100 });
          }}
          onPressOut={() => {
            cameraPressed.value = withTiming(0, { duration: 100 });
          }}>
          <FontAwesome name="camera" size={26} color={theme.colors.onError} />
        </AnimatedPressable>

        {/* Audio Button */}
        <AnimatedPressable
          style={[styles.actionButton, rAudioAnimateStyles]}
          onPressIn={handleAudioPressIn}
          onPressOut={handleAudioPressOut}>
          <FontAwesome name="microphone" size={26} color={theme.colors.onError} />
        </AnimatedPressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  snackbarContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 15,
    pointerEvents: "box-none",
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
