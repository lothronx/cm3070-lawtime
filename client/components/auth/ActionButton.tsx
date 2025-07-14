import React from "react";
import { Button } from "react-native-paper";
import { BORDER_RADIUS, SPACING } from "@/theme/ThemeProvider";

interface ActionButtonProps {
  onPress: () => void;
  loading: boolean;
  disabled: boolean;
  title: string;
}

export default function ActionButton({ onPress, loading, disabled, title }: ActionButtonProps) {
  return (
    <Button
      mode="contained"
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      style={{
        borderRadius: BORDER_RADIUS.lg,
        marginTop: SPACING.md,
        marginBottom: SPACING.sm,
      }}
      contentStyle={{
        height: 52,
      }}>
      {title}
    </Button>
  );
}
