import React, { useState } from "react";
import { StyleSheet, Alert } from "react-native";
import { Button } from "react-native-paper";
import { useAppTheme, SPACING, BORDER_RADIUS } from "@/theme/ThemeProvider";

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
  confirmMessage = "Are you sure you want to delete this task? This action cannot be undone."
}) => {
  const { theme } = useAppTheme();

  const handlePress = () => {
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
      mode="outlined"
      onPress={handlePress}
      loading={loading}
      disabled={loading}
      style={[
        styles.button,
        {
          borderColor: theme.colors.error,
        }
      ]}
      contentStyle={styles.buttonContent}
      labelStyle={[
        styles.buttonText,
        { color: theme.colors.error }
      ]}
    >
      {title}
    </Button>
  );
};

export default DeleteButton;

const styles = StyleSheet.create({
  button: {
    marginTop: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  buttonContent: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});