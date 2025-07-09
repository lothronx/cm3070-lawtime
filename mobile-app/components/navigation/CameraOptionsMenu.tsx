import * as React from "react";
import { StyleSheet, Dimensions } from "react-native";
import { Menu } from "react-native-paper";
import { useAppTheme, BORDER_RADIUS } from "@/theme/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CameraOptionsMenuProps {
  visible: boolean;
  onDismiss: () => void;
  onPhotoLibrary: () => void;
  onTakePhoto: () => void;
  onChooseFile: () => void;
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
  onChooseFile,
}: CameraOptionsMenuProps) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get("window");

  const anchor = {
    x: (width - 160) / 2,
    y: height - insets.bottom - 350,
  };

  return (
    <Menu
      visible={visible}
      onDismiss={onDismiss}
      anchor={anchor}
      contentStyle={[styles.menuContent, { backgroundColor: theme.colors.surface }]}>
      <Menu.Item
        onPress={() => {
          onPhotoLibrary();
          onDismiss();
        }}
        title="Photo Library"
        leadingIcon="image"
        titleStyle={styles.menuItemTitle}
      />
      <Menu.Item
        onPress={() => {
          onTakePhoto();
          onDismiss();
        }}
        title="Take Photo"
        leadingIcon="camera"
        titleStyle={styles.menuItemTitle}
      />
      <Menu.Item
        onPress={() => {
          onChooseFile();
          onDismiss();
        }}
        title="Choose File"
        leadingIcon="file"
        titleStyle={styles.menuItemTitle}
      />
    </Menu>
  );
}

const styles = StyleSheet.create({
  menuContent: {
    borderRadius: BORDER_RADIUS.md,
    elevation: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuItemTitle: {
    fontSize: 16,
  },
});
