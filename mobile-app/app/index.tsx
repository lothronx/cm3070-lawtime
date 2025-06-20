import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../theme/ThemeProvider";
import ActionMenu from "../components/ActionMenu";
import CameraOptionsModal from "../components/CameraOptionsModal";

export default function HomePage() {
  const { theme } = useAppTheme();
  const [cameraMenuVisible, setCameraMenuVisible] = useState(false);

  // Debug state changes
  React.useEffect(() => {
    console.log("Camera menu visible state:", cameraMenuVisible);
  }, [cameraMenuVisible]);

  // Camera menu functions
  const handlePhotoLibrary = () => {
    console.log("Photo Library selected");
    setCameraMenuVisible(false);
  };

  const handleTakePhoto = () => {
    console.log("Take Photo selected");
    setCameraMenuVisible(false);
  };

  const handleChooseFile = () => {
    console.log("Choose File selected");
    setCameraMenuVisible(false);
  };

  const handleFilePress = () => {
    console.log("File action pressed");
    // Show the camera options modal
    setCameraMenuVisible(true);
  };

  const handleMicrophonePressStart = () => {
    console.log("Microphone action pressed");
  };

  const handleMicrophonePressEnd = () => {
    console.log("Microphone action released");
  };

  const handleAddPress = () => {
    console.log("Add action pressed");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.text, { color: theme.colors.onBackground }]}>
        LawTime App is Working!
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Theme colors are loading correctly.
      </Text>

      {/* Camera Options Modal */}
      <CameraOptionsModal
        visible={cameraMenuVisible}
        onDismiss={() => setCameraMenuVisible(false)}
        onPhotoLibrary={handlePhotoLibrary}
        onTakePhoto={handleTakePhoto}
        onChooseFile={handleChooseFile}
      />

      <ActionMenu
        onCameraPress={handleFilePress}
        onAudioHoldStart={handleMicrophonePressStart}
        onAudioHoldEnd={handleMicrophonePressEnd}
        onManualPress={handleAddPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
  },
});
