import React, { forwardRef, useState, useCallback, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { TextInput, Text } from "react-native-paper";
import { Control, useController, FieldError } from "react-hook-form";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";

interface DateTimeInputProps {
  control: Control<any>;
  name: string;
  error?: FieldError;
  onSubmitEditing?: () => void;
}

// Move helper functions outside component to prevent re-creation on every render
const formatDateInput = (text: string): string => {
  // Remove all non-digits
  const digits = text.replace(/\D/g, "");

  if (digits.length === 0) return "";

  // Format based on length with smart parsing for single digit months/days
  if (digits.length <= 4) {
    return digits; // Just year: "2025"
  } else if (digits.length === 5) {
    // Could be "20258" (2025/8) or "20251" (2025/1)
    const year = digits.slice(0, 4);
    const month = digits.slice(4);
    return `${year}/${month}`;
  } else if (digits.length === 6) {
    // Could be "202508" (2025/08) or "202581" (2025/8/1)
    const year = digits.slice(0, 4);
    const monthDay = digits.slice(4);

    // Check if last digit could be a valid single-digit day
    const potentialMonth = parseInt(monthDay.slice(0, 1));
    const potentialDay = parseInt(monthDay.slice(1));

    if (potentialMonth >= 1 && potentialMonth <= 9 && potentialDay >= 1 && potentialDay <= 31) {
      // Likely format: 202581 -> 2025/8/1
      return `${year}/${potentialMonth}/${potentialDay}`;
    } else {
      // Standard format: 202508 -> 2025/08
      return `${year}/${monthDay}`;
    }
  } else if (digits.length === 7) {
    // Could be "2025829" (2025/8/29) or "2025121" (2025/12/1)
    const year = digits.slice(0, 4);
    const rest = digits.slice(4); // "829" or "121"

    // Try double digit month first: 121 -> 12/1 (more likely for 10-12 months)
    const doubleMonth = parseInt(rest.slice(0, 2));
    const singleDay = parseInt(rest.slice(2));

    if (doubleMonth >= 10 && doubleMonth <= 12 && singleDay >= 1 && singleDay <= 31) {
      return `${year}/${rest.slice(0, 2)}/${singleDay}`;
    }

    // Try single digit month: 829 -> 8/29
    const singleMonth = parseInt(rest.slice(0, 1));
    const dayPart = rest.slice(1);

    if (singleMonth >= 1 && singleMonth <= 9 && dayPart.length === 2) {
      const day = parseInt(dayPart);
      if (day >= 1 && day <= 31) {
        return `${year}/${singleMonth}/${dayPart}`;
      }
    }

    // Fallback to double digit month interpretation
    return `${year}/${rest.slice(0, 2)}/${rest.slice(2)}`;
  } else {
    // Standard format: "20250101" -> "2025/01/01"
    return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6, 8)}`;
  }
};

const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;

  // Handle partial dates: "2025", "2025/8", "2025/8/29"
  const parts = dateStr.split("/");
  if (parts.length < 1 || parts.length > 3) return null;

  const year = parseInt(parts[0]);
  const month = parts.length >= 2 ? parseInt(parts[1]) : 1;
  const day = parts.length >= 3 ? parseInt(parts[2]) : 1;

  // Basic validation
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;

  // Validate ranges before creating Date object
  if (year < 1900 || year > 3000) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day, 9, 0, 0); // Default to 9 AM

  // Check if date is valid (handles invalid dates like Feb 31)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
};

const formatDateFromObject = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  return `${year}/${month}/${day}`;
};

// Time formatting helper functions
const formatTimeInput = (text: string): string => {
  // Remove all non-digits
  const digits = text.replace(/\D/g, "");
  
  if (digits.length === 0) return "";
  
  // Handle various input formats
  if (digits.length <= 2) {
    return digits; // Just hours: "9" or "09"
  } else if (digits.length === 3) {
    // "900" -> "9:00"
    return `${digits[0]}:${digits.slice(1)}`;
  } else {
    // "1400" or longer -> "14:00"
    return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  }
};

const parseTime = (timeStr: string): { hours: number; minutes: number } | null => {
  if (!timeStr) return null;
  
  // Handle both "9:00" and "900" formats
  const cleanTime = timeStr.replace(/\D/g, "");
  
  let hours: number;
  let minutes: number = 0;
  
  if (cleanTime.length === 3) {
    // "900" format
    hours = parseInt(cleanTime[0]);
    minutes = parseInt(cleanTime.slice(1));
  } else if (cleanTime.length >= 4) {
    // "1400" format
    hours = parseInt(cleanTime.slice(0, 2));
    minutes = parseInt(cleanTime.slice(2, 4));
  } else if (cleanTime.length <= 2) {
    // Just hours
    hours = parseInt(cleanTime);
  } else {
    return null;
  }
  
  // Validate time
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  
  return { hours, minutes };
};

const formatTimeFromObject = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

const DateTimeInput = forwardRef<any, DateTimeInputProps>(
  ({ control, name, error, onSubmitEditing }, ref) => {
    const { theme } = useAppTheme();
    const [dateDisplayValue, setDateDisplayValue] = useState("");
    const [timeDisplayValue, setTimeDisplayValue] = useState("");

    // Memoize validation function to prevent re-creation on every render
    const validateDateTime = useCallback((value: Date | null) => {
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

      return true;
    }, [dateDisplayValue, timeDisplayValue]);

    const hasError = Boolean(error);

    // Helper function to combine date and time into a single Date object
    const combineDateTime = (dateStr: string, timeStr: string): Date | null => {
      const dateObj = parseDate(dateStr);
      if (!dateObj) return null;
      
      const timeObj = parseTime(timeStr);
      if (timeObj) {
        dateObj.setHours(timeObj.hours, timeObj.minutes, 0, 0);
      }
      
      return dateObj;
    };

    const {
      field: { onChange, onBlur, value },
      fieldState: { error: fieldError }
    } = useController({
      control,
      name,
      rules: {
        validate: validateDateTime,
      }
    });

    // Initialize display values from form value
    useEffect(() => {
      if (value instanceof Date && !isNaN(value.getTime())) {
        if (!dateDisplayValue) {
          setDateDisplayValue(formatDateFromObject(value));
        }
        if (!timeDisplayValue) {
          setTimeDisplayValue(formatTimeFromObject(value));
        }
      }
    }, [value, dateDisplayValue, timeDisplayValue]);

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
              onBlur={() => {
                try {
                  // Combine date and time and update form
                  const combinedDateTime = combineDateTime(dateDisplayValue, timeDisplayValue);
                  onChange(combinedDateTime);

                  // Normalize display format if we have a valid date
                  if (parseDate(dateDisplayValue)) {
                    const dateObj = parseDate(dateDisplayValue);
                    if (dateObj) {
                      const normalized = formatDateFromObject(dateObj);
                      setDateDisplayValue(normalized);
                    }
                  }
                } catch {
                  // Handle unexpected parsing errors gracefully
                  onChange(null);
                } finally {
                  onBlur();
                }
              }}
              mode="outlined"
              error={hasError}
              multiline={false}
              maxLength={10}
              keyboardType="numeric"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={onSubmitEditing}
              ref={ref}
              style={{ backgroundColor: theme.colors.surface }}
            />
          </View>
          <View style={styles.timeContainer}>
            <TextInput
              label="Time"
              placeholder="0900"
              placeholderTextColor={theme.colors.backdrop}
              value={timeDisplayValue}
              onChangeText={(text) => {
                const formatted = formatTimeInput(text);
                setTimeDisplayValue(formatted);
              }}
              onBlur={() => {
                try {
                  // Combine date and time and update form
                  const combinedDateTime = combineDateTime(dateDisplayValue, timeDisplayValue);
                  onChange(combinedDateTime);

                  // Normalize display format if we have a valid time
                  if (parseTime(timeDisplayValue)) {
                    const timeObj = parseTime(timeDisplayValue);
                    if (timeObj) {
                      const normalized = `${timeObj.hours.toString().padStart(2, "0")}:${timeObj.minutes.toString().padStart(2, "0")}`;
                      setTimeDisplayValue(normalized);
                    }
                  }
                } catch {
                  // Handle unexpected parsing errors gracefully
                  onChange(null);
                } finally {
                  onBlur();
                }
              }}
              mode="outlined"
              error={hasError}
              multiline={false}
              maxLength={5}
              keyboardType="numeric"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              style={{ backgroundColor: theme.colors.surface }}
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
