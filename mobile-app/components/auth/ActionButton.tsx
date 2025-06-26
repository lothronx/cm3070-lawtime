import React from "react";
import { StyleSheet } from "react-native";
import { Button, useTheme } from "react-native-paper";

interface ActionButtonProps {
  onPress: () => void;
  loading: boolean;
  disabled: boolean;
  title: string;
}

export default function ActionButton({
  onPress,
  loading,
  disabled,
  title,
}: ActionButtonProps) {
  const theme = useTheme();

  return (
    <Button
      mode="contained"
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      style={[
        styles.actionButton,
        {
          backgroundColor: disabled
            ? theme.colors.secondaryContainer
            : theme.colors.secondary,
        },
      ]}
      contentStyle={styles.buttonContent}
      labelStyle={{
        color: disabled
          ? theme.colors.onSecondaryContainer
          : theme.colors.onSecondary,
        fontWeight: "bold",
      }}>
      {title}
    </Button>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 6,
  },
  buttonContent: {
    height: 52,
  },
});