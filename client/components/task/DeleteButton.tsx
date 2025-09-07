import React from "react";
import { StyleSheet, Alert, Keyboard } from "react-native";
import { Button } from "react-native-paper";
import { useAppTheme, BORDER_RADIUS } from "@/theme/ThemeProvider";

interface DeleteButtonProps {
  onPress: () => void;
  loading?: boolean;
  title?: string;
  confirmTitle?: string;
  confirmMessage?: string;
}

const DeleteButton: React.FC<DeleteButtonProps> = ({
  onPress,
  loading = false,
  title = "Delete Task",
  confirmTitle = "Delete Task",
  confirmMessage = "Are you sure you want to delete this task? This action cannot be undone.",
}) => {
  const { theme } = useAppTheme();

  const handlePress = () => {
    Keyboard.dismiss();
    Alert.alert(
      confirmTitle,
      confirmMessage,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: onPress,
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <Button
      mode="text"
      onPress={handlePress}
      loading={loading}
      disabled={loading}
      style={styles.button}
      contentStyle={styles.buttonContent}
      labelStyle={[styles.buttonText, { color: theme.colors.error }]}
      accessibilityLabel="Delete task"
      accessibilityHint="Permanently delete this task after confirmation"
      accessibilityRole="button">
      {title}
    </Button>
  );
};

export default DeleteButton;

const styles = StyleSheet.create({
  button: {
    alignSelf: "center",
    borderRadius: BORDER_RADIUS.md,
  },
  buttonContent: {
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
