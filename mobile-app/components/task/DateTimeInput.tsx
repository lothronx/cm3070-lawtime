import React, {
  forwardRef,
  useState,
  useCallback,
  useEffect,
  useRef,
  useImperativeHandle,
} from "react";
import { View, StyleSheet } from "react-native";
import { TextInput, Text } from "react-native-paper";
import { Control, useController, FieldError } from "react-hook-form";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";
import { formatDateInput, parseDate, formatDateFromObject } from "@/utils/dateUtils";
import {
  formatTimeInput,
  parseTime,
  formatTimeFromObject,
  formatTimeForDisplay,
} from "@/utils/timeUtils";
import { combineDateTime } from "@/utils/dateTimeUtils";
import { TaskFormData } from "@/types/taskForm";

interface DateTimeInputProps {
  control: Control<TaskFormData>;
  name: "datetime";
  error?: FieldError;
  onSubmitEditing?: () => void;
}

const DateTimeInput = forwardRef<any, DateTimeInputProps>(
  ({ control, name, error, onSubmitEditing }, ref) => {
    const { theme } = useAppTheme();
    const [dateDisplayValue, setDateDisplayValue] = useState("");
    const [timeDisplayValue, setTimeDisplayValue] = useState("");

    // Internal refs for date and time fields
    const dateInputRef = useRef<any>(null);
    const timeInputRef = useRef<any>(null);

    // Expose focus method to parent component
    useImperativeHandle(ref, () => ({
      focus: () => {
        dateInputRef.current?.focus();
      },
    }));

    // Memoize validation function to prevent re-creation on every render
    const validateDateTime = useCallback(
      (value: Date | null) => {
        // Allow empty input for both date and time
        if (!dateDisplayValue && !timeDisplayValue) return true;

        // If there's date input but no valid date object, it's invalid
        if (dateDisplayValue && (!value || !(value instanceof Date) || isNaN(value.getTime()))) {
          return "Please enter a valid date (e.g., 20250101)";
        }

        // If there's time input, validate it
        if (timeDisplayValue && !parseTime(timeDisplayValue)) {
          return "Please enter a valid time (e.g., 0900 or 1400)";
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
          const combinedDateTime = combineDateTime(dateDisplayValue, timeDisplayValue);
          onChange(combinedDateTime);

          // Normalize display format
          if (field === "date" && dateDisplayValue) {
            const dateObj = parseDate(dateDisplayValue);
            if (dateObj) {
              setDateDisplayValue(formatDateFromObject(dateObj));
            }
          } else if (field === "time" && timeDisplayValue) {
            const timeObj = parseTime(timeDisplayValue);
            if (timeObj) {
              setTimeDisplayValue(formatTimeForDisplay(timeObj));
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

    // Initialize display values from form value
    useEffect(() => {
      if (value instanceof Date && !isNaN(value.getTime())) {
        // Only set display values if they're empty (initial load)
        setDateDisplayValue((prev) => prev || formatDateFromObject(value));
        setTimeDisplayValue((prev) => prev || formatTimeFromObject(value));
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
                const formatted = formatDateInput(text);
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
              returnKeyType="next"
              onSubmitEditing={() => timeInputRef.current?.focus()}
              ref={dateInputRef}
              style={{ backgroundColor: theme.colors.surface }}
              accessibilityLabel="Date input field"
              accessibilityHint="Enter date in format YYYYMMDD, for example 20250101"
            />
          </View>
          <View style={styles.timeContainer}>
            <TextInput
              label="Time"
              placeholder="1400"
              placeholderTextColor={theme.colors.backdrop}
              value={timeDisplayValue}
              onChangeText={(text) => {
                const formatted = formatTimeInput(text);
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
              returnKeyType="next"
              onSubmitEditing={onSubmitEditing}
              ref={timeInputRef}
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
  }
);

DateTimeInput.displayName = "DateTimeInput";

export default DateTimeInput;

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
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
    marginTop: SPACING.xs,
    marginLeft: SPACING.sm,
  },
});
