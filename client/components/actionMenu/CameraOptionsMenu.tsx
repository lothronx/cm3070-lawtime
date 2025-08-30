import * as React from "react";
import { StyleSheet, Dimensions, Pressable } from "react-native";
import { Surface, List, Portal } from "react-native-paper";
import { useAppTheme, BORDER_RADIUS, SPACING } from "@/theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CameraOptionsMenuProps {
  visible: boolean;
  onDismiss: () => void;
  onPhotoLibrary: () => void;
  onTakePhoto: () => void;
}

/**
 * CameraOptionsMenu component using React Native Paper Menu
 *
 * A component that provides camera and file selection options
 * using React Native Paper's Menu component.
 */
export default function CameraOptionsMenu({
  visible,
  onDismiss,
  onPhotoLibrary,
  onTakePhoto,
}: CameraOptionsMenuProps) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get("window");

  if (!visible) return null;

  return (
    <Portal>
      {/* Menu positioned above camera button */}
      <AnimatedPressable
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={[styles.menuContainer, { bottom: insets.bottom + 190, left: width / 2 - 90 }]}
        onPress={() => {}} // Capture touches within menu area but do nothing
      >
        <Surface style={[styles.menuContent, { backgroundColor: theme.colors.surface }]}>
          <List.Item
            title="Photo Library"
            left={(props) => <List.Icon {...props} icon="image" />}
            onPress={() => {
              onPhotoLibrary();
              onDismiss();
            }}
            titleStyle={styles.menuItemTitle}
          />
          <List.Item
            title="Take Photo"
            left={(props) => <List.Icon {...props} icon="camera" />}
            onPress={() => {
              onTakePhoto();
              onDismiss();
            }}
            titleStyle={styles.menuItemTitle}
          />
        </Surface>
      </AnimatedPressable>
    </Portal>
  );
}

const styles = StyleSheet.create({
  menuContainer: {
    position: "absolute",
    zIndex: 10,
  },
  menuContent: {
    borderRadius: BORDER_RADIUS.md,
    elevation: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    paddingVertical: SPACING.xs,
  },
  menuItemTitle: {
    fontSize: 16,
  },
});
