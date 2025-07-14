import React from "react";
import { StyleSheet, Keyboard } from "react-native";
import { Button } from "react-native-paper";
import { SPACING, BORDER_RADIUS } from "@/theme/ThemeProvider";

interface DiscardButtonProps {
  onPress: () => void;
  loading?: boolean;
  title?: string;
}

const DiscardButton: React.FC<DiscardButtonProps> = ({
  onPress,
  loading = false,
  title = "Discard",
}) => {
  const handlePress = () => {
    Keyboard.dismiss();
    onPress();
  };

  return (
    <Button
      mode="outlined"
      onPress={handlePress}
      loading={loading}
      disabled={loading}
      style={[styles.button]}
      contentStyle={styles.buttonContent}
      labelStyle={[styles.buttonText]}>
      {title}
    </Button>
  );
};

export default DiscardButton;

const styles = StyleSheet.create({
  button: {
    flex: 1,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  buttonContent: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
