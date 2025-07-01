import React from "react";
import { StyleSheet } from "react-native";
import { TextInput, HelperText, Button } from "react-native-paper";
import { Text } from "react-native-paper";
import { useAppTheme } from "@/theme/ThemeProvider";
interface PhoneNumberInputProps {
  value: string;
  onChangeText: (text: string) => void;
  error: string;
  disabled: boolean;
  onChangePhoneNumber: () => void;
  showChangeButton: boolean;
}

export default function PhoneNumberInput({
  value,
  onChangeText,
  error,
  disabled,
  onChangePhoneNumber,
  showChangeButton,
}: PhoneNumberInputProps) {
  const { theme } = useAppTheme();

  return (
    <>
      <TextInput
        mode="outlined"
        label="Phone Number"
        placeholder="Enter your phone number"
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        textContentType="telephoneNumber"
        maxLength={11}
        error={!!error}
        disabled={disabled}
        placeholderTextColor={theme.colors.backdrop}
        left={<TextInput.Affix text="+86 " />}
      />
      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>
      {showChangeButton && (
        <Button mode="text" onPress={onChangePhoneNumber} style={styles.helpButton}>
          <Text style={styles.helpButtonText}>Change Phone Number</Text>
        </Button>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  helpButton: {
    alignSelf: "flex-end",
    marginTop: -28,
    marginRight: -10,
    marginBottom: 0,
  },
  helpButtonText: {
    fontSize: 12,
    fontWeight: "bold",
  },
});