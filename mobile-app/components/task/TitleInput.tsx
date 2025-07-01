import React, { forwardRef } from "react";
import { View, StyleSheet } from "react-native";
import { TextInput, Text } from "react-native-paper";
import { Control, useController, FieldError } from "react-hook-form";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";

interface TitleInputProps {
  control: Control<any>;
  name: string;
  error?: FieldError;
  onSubmitEditing?: () => void;
}

const TitleInput = forwardRef<any, TitleInputProps>(
  ({ control, name, error, onSubmitEditing }, ref) => {
    const { theme } = useAppTheme();

    const sanitizeInput = (text: string): string => {
      // Remove potentially dangerous characters
      return text
        .replace(/[<>"'&;`\\|{}[\]]/g, "") // Remove HTML/SQL injection chars
        .replace(/[\r\n\t]/g, "") // Remove line breaks and tabs
        .replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove zero-width chars
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove control chars
        .replace(/\s+/g, " ") // Normalize remaining whitespace
        .trim();
    };

    const {
      field: { onChange, onBlur, value }
    } = useController({
      control,
      name,
      rules: {
        required: "Title is required",
        validate: (value: string) => {
          const trimmed = value?.trim();
          if (!trimmed) return "Title is required";
          if (trimmed.length < 2) return "Title must be at least 2 characters";
          if (trimmed.length > 100) return "Title must be at most 100 characters";
          return true;
        },
      }
    });

    const hasError = Boolean(error);

    return (
      <View style={styles.container}>
        <TextInput
          label="*Title"
          value={value || ""}
          onChangeText={onChange}
          onBlur={() => {
            onChange(sanitizeInput(value || ""));
            onBlur();
          }}
          mode="outlined"
          error={hasError}
          multiline={false}
          maxLength={100}
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={onSubmitEditing}
          ref={ref}
          style={{backgroundColor: theme.colors.surface}}
        />
        {hasError && error?.message && (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{error.message}</Text>
        )}
      </View>
    );
  }
);

TitleInput.displayName = "TitleInput";

export default TitleInput;

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  errorText: {
    fontSize: 12,
    marginTop: SPACING.xs,
    marginLeft: SPACING.sm,
  },
});
