import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Text, TextInput, Button, Card, useTheme, HelperText, Snackbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import WelcomeMessage from "../components/ui/WelcomeMessage";
import CurvedBackground from "../components/ui/CurvedBackground";
import TermsAndConditionsCheckbox from "../components/ui/TermsAndConditionsCheckbox";

export default function App() {
  const [mobileNumber, setMobileNumber] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const theme = useTheme();

  // Countdown timer for resend
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Phone number validation
  const validatePhoneNumber = (phone: string) => {
    const digitsOnly = phone.replace(/\D/g, "");
    return digitsOnly.length === 11;
  };

  // Code validation
  const validateCode = (code: string) => {
    const digitsOnly = code.replace(/\D/g, "");
    return digitsOnly.length === 6;
  };

  const handlePhoneChange = (text: string) => {
    // Only allow digits
    const digitsOnly = text.replace(/\D/g, "");
    setMobileNumber(digitsOnly);

    // Clear error when user starts typing
    if (phoneError) setPhoneError("");
    if (generalError) setGeneralError("");

    // Show error if not 11 digits and user has finished typing
    if (digitsOnly.length > 0 && digitsOnly.length !== 11) {
      setPhoneError("Enter the correct phone number");
    } else {
      setPhoneError("");
    }
  };

  const handleCodeChange = (text: string) => {
    // Only allow digits
    const digitsOnly = text.replace(/\D/g, "");
    setSmsCode(digitsOnly);

    // Clear error when user starts typing
    if (codeError) setCodeError("");
    if (generalError) setGeneralError("");

    // Show error if not 6 digits and user has finished typing
    if (digitsOnly.length > 0 && digitsOnly.length !== 6) {
      setCodeError("Enter the correct OTP");
    } else {
      setCodeError("");
    }
  };

  const handleNext = async () => {
    Keyboard.dismiss();

    if (!agreedToTerms) {
      setGeneralError("Please agree to Terms of Service and Privacy Policy");
      return;
    }

    setIsLoading(true);
    setGeneralError("");

    // Simulate SMS sending (replace with actual implementation)
    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // For testing: randomly succeed or fail SMS sending
      const shouldFail = Math.random() > 0.8; // 20% chance to fail

      if (shouldFail) {
        setGeneralError(
          "Verification code sending failed. Please check your phone number and try again."
        );
        setIsLoading(false);
        return;
      }

      setCodeSent(true);
      setCountdown(59);
      setIsLoading(false);
    } catch {
      setGeneralError(
        "Verification code sending failed. Please check your phone number and try again."
      );
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    Keyboard.dismiss();

    if (!validateCode(smsCode)) {
      setCodeError("Enter the correct OTP");
      return;
    }

    setIsLoading(true);
    setGeneralError("");

    // For testing: always show invalid code error
    setTimeout(() => {
      setGeneralError("Invalid verification code. Please try again.");
      setIsLoading(false);
    }, 1000);
  };

  const handleResend = () => {
    setCountdown(59);
    setGeneralError("");
    // TODO: Implement resend logic
  };

  const handleChangePhoneNumber = () => {
    // Reset to initial state
    setCodeSent(false);
    setMobileNumber("");
    setSmsCode("");
    setPhoneError("");
    setCodeError("");
    setGeneralError("");
    setCountdown(0);
  };

  const isPhoneValid = validatePhoneNumber(mobileNumber);
  const isCodeValid = validateCode(smsCode);
  const nextButtonEnabled = isPhoneValid && !isLoading;
  const signInButtonEnabled = isCodeValid && !isLoading;

  return (
    <CurvedBackground>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.content}>
              {/* Welcome Message */}
              <WelcomeMessage />

              {/* Authentication Card */}
              <Card
                style={[styles.authCard, { backgroundColor: theme.colors.surface }]}
                elevation={4}>
                <Card.Content style={styles.cardContent}>
                  {/* Phone Number Input */}
                  <TextInput
                    mode="flat"
                    label="Phone Number"
                    placeholder="Enter 11-digit phone number"
                    value={mobileNumber}
                    onChangeText={handlePhoneChange}
                    keyboardType="number-pad"
                    textContentType="telephoneNumber"
                    maxLength={11}
                    error={!!phoneError}
                    disabled={codeSent}
                    placeholderTextColor={theme.colors.backdrop}
                  />
                  <HelperText type="error" visible={!!phoneError}>
                    {phoneError}
                  </HelperText>
                  {/* Change Phone Number Button - Show after Next is pressed */}
                  {codeSent && (
                    <Button mode="text" onPress={handleChangePhoneNumber} style={styles.helpButton}>
                      <Text style={styles.helpButtonText}>Change Phone Number</Text>
                    </Button>
                  )}

                  {/* Code Input - Show after Next is pressed */}
                  {codeSent && (
                    <>
                      <TextInput
                        mode="flat"
                        label="Verification Code"
                        placeholder="Enter 6-digit code"
                        value={smsCode}
                        onChangeText={handleCodeChange}
                        keyboardType="number-pad"
                        textContentType="oneTimeCode"
                        maxLength={6}
                        error={!!codeError}
                        placeholderTextColor={theme.colors.backdrop}
                      />
                      <HelperText type="error" visible={!!codeError}>
                        {codeError}
                      </HelperText>

                      {countdown > 0 ? (
                        <Text style={[styles.countdownText]}>Resend in {countdown} seconds...</Text>
                      ) : (
                        <Button mode="text" onPress={handleResend} style={styles.helpButton}>
                          <Text style={styles.helpButtonText}>Resend</Text>
                        </Button>
                      )}
                    </>
                  )}

                  {/* Action Button */}
                  <Button
                    mode="contained"
                    onPress={codeSent ? handleSignIn : handleNext}
                    loading={isLoading}
                    disabled={codeSent ? !signInButtonEnabled : !nextButtonEnabled}
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: (codeSent ? !signInButtonEnabled : !nextButtonEnabled)
                          ? theme.colors.secondaryContainer
                          : theme.colors.secondary,
                      },
                    ]}
                    contentStyle={styles.buttonContent}
                    labelStyle={{
                      color: (codeSent ? !signInButtonEnabled : !nextButtonEnabled)
                        ? theme.colors.onSecondaryContainer
                        : theme.colors.onSecondary,
                      fontWeight: "bold",
                    }}>
                    {codeSent ? "Sign In / Register" : "Next"}
                  </Button>

                  {/* Terms and Conditions Checkbox */}
                  <TermsAndConditionsCheckbox
                    checked={agreedToTerms}
                    onPress={() => setAgreedToTerms(!agreedToTerms)}
                    disabled={codeSent}
                  />
                </Card.Content>
              </Card>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Error Snackbar */}
      <Snackbar
        visible={!!generalError}
        onDismiss={() => setGeneralError("")}
        duration={2000}
        action={{
          label: "OK",
          onPress: () => setGeneralError(""),
        }}
        style={{ backgroundColor: theme.colors.errorContainer }}>
        <Text style={{ color: theme.colors.onErrorContainer }}>{generalError}</Text>
      </Snackbar>
    </CurvedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
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
    paddingTop: 24,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  helpButton: {
    alignSelf: "flex-end",
    marginTop: -28,
    marginRight: -10,
    marginBottom: 8,
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
  actionButton: {
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 6,
  },
  buttonContent: {
    height: 52,
  },
});
