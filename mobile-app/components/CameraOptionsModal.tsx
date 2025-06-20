import * as React from "react";
import { StyleSheet } from "react-native";
import { List, Surface } from "react-native-paper";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";

interface CameraOptionsModalProps {
  visible: boolean;
  onDismiss: () => void;
  onPhotoLibrary: () => void;
  onTakePhoto: () => void;
  onChooseFile: () => void;
}

/**
 * CameraOptionsModal component
 *
 * A component that provides camera and file selection options.
 * It is rendered directly without using Modal component to prevent
 * blocking interaction with underlying components.
 */
export default function CameraOptionsModal({
  visible,
  onDismiss,
  onPhotoLibrary,
  onTakePhoto,
  onChooseFile,
}: CameraOptionsModalProps) {
  // Use console.log to debug visibility
  React.useEffect(() => {
    if (visible) {
      console.log("CameraOptionsModal is now visible");
    }
  }, [visible]);

  // Animated styles for fade in/out
  const animatedStyles = useAnimatedStyle(() => {
    return {
      opacity: withTiming(visible ? 1 : 0, { duration: 200 }),
      transform: [
        {
          translateY: withTiming(visible ? 0 : 20, { duration: 200 }),
        },
      ],
      // When not visible, don't capture touches
      pointerEvents: visible ? "auto" : "none",
    };
  }, [visible]);

  // If not visible at all, don't render
  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, animatedStyles]}>
      <Surface style={styles.modalView}>
        <List.Item
          title="Photo Library"
          left={(props) => <List.Icon {...props} icon="image" />}
          onPress={() => {
            onPhotoLibrary();
          }}
          style={styles.listItem}
        />
        <List.Item
          title="Take Photo"
          left={(props) => <List.Icon {...props} icon="camera" />}
          onPress={() => {
            onTakePhoto();
          }}
          style={styles.listItem}
        />
        <List.Item
          title="Choose File"
          left={(props) => <List.Icon {...props} icon="file" />}
          onPress={() => {
            onChooseFile();
          }}
          style={styles.listItem}
        />
      </Surface>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 200,
    alignItems: "center",
    zIndex: 3,
  },
  modalView: {
    borderRadius: 8,
    overflow: "hidden",
  },
  listItem: {
    paddingVertical: 8,
  },
});
