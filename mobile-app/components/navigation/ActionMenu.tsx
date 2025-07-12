import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useAppTheme } from "@/theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome, Ionicons, Feather } from "@expo/vector-icons";
import { Snackbar } from "react-native-paper";
import Animated from "react-native-reanimated";
import FullScreenOverlay from "@/components/navigation/FullScreenOverlay";
import ListeningIndicator from "@/components/navigation/ListeningIndicator";
import CameraOptionsMenu from "@/components/navigation/CameraOptionsMenu";
import { useActionMenu } from "@/hooks/useActionMenu";
import { useActionMenuAnimation } from "@/hooks/useActionMenuAnimation";

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

  const {
    cameraMenuVisible,
    setCameraMenuVisible,
    isMenuOpen,
    menuState,
    audioRecordingState,
    toggleMenu,
    animateAudioPressIn,
    animateAudioPressOut,
    animateManualPressIn,
    animateManualPressOut,
    animateCameraPressIn,
    animateCameraPressOut,
    rManualAnimateStyles,
    rCameraAnimateStyles,
    rAudioAnimateStyles,
    rMenuAnimateStyles,
    rMenuButtonStyles,
  } = useActionMenuAnimation();

  const handleFullScreenOverlay = React.useCallback(() => {
    if (cameraMenuVisible) {
      setCameraMenuVisible(false);
      // Close main menu when camera menu is dismissed by tapping overlay
      if (isMenuOpen) {
        toggleMenu();
      }
    } else if (isMenuOpen) {
      // Only close main menu if camera menu is not open
      toggleMenu();
    }
  }, [cameraMenuVisible, isMenuOpen, toggleMenu]);

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
    // Close camera menu if open (but don't close main menu)
    if (cameraMenuVisible) {
      setCameraMenuVisible(false);
    }

    animateAudioPressIn();
    onAudioHoldStart();
  };

  const handleAudioPressOut = () => {
    animateAudioPressOut();

    // Let parent handle validation and return success/failure
    const shouldCloseMenu = onAudioHoldEnd();

    // Only close menu if recording was successful
    if (shouldCloseMenu) {
      toggleMenu();
    }
  };

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
      <FullScreenOverlay opacityValue={menuState} onPress={handleFullScreenOverlay} />

      {/* Listening Indicator */}
      <ListeningIndicator isListening={audioRecordingState} />

      {/* Camera Options Menu */}
      <CameraOptionsMenu
        visible={cameraMenuVisible && isMenuOpen}
        onDismiss={() => setCameraMenuVisible(false)}
        onPhotoLibrary={handlePhotoLibrary}
        onTakePhoto={handleTakePhoto}
        onChooseFile={handleChooseFile}
      />

      <View style={[styles.container, { bottom: insets.bottom + 23 }]}>
        {/* Main Action Button */}
        <AnimatedPressable style={[styles.menuButton, rMenuButtonStyles]} onPress={toggleMenu}>
          <Animated.View style={rMenuAnimateStyles}>
            <Ionicons name="add" size={46} color={theme.colors.onError} />
          </Animated.View>
        </AnimatedPressable>

        {/* Manual Button */}
        <AnimatedPressable
          style={[styles.actionButton, rManualAnimateStyles]}
          onPress={handleManualPress}
          onPressIn={animateManualPressIn}
          onPressOut={animateManualPressOut}>
          <Feather name="type" size={26} color={theme.colors.onError} />
        </AnimatedPressable>

        {/* Camera Button */}
        <AnimatedPressable
          style={[styles.actionButton, rCameraAnimateStyles]}
          onPress={handleCameraPress}
          onPressIn={animateCameraPressIn}
          onPressOut={animateCameraPressOut}>
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
    zIndex: 999,
    pointerEvents: "box-none",
  },
  menuButton: {
    width: 70,
    height: 70,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 5,
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
    zIndex: 4,
  },
});
