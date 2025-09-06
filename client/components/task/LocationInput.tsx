import React, { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { TextInput, Text } from "react-native-paper";
import { Control, useController, FieldError } from "react-hook-form";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";
import { sanitizeInput, validateTextLength } from "@/utils/inputUtils";
import { TaskWithClient } from "@/types";

interface LocationInputProps {
  control: Control<TaskWithClient>;
  name: "location";
  error?: FieldError;
}

const LocationInput: React.FC<LocationInputProps> = ({ control, name, error }) => {
  const { theme } = useAppTheme();

  // Memoized validation function
  const validateLocation = useCallback((value: string | null) => {
    return validateTextLength(value, 1, 200, "Location", false);
  }, []);

  const {
    field: { onChange, onBlur, value },
  } = useController({
    control,
    name,
    rules: {
      validate: validateLocation,
    },
  });

  // Memoized blur handler
  const handleBlur = useCallback(() => {
    try {
      const sanitized = value?.trim() ? sanitizeInput(value) : null;
      onChange(sanitized);
    } catch (error) {
      console.warn("LocationInput: Error processing blur", error);
    } finally {
      onBlur();
    }
  }, [value, onChange, onBlur]);

  const hasError = Boolean(error);

  return (
    <View style={styles.container}>
      <TextInput
        label="Location"
        value={value || ""}
        onChangeText={onChange}
        onBlur={handleBlur}
        mode="outlined"
        error={hasError}
        multiline={true}
        maxLength={200}
        autoCapitalize="words"
        returnKeyType="done"
        style={{ backgroundColor: theme.colors.surface }}
        accessibilityLabel="Location input field"
        accessibilityHint="Enter a location for this task, optional field"
      />
      {hasError && error?.message && (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error.message}</Text>
      )}
    </View>
  );
};

LocationInput.displayName = "LocationInput";

export default LocationInput;

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.xs,
  },
  errorText: {
    fontSize: 12,
    marginLeft: SPACING.sm,
  },
});
