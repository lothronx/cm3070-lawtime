import React, { forwardRef } from "react";
import { View, StyleSheet } from "react-native";
import { TextInput, Text } from "react-native-paper";
import { Control, Controller, FieldError } from "react-hook-form";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";

interface LocationInputProps {
  control: Control<any>;
  name: string;
  error?: FieldError;
  onSubmitEditing?: () => void;
}

const LocationInput = forwardRef<any, LocationInputProps>(
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

    const hasError = Boolean(error);

    return (
      <View style={styles.container}>
        <Controller
          control={control}
          name={name}
          rules={{
            validate: (value: string) => {
              if (!value?.trim()) return true; // Allow empty/null
              const trimmed = value.trim();
              if (trimmed.length > 200) return "Location must be at most 200 characters";
              return true;
            },
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              label="Location"
              value={value || ""}
              onChangeText={onChange}
              onBlur={() => {
                // Handle null/empty gracefully for database
                const sanitized = value?.trim() ? sanitizeInput(value) : null;
                onChange(sanitized);
                onBlur();
              }}
              mode="outlined"
              error={hasError}
              multiline={false}
              maxLength={200}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={onSubmitEditing}
              ref={ref}
              style={{ backgroundColor: theme.colors.surface }}
            />
          )}
        />
        {hasError && error?.message && (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {error.message}
          </Text>
        )}
      </View>
    );
  }
);

LocationInput.displayName = "LocationInput";

export default LocationInput;

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