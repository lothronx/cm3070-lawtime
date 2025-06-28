import React, { useRef, useState } from "react";
import { View, StyleSheet } from "react-native";
import { TextInput, IconButton } from "react-native-paper";
import { Control, Controller, FieldError } from "react-hook-form";
import { TextInputMask } from "react-native-masked-text";
import { useAppTheme, SPACING, BORDER_RADIUS } from "@/theme/ThemeProvider";

interface DateTimeInputProps {
  control: Control<any>;
  name: string;
  error?: FieldError;
}

const DateTimeInput: React.FC<DateTimeInputProps> = ({ control, name, error }) => {
  const { theme } = useAppTheme();
  const dateRef = useRef<TextInputMask>(null);
  const timeRef = useRef<TextInputMask>(null);
  const [dateText, setDateText] = useState("");
  const [timeText, setTimeText] = useState("");

  const formatDate = (dateValue: Date | null): string => {
    if (!dateValue) return "";
    const day = String(dateValue.getDate()).padStart(2, '0');
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const year = dateValue.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTime = (dateValue: Date | null): string => {
    if (!dateValue) return "";
    const hours = String(dateValue.getHours()).padStart(2, '0');
    const minutes = String(dateValue.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getDefaultDateTime = (): Date => {
    const today = new Date();
    today.setHours(9, 0, 0, 0); // Set to 9:00 AM
    return today;
  };

  const combineDateTime = (dateStr: string, timeStr: string): Date | null => {
    // If both fields are empty, return null (optional field)
    if (!dateStr && !timeStr) return null;
    
    const defaultDate = getDefaultDateTime();
    
    // Simple parsing without relying on moment objects immediately
    let finalDate = new Date(defaultDate);
    
    // Parse date if provided and complete
    if (dateStr && dateStr.length === 10) { // DD/MM/YYYY
      const [day, month, year] = dateStr.split('/').map(num => parseInt(num, 10));
      if (day && month && year && year >= 1900 && year <= 2100) {
        finalDate = new Date(year, month - 1, day, 9, 0); // Default to 9 AM
      }
    }
    
    // Parse time if provided and complete
    if (timeStr && timeStr.length === 5) { // HH:MM
      const [hours, minutes] = timeStr.split(':').map(num => parseInt(num, 10));
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        finalDate.setHours(hours, minutes);
      }
    }
    
    return finalDate;
  };

  const hasError = Boolean(error);

  return (
    <View style={styles.container}>
      <Controller
        control={control}
        name={name}
        // No required validation - fields are optional
        render={({ field: { onChange, onBlur, value } }) => {
          const handleClear = () => {
            setDateText("");
            setTimeText("");
            onChange(null);
          };

          const hasValues = dateText || timeText;

          return (
            <>
              <View style={styles.inputRow}>
                <View style={styles.dateContainer}>
                  <TextInput
                    label="Date"
                    mode="outlined"
                    error={hasError}
                    render={(props) => (
                      <TextInputMask
                        {...props}
                        ref={dateRef}
                        type="datetime"
                        options={{
                          format: 'DD/MM/YYYY'
                        }}
                        value={dateText}
                        onChangeText={(text) => {
                          setDateText(text);
                          const combined = combineDateTime(text, timeText);
                          onChange(combined);
                        }}
                        placeholder="DD/MM/YYYY"
                        keyboardType="numeric"
                        returnKeyType="next"
                      />
                    )}
                    style={[
                      styles.input,
                      { backgroundColor: theme.colors.surface }
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
                </View>

                <View style={styles.timeContainer}>
                  <TextInput
                    label="Time"
                    mode="outlined"
                    error={hasError}
                    render={(props) => (
                      <TextInputMask
                        {...props}
                        ref={timeRef}
                        type="datetime"
                        options={{
                          format: 'HH:mm'
                        }}
                        value={timeText}
                        onChangeText={(text) => {
                          setTimeText(text);
                          const combined = combineDateTime(dateText, text);
                          onChange(combined);
                        }}
                        placeholder="09:00"
                        keyboardType="numeric"
                        returnKeyType="done"
                      />
                    )}
                    style={[
                      styles.input,
                      { backgroundColor: theme.colors.surface }
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
                </View>

                {hasValues && (
                  <View style={styles.clearButtonContainer}>
                    <IconButton
                      icon="close-circle"
                      size={20}
                      iconColor={theme.colors.outline}
                      onPress={handleClear}
                    />
                  </View>
                )}
              </View>
            </>
          );
        }}
      />
    </View>
  );
};

export default DateTimeInput;

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  dateContainer: {
    flex: 2,
  },
  timeContainer: {
    flex: 1,
  },
  clearButtonContainer: {
    paddingTop: SPACING.xs,
  },
  input: {
    fontSize: 16,
  },
});