import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

export default function WelcomeMessage() {
  const theme = useTheme();
  
  const styles = StyleSheet.create({
    container: {
      alignItems: "flex-start",
      marginBottom: 48,
    },
    welcomeText: {
      color: theme.colors.onPrimary,
      fontWeight: "500",
    },
    appName: {
      color: theme.colors.secondary,
      fontSize: 30,
      fontWeight: "bold",
    },
    slogan: {
      color: theme.colors.onPrimary,
      textAlign: "left",
      marginTop: 8,
    },
  });

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium" style={styles.welcomeText}>
        Welcome to <Text style={styles.appName}>LawTime</Text>
      </Text>
      <Text variant="bodyLarge" style={styles.slogan}>
        Your zero-entry schedule is waiting
      </Text>
    </View>
  );
}