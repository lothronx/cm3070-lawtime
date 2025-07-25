import React, { useState, useCallback, useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { TextInput, Text } from "react-native-paper";
import { Control, useController, FieldError } from "react-hook-form";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";
import { DateTimeUtils } from "@/utils/dateTimeUtils";
import { TaskWithClient } from "@/types";

interface DateTimeInputProps {
  control: Control<TaskWithClient>;
  name: "event_time";
  error?: FieldError;
}

const DateTimeInput: React.FC<DateTimeInputProps> = ({ control, name, error }) => {
  const { theme } = useAppTheme();
  const [dateDisplayValue, setDateDisplayValue] = useState("");
  const [timeDisplayValue, setTimeDisplayValue] = useState("");

  // Internal ref for time field navigation
  const timeInputRef = useRef<any>(null);

  // Memoize validation function to prevent re-creation on every render
  const validateDateTime = useCallback(
    (value: string | null) => {
      // Allow empty input for both date and time
      if (!dateDisplayValue && !timeDisplayValue) return true;

      // If there's date input, validate it can be parsed
      if (dateDisplayValue && !DateTimeUtils.parseDate(dateDisplayValue)) {
        return "Please enter a valid date (e.g., 20250101)";
      }

      // If there's time input, validate it
      if (timeDisplayValue && !DateTimeUtils.parseTime(timeDisplayValue)) {
        return "Please enter a valid time (e.g., 0900 or 1400)";
      }

      // If we have a value, validate it's a proper ISO string
      if (value && !DateTimeUtils.isValidISOString(value)) {
        return "Invalid date format";
      }

      // Date without time is valid - database accepts null timestamps
      return true;
    },
    [dateDisplayValue, timeDisplayValue]
  );

  const {
    field: { onChange, onBlur, value },
  } = useController({
    control,
    name,
    rules: {
      validate: validateDateTime,
    },
  });

  // Centralized blur handler to avoid code duplication
  const handleFieldBlur = useCallback(
    (field: "date" | "time") => {
      try {
        // Normalize display format
        if (field === "date" && dateDisplayValue) {
          const dateStr = DateTimeUtils.parseDate(dateDisplayValue);
          if (dateStr) {
            setDateDisplayValue(dateStr);
          }
        } else if (field === "time" && timeDisplayValue) {
          const timeStr = DateTimeUtils.parseTime(timeDisplayValue);
          if (timeStr) {
            setTimeDisplayValue(timeStr);
          }
        }
      } catch (error) {
        console.warn("DateTimeInput: Error processing field blur", error);
        onChange(null);
      } finally {
        onBlur();
      }
    },
    [dateDisplayValue, timeDisplayValue, onChange, onBlur]
  );

  const hasError = Boolean(error);

  // Initialize display values from form value (ISO string)
  useEffect(() => {
    if (value && DateTimeUtils.isValidISOString(value)) {
      // Only set display values if they're empty (initial load)
      setDateDisplayValue((prev) => prev || DateTimeUtils.extractDateFromISO(value));
      setTimeDisplayValue((prev) => prev || DateTimeUtils.extractTimeFromISO(value));
    } else if (value === null) {
      // If form value is explicitly null, clear both display values
      setDateDisplayValue("");
      setTimeDisplayValue("");
    }
  }, [value]);

  return (
    <View style={styles.container}>
      <View style={styles.rowContainer}>
        <View style={styles.dateContainer}>
          <TextInput
            label="Date"
            placeholder="20250101"
            placeholderTextColor={theme.colors.backdrop}
            value={dateDisplayValue}
            onChangeText={(text) => {
              const formatted = DateTimeUtils.formatDateInput(text);
              setDateDisplayValue(formatted);
            }}
            onBlur={() => handleFieldBlur("date")}
            mode="outlined"
            error={hasError}
            multiline={false}
            maxLength={10}
            keyboardType="numeric"
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={() => timeInputRef.current?.focus()}
            style={{ backgroundColor: theme.colors.surface }}
            accessibilityLabel="Date input field"
            accessibilityHint="Enter date in format YYYYMMDD, for example 20250101"
          />
        </View>
        <View style={styles.timeContainer}>
          <TextInput
            ref={timeInputRef}
            label="Time"
            placeholder="1400"
            placeholderTextColor={theme.colors.backdrop}
            value={timeDisplayValue}
            onChangeText={(text) => {
              const formatted = DateTimeUtils.formatTimeInput(text);
              setTimeDisplayValue(formatted);
            }}
            onBlur={() => handleFieldBlur("time")}
            mode="outlined"
            error={hasError}
            multiline={false}
            maxLength={5}
            keyboardType="numeric"
            autoCapitalize="none"
            autoCorrect={false}
            style={{ backgroundColor: theme.colors.surface }}
            accessibilityLabel="Time input field"
            accessibilityHint="Enter time in 24-hour format, for example 1400 for 2 PM"
          />
        </View>
      </View>
      {hasError && error?.message && (
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error.message}</Text>
      )}
    </View>
  );
};

DateTimeInput.displayName = "DateTimeInput";

export default DateTimeInput;

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.xs,
  },
  rowContainer: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  dateContainer: {
    flex: 2,
  },
  timeContainer: {
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    marginLeft: SPACING.sm,
  },
});
