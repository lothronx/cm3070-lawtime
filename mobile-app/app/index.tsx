import React, { useState } from "react";
import { View, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Text, TextInput, Button, Card, Surface, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import WelcomeMessage from "../components/WelcomeMessage";
import CurvedBackground from "../components/CurvedBackground";

export default function App() {
  const [mobileNumber, setMobileNumber] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const theme = useTheme();

  const handleSendCode = () => {
    // TODO: Implement SMS code sending logic
    setCodeSent(true);
    setStatusMessage("Code sent to your mobile number");
  };

  const handleLogin = () => {
    // TODO: Implement login/verification logic
    setStatusMessage("Verifying...");
  };

  return (
    <CurvedBackground>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}>
          <View style={styles.content}>
            {/* Welcome Message */}
            <WelcomeMessage />
            {/* Authentication Card */}
            <Card style={styles.authCard}>
              <Card.Content style={styles.cardContent}>
                {/* Mobile Number Input */}
                <TextInput
                  mode="outlined"
                  label="Mobile Number"
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  disabled={codeSent}
                  style={styles.input}
                  theme={{ colors: theme.colors }}
                />

                {/* Send Code Button */}
                {!codeSent && (
                  <Button
                    mode="contained"
                    onPress={handleSendCode}
                    loading={isLoading && !codeSent}
                    disabled={!mobileNumber.trim() || isLoading}
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                    theme={{ colors: theme.colors }}>
                    Send Code
                  </Button>
                )}

                {/* SMS Code Input */}
                {codeSent && (
                  <>
                    <TextInput
                      mode="outlined"
                      label="SMS Code"
                      value={smsCode}
                      onChangeText={setSmsCode}
                      keyboardType="number-pad"
                      textContentType="oneTimeCode"
                      autoComplete="sms-otp"
                      maxLength={6}
                      style={styles.input}
                      theme={{ colors: theme.colors }}
                    />

                    {/* Login / Sign Up Button */}
                    <Button
                      mode="contained"
                      onPress={handleLogin}
                      loading={isLoading && codeSent}
                      disabled={!smsCode.trim() || isLoading}
                      style={styles.button}
                      contentStyle={styles.buttonContent}
                      theme={{ colors: theme.colors }}>
                      Login / Sign Up
                    </Button>
                  </>
                )}

                {/* Status Messages */}
                {statusMessage && (
                  <Surface style={styles.statusContainer}>
                    <Text
                      variant="bodyMedium"
                      style={[styles.statusText, { color: theme.colors.onSurfaceVariant }]}>
                      {statusMessage}
                    </Text>
                  </Surface>
                )}
              </Card.Content>
            </Card>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  authCard: {
    backgroundColor: "white",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  input: {
    marginBottom: 16,
    backgroundColor: "white",
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
  },
  buttonContent: {
    height: 48,
  },
  statusContainer: {
    backgroundColor: "#f5f5f5",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  statusText: {
    textAlign: "center",
    fontStyle: "italic",
  },
});