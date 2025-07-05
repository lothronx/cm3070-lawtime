import React, { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { TextInput, Text } from "react-native-paper";
import { Control, useController, FieldError } from "react-hook-form";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";
import { sanitizeInput, validateTextLength } from "@/utils/inputUtils";
import { TaskFormData } from "@/types/taskForm";

interface TitleInputProps {
  control: Control<TaskFormData>;
  name: "title";
  error?: FieldError;
}

const TitleInput: React.FC<TitleInputProps> = ({ control, name, error }) => {
    const { theme } = useAppTheme();

    // Memoized validation function
    const validateTitle = useCallback((value: string) => {
      return validateTextLength(value, 2, 100, "Title", true);
    }, []);

    const {
      field: { onChange, onBlur, value },
    } = useController({
      control,
      name,
      rules: {
        required: "Title is required",
        validate: validateTitle,
      },
    });

    // Memoized blur handler
    const handleBlur = useCallback(() => {
      try {
        const sanitized = value?.trim() ? sanitizeInput(value) : "";
        onChange(sanitized);
      } catch (error) {
        console.warn("TitleInput: Error processing blur", error);
      } finally {
        onBlur();
      }
    }, [value, onChange, onBlur]);

    const hasError = Boolean(error);

    return (
      <View style={styles.container}>
        <TextInput
          label="*Title"
          value={value || ""}
          onChangeText={onChange}
          onBlur={handleBlur}
          mode="outlined"
          error={hasError}
          multiline={false}
          maxLength={100}
          autoCapitalize="words"
          returnKeyType="done"
          style={{ backgroundColor: theme.colors.surface }}
          accessibilityLabel="Title input field"
          accessibilityHint="Enter a title for this task, required field"
        />
        {hasError && error?.message && (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{error.message}</Text>
        )}
      </View>
    );
  };

TitleInput.displayName = "TitleInput";

export default TitleInput;

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.xs,
  },
  errorText: {
    fontSize: 12,
    marginLeft: SPACING.sm,
  },
});
