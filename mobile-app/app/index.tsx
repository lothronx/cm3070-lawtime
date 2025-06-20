import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../theme/ThemeProvider";
import ActionMenu from "../components/ActionMenu";

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
      <Text style={[styles.text, { color: theme.colors.onBackground }]}>
        LawTime App is Working!
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Theme colors are loading correctly.
      </Text>

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
