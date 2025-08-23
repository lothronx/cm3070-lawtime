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

  // Update form value whenever date or time changes
  const updateFormValue = useCallback(
    (currentDateValue: string, currentTimeValue: string) => {
      try {
        // If both fields are empty, set form value to null
        if (!currentDateValue && !currentTimeValue) {
          onChange(null);
          return;
        }

        // If only date is provided, create ISO string with time as 09:00 (9am)
        if (currentDateValue && !currentTimeValue) {
          const isoString = DateTimeUtils.formatUserInputToISO(currentDateValue, "0900");
          onChange(isoString);
          return;
        }

        // If both date and time are provided, combine them
        if (currentDateValue && currentTimeValue) {
          const isoString = DateTimeUtils.formatUserInputToISO(currentDateValue, currentTimeValue);
          onChange(isoString);
          return;
        }

        // If only time is provided without date, don't update form (invalid state)
        // This maintains the existing form value
      } catch (error) {
        console.warn("DateTimeInput: Error updating form value", error);
        onChange(null);
      }
    },
    [onChange]
  );

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

        // Update form value after normalization using the current state
        const currentDate =
          field === "date" && dateDisplayValue
            ? DateTimeUtils.parseDate(dateDisplayValue) || dateDisplayValue
            : dateDisplayValue;
        const currentTime =
          field === "time" && timeDisplayValue
            ? DateTimeUtils.parseTime(timeDisplayValue) || timeDisplayValue
            : timeDisplayValue;
        updateFormValue(currentDate, currentTime);
      } catch (error) {
        console.warn("DateTimeInput: Error processing field blur", error);
        onChange(null);
      } finally {
        onBlur();
      }
    },
    [dateDisplayValue, timeDisplayValue, onChange, onBlur, updateFormValue]
  );

  const hasError = Boolean(error);

  // Initialize display values from form value (ISO string) - react to value changes
  const [lastProcessedValue, setLastProcessedValue] = useState<string | null>(null);
  useEffect(() => {
    // Only update if the value has actually changed (to avoid infinite loops)
    if (value !== lastProcessedValue) {
      console.log("DateTimeInput updating from value:", value);
      if (value && DateTimeUtils.isValidISOString(value)) {
        setDateDisplayValue(DateTimeUtils.extractDateFromISO(value));
        setTimeDisplayValue(DateTimeUtils.extractTimeFromISO(value));
      } else {
        setDateDisplayValue("");
        setTimeDisplayValue("");
      }
      setLastProcessedValue(value);
    }
  }, [value, lastProcessedValue]);

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
              
              // If date is cleared, also clear the time field
              if (!formatted) {
                setTimeDisplayValue("");
                updateFormValue("", "");
              } else {
                updateFormValue(formatted, timeDisplayValue);
              }
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
            disabled={!dateDisplayValue}
            onChangeText={(text) => {
              const formatted = DateTimeUtils.formatTimeInput(text);
              setTimeDisplayValue(formatted);
              updateFormValue(dateDisplayValue, formatted);
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
            accessibilityHint={
              dateDisplayValue
                ? "Enter time in 24-hour format, for example 1400 for 2 PM"
                : "Please enter a date first to enable time input"
            }
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
