import React, { forwardRef, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { TextInput, Text } from "react-native-paper";
import { Control, useController, FieldError } from "react-hook-form";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";
import { sanitizeInput, validateTextLength } from "@/utils/inputUtils";
import { TaskFormData } from "@/types/taskForm";

interface NoteInputProps {
  control: Control<TaskFormData>;
  name: "note";
  error?: FieldError;
  onSubmitEditing?: () => void;
  onFocus?: () => void;
}

const NoteInput = forwardRef<any, NoteInputProps>(
  ({ control, name, error, onSubmitEditing, onFocus }, ref) => {
    const { theme } = useAppTheme();

    // Memoized validation function
    const validateNote = useCallback((value: string | null) => {
      return validateTextLength(value, 1, 1000, "Note", false);
    }, []);

    const {
      field: { onChange, onBlur, value },
    } = useController({
      control,
      name,
      rules: {
        validate: validateNote,
      },
    });

    // Memoized blur handler
    const handleBlur = useCallback(() => {
      try {
        const sanitized = value?.trim() ? sanitizeInput(value) : null;
        onChange(sanitized);
      } catch (error) {
        console.warn("NoteInput: Error processing blur", error);
      } finally {
        onBlur();
      }
    }, [value, onChange, onBlur]);

    const hasError = Boolean(error);

    return (
      <View style={styles.container}>
        <TextInput
          label="Note"
          value={value || ""}
          onChangeText={onChange}
          onBlur={handleBlur}
          onFocus={onFocus}
          mode="outlined"
          error={hasError}
          multiline={true}
          maxLength={1000}
          autoCapitalize="sentences"
          onSubmitEditing={onSubmitEditing}
          ref={ref}
          style={[styles.noteInput, { backgroundColor: theme.colors.surface }]}
          contentStyle={styles.noteInputContent}
          accessibilityLabel="Note input field"
          accessibilityHint="Enter additional notes for this task, optional field"
        />
        {hasError && error?.message && (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{error.message}</Text>
        )}
      </View>
    );
  }
);

NoteInput.displayName = "NoteInput";

export default NoteInput;

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.xs,
  },
  noteInput: {
    maxHeight: 120,
  },
  noteInputContent: {
    height: 120,
  },
  errorText: {
    fontSize: 12,
    marginTop: SPACING.xs,
    marginLeft: SPACING.sm,
  },
});