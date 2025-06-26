import React from "react";
import { StyleSheet } from "react-native";
import { Card, useTheme } from "react-native-paper";
import PhoneNumberInput from "./PhoneNumberInput";
import VerificationCodeInput from "./VerificationCodeInput";
import ActionButton from "./ActionButton";
import TermsAndConditionsCheckbox from "./TermsAndConditionsCheckbox";

interface AuthCardProps {
  // Phone input props
  mobileNumber: string;
  onPhoneChange: (text: string) => void;
  phoneError: string;
  
  // Code input props (only shown when code is sent)
  codeSent: boolean;
  smsCode: string;
  onCodeChange: (text: string) => void;
  codeError: string;
  countdown: number;
  onResend: () => void;
  onChangePhoneNumber: () => void;
  
  // Action button props
  onAction: () => void;
  isLoading: boolean;
  actionEnabled: boolean;
  actionTitle: string;
  
  // Terms checkbox props
  agreedToTerms: boolean;
  onTermsChange: (agreed: boolean) => void;
}

export default function AuthCard({
  mobileNumber,
  onPhoneChange,
  phoneError,
  codeSent,
  smsCode,
  onCodeChange,
  codeError,
  countdown,
  onResend,
  onChangePhoneNumber,
  onAction,
  isLoading,
  actionEnabled,
  actionTitle,
  agreedToTerms,
  onTermsChange,
}: AuthCardProps) {
  const theme = useTheme();

  return (
    <Card
      style={[styles.authCard, { backgroundColor: theme.colors.surface }]}
      elevation={4}>
      <Card.Content style={styles.cardContent}>
        <PhoneNumberInput
          value={mobileNumber}
          onChangeText={onPhoneChange}
          error={phoneError}
          disabled={codeSent}
          onChangePhoneNumber={onChangePhoneNumber}
          showChangeButton={codeSent}
        />

        {codeSent && (
          <VerificationCodeInput
            value={smsCode}
            onChangeText={onCodeChange}
            error={codeError}
            countdown={countdown}
            onResend={onResend}
          />
        )}

        <ActionButton
          onPress={onAction}
          loading={isLoading}
          disabled={!actionEnabled}
          title={actionTitle}
        />

        <TermsAndConditionsCheckbox
          checked={agreedToTerms}
          onPress={() => onTermsChange(!agreedToTerms)}
          disabled={codeSent}
        />
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  authCard: {
    borderRadius: 16,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  cardContent: {
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
});