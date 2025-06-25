import React from "react";
import { View, StyleSheet } from "react-native";
import { useAppTheme } from "../theme/ThemeProvider";
import ActionMenu from "../components/ActionMenu";
import Header from "@/components/ui/Header";

export default function HomePage() {
  const { theme } = useAppTheme();

  const handlePhotoLibrary = () => {
    console.log("Photo Library action pressed");
  };

  const handleTakePhoto = () => {
    console.log("Take Photo action pressed");
  };

  const handleChooseFile = () => {
    console.log("Choose File action pressed");
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
      <Header title="Settings" variant="modal" />

      <ActionMenu
        onPhotoLibrary={handlePhotoLibrary}
        onTakePhoto={handleTakePhoto}
        onChooseFile={handleChooseFile}
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
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 160,
  },
  text: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 16,
  },
  previewBlock: {
    gap: 12,
  },
});
