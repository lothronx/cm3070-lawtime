import React from "react";
import { StyleSheet } from "react-native";
import { Button } from "react-native-paper";
import { SPACING, BORDER_RADIUS } from "@/theme/ThemeProvider";

interface SaveButtonProps {
  onPress: () => void;
  loading?: boolean;
  title?: string;
}

const SaveButton: React.FC<SaveButtonProps> = ({ onPress, loading = false, title = "Save" }) => {
  return (
    <Button
      mode="contained"
      onPress={onPress}
      loading={loading}
      disabled={loading}
      style={styles.button}
      contentStyle={styles.buttonContent}
      labelStyle={styles.buttonText}>
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
