import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { TextInput, Text } from "react-native-paper";
import { Control, Controller, FieldError } from "react-hook-form";
import { useAppTheme, SPACING, BORDER_RADIUS } from "@/theme/ThemeProvider";

interface TitleInputProps {
  control: Control<any>;
  name: string;
  error?: FieldError;
}

const TitleInput: React.FC<TitleInputProps> = ({ control, name, error }) => {
  const { theme } = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);

  const sanitizeInput = (text: string): string => {
    // Remove potentially dangerous characters and limit length
    return text
      .replace(/[<>'"&;]/g, '') // Remove HTML/SQL injection chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .substring(0, 100); // Limit to 100 characters
  };

  const hasError = Boolean(error);

  return (
    <View style={styles.container}>
      <Controller
        control={control}
        name={name}
        rules={{
          required: "Title is required",
          minLength: {
            value: 2,
            message: "Title must be at least 2 characters"
          },
          maxLength: {
            value: 100,
            message: "Title must be less than 100 characters"
          },
          validate: (value: string) => {
            const trimmed = value?.trim();
            if (!trimmed) return "Title is required";
            if (trimmed.length < 2) return "Title must be at least 2 characters";
            return true;
          }
        }}
        render={({ field: { onChange, onBlur, value } }) => (
          <TextInput
            label="*Title"
            value={value || ""}
            onChangeText={(text) => onChange(sanitizeInput(text))}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setIsFocused(false);
              onBlur();
            }}
            mode="outlined"
            error={hasError}
            multiline={false}
            maxLength={100}
            autoCapitalize="words"
            autoCorrect={true}
            returnKeyType="next"
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
              }
            ]}
            outlineStyle={{
              borderRadius: BORDER_RADIUS.md,
            }}
            theme={{
              colors: {
                primary: theme.colors.primary,
                error: theme.colors.error,
                outline: hasError ? theme.colors.error : theme.colors.outline,
              }
            }}
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
};

export default TitleInput;

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  input: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: SPACING.xs,
    marginLeft: SPACING.sm,
  },
});