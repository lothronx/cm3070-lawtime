import React from "react";
import { StyleSheet, Keyboard } from "react-native";
import { Button } from "react-native-paper";
import { BORDER_RADIUS } from "@/theme/ThemeProvider";

interface SaveButtonProps {
  onPress: () => void;
  loading?: boolean;
  title?: string;
}

const SaveButton: React.FC<SaveButtonProps> = ({ onPress, loading = false, title = "Save" }) => {
  const handlePress = () => {
    Keyboard.dismiss();
    onPress();
  };

  return (
    <Button
      mode="contained"
      onPress={handlePress}
      loading={loading}
      disabled={loading}
      style={styles.button}
      contentStyle={styles.buttonContent}
      labelStyle={styles.buttonText}
      accessibilityLabel={`${title} task`}
      accessibilityHint="Save the current task with entered information">
      {title}
    </Button>
  );
};

export default SaveButton;

const styles = StyleSheet.create({
  button: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    elevation: 2,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  buttonContent: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
