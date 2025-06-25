import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Text, TextInput, Button, Card, useTheme, HelperText, Snackbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import WelcomeMessage from "../components/ui/WelcomeMessage";
import CurvedBackground from "../components/ui/CurvedBackground";

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
    if (!validatePhoneNumber(mobileNumber)) {
      setPhoneError("Enter the correct phone number");
      return;
    }

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

  // Custom Checkbox Component
  const CustomCheckbox = ({ checked, onPress }: { checked: boolean; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} style={styles.customCheckbox}>
      <View
        style={[
          styles.checkboxOuter,
          { borderColor: checked ? theme.colors.primary : theme.colors.outline },
        ]}>
        {checked && (
          <View style={[styles.checkboxInner, { backgroundColor: theme.colors.primary }]} />
        )}
      </View>
    </TouchableOpacity>
  );

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
                    mode="outlined"
                    label="Phone Number"
                    placeholder="Enter 11-digit phone number"
                    value={mobileNumber}
                    onChangeText={handlePhoneChange}
                    keyboardType="number-pad"
                    maxLength={11}
                    error={!!phoneError}
                    disabled={codeSent}
                    style={[
                      styles.input,
                      {
                        backgroundColor: codeSent
                          ? theme.colors.surfaceVariant
                          : theme.colors.surface,
                      },
                    ]}
                    outlineColor={theme.colors.outline}
                    activeOutlineColor={theme.colors.primary}
                    textColor={codeSent ? theme.colors.onSurfaceVariant : theme.colors.onSurface}
                  />
                  <HelperText type="error" visible={!!phoneError}>
                    {phoneError}
                  </HelperText>

                  {/* Change Phone Number Button - Show after Next is pressed */}
                  {codeSent && (
                    <Button
                      mode="text"
                      onPress={handleChangePhoneNumber}
                      textColor={theme.colors.primary}
                      style={styles.changePhoneButton}>
                      Change Phone Number
                    </Button>
                  )}

                  {/* Code Input - Show after Next is pressed */}
                  {codeSent && (
                    <>
                      <TextInput
                        mode="outlined"
                        label="Verification Code"
                        placeholder="Enter 6-digit code"
                        value={smsCode}
                        onChangeText={handleCodeChange}
                        keyboardType="number-pad"
                        maxLength={6}
                        error={!!codeError}
                        style={[styles.input, { backgroundColor: theme.colors.surface }]}
                        outlineColor={theme.colors.outline}
                        activeOutlineColor={theme.colors.primary}
                        textColor={theme.colors.onSurface}
                      />

                      {/* Countdown or Resend */}
                      <View style={styles.resendContainer}>
                        {countdown > 0 ? (
                          <Text
                            style={[
                              styles.countdownText,
                              { color: theme.colors.onSurfaceVariant },
                            ]}>
                            Resend in {countdown} seconds...
                          </Text>
                        ) : (
                          <Button
                            mode="text"
                            onPress={handleResend}
                            textColor={theme.colors.primary}
                            style={styles.resendButton}>
                            Resend
                          </Button>
                        )}
                      </View>

                      <HelperText type="error" visible={!!codeError}>
                        {codeError}
                      </HelperText>
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
                          ? theme.colors.surfaceVariant
                          : theme.colors.primary,
                      },
                    ]}
                    contentStyle={styles.buttonContent}
                    labelStyle={{
                      color: (codeSent ? !signInButtonEnabled : !nextButtonEnabled)
                        ? theme.colors.onSurfaceVariant
                        : theme.colors.onPrimary,
                    }}>
                    {codeSent ? "Sign In / Register" : "Next"}
                  </Button>

                  {/* Terms and Conditions Checkbox */}
                  {!codeSent && (
                    <View style={styles.checkboxContainer}>
                      <CustomCheckbox
                        checked={agreedToTerms}
                        onPress={() => setAgreedToTerms(!agreedToTerms)}
                      />
                      <View style={styles.termsTextContainer}>
                        <Text style={[styles.checkboxText, { color: theme.colors.onSurface }]}>
                          I accept the{" "}
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            /* TODO: Navigate to Terms of Service */
                          }}>
                          <Text style={[styles.linkText, { color: theme.colors.primary }]}>
                            Terms of Service
                          </Text>
                        </TouchableOpacity>
                        <Text style={[styles.checkboxText, { color: theme.colors.onSurface }]}>
                          {" "}
                          and{" "}
                        </Text>
                        <TouchableOpacity
                          onPress={() => {
                            /* TODO: Navigate to Privacy Policy */
                          }}>
                          <Text style={[styles.linkText, { color: theme.colors.primary }]}>
                            Privacy Policy
                          </Text>
                        </TouchableOpacity>
                        <Text style={[styles.checkboxText, { color: theme.colors.onSurface }]}>
                          .
                        </Text>
                      </View>
                    </View>
                  )}
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
        duration={4000}
        action={{
          label: "Dismiss",
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
    backgroundColor: "transparent",
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
    paddingVertical: 28,
    paddingHorizontal: 24,
    gap: 16,
  },
  input: {
    marginBottom: 4,
  },
  changePhoneButton: {
    alignSelf: "flex-end",
    marginTop: -8,
    marginBottom: 8,
  },
  resendContainer: {
    alignItems: "flex-end",
    marginBottom: 8,
    marginTop: -4,
  },
  countdownText: {
    fontSize: 12,
    fontStyle: "italic",
  },
  resendButton: {
    margin: 0,
    padding: 0,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 8,
    paddingRight: 8,
  },
  customCheckbox: {
    paddingTop: 5,
    paddingLeft: 6,
  },
  checkboxOuter: {
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxInner: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  termsTextContainer: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginLeft: 8,
  },
  checkboxText: {
    fontSize: 14,
    lineHeight: 20,
  },
  linkText: {
    fontSize: 14,
    lineHeight: 20,
    textDecorationLine: "underline",
  },
  actionButton: {
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  buttonContent: {
    height: 52,
  },
});
