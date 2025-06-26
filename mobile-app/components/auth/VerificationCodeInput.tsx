import React from "react";
import { StyleSheet } from "react-native";
import { TextInput, HelperText, Button, Text, useTheme } from "react-native-paper";

interface VerificationCodeInputProps {
  value: string;
  onChangeText: (text: string) => void;
  error: string;
  countdown: number;
  onResend: () => void;
}

export default function VerificationCodeInput({
  value,
  onChangeText,
  error,
  countdown,
  onResend,
}: VerificationCodeInputProps) {
  const theme = useTheme();

  return (
    <>
      <TextInput
        mode="flat"
        label="Verification Code"
        placeholder="Enter 6-digit code"
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        maxLength={6}
        error={!!error}
        placeholderTextColor={theme.colors.backdrop}
      />
      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>

      {countdown > 0 ? (
        <Text style={styles.countdownText}>Resend in {countdown} seconds...</Text>
      ) : (
        <Button mode="text" onPress={onResend} style={styles.helpButton}>
          <Text style={styles.helpButtonText}>Resend</Text>
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
  countdownText: {
    alignSelf: "flex-end",
    marginTop: -18,
    marginBottom: 16,
    fontSize: 12,
  },
});