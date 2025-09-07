import React from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { Text, Snackbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import WelcomeMessage from "@/components/auth/WelcomeMessage";
import CurvedBackground from "@/components/auth/CurvedBackground";
import AuthCard from "@/components/auth/AuthCard";
import useAuth from "@/hooks/auth/useAuth";
import { useAppTheme } from "@/theme/ThemeProvider";

export default function Auth() {
  const {
    mobileNumber,
    smsCode,
    codeSent,
    isAuthenticating,
    agreedToTerms,
    phoneError,
    codeError,
    generalError,
    countdown,
    nextButtonEnabled,
    signInButtonEnabled,
    handlePhoneChange,
    handleCodeChange,
    handleNext,
    handleSignIn,
    handleResend,
    handleChangePhoneNumber,
    setAgreedToTerms,
    setGeneralError,
  } = useAuth();

  const { theme } = useAppTheme();

  const handleAction = () => {
    Keyboard.dismiss();
    if (codeSent) {
      handleSignIn();
    } else {
      handleNext();
    }
  };

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
              <AuthCard
                mobileNumber={mobileNumber}
                onPhoneChange={handlePhoneChange}
                phoneError={phoneError}
                codeSent={codeSent}
                smsCode={smsCode}
                onCodeChange={handleCodeChange}
                codeError={codeError}
                countdown={countdown}
                onResend={handleResend}
                onChangePhoneNumber={handleChangePhoneNumber}
                onAction={handleAction}
                isLoading={isAuthenticating}
                actionEnabled={codeSent ? signInButtonEnabled : nextButtonEnabled}
                actionTitle={codeSent ? "Sign In / Register" : "Next"}
                agreedToTerms={agreedToTerms}
                onTermsChange={setAgreedToTerms}
              />
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Error Snackbar */}
      <Snackbar
        visible={!!generalError}
        onDismiss={() => setGeneralError("")}
        duration={2000}
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
});
