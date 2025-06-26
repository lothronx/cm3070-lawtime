import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { CheckBox } from "react-native-elements";

interface TermsAndConditionsCheckboxProps {
  checked: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export default function TermsAndConditionsCheckbox({
  checked,
  onPress,
  disabled = false,
}: TermsAndConditionsCheckboxProps) {
  const theme = useTheme();

  const handleTermsPress = () => {
    // TODO: Navigate to Terms of Service
  };

  const handlePrivacyPress = () => {
    // TODO: Navigate to Privacy Policy
  };

  return (
    <View style={styles.checkboxContainer}>
      <CheckBox
        checked={checked}
        checkedColor={theme.colors.primary}
        disabled={disabled}
        onPress={onPress}
        size={14}
      />
      <View style={styles.termsTextContainer}>
        <Text style={[styles.checkboxText, { color: theme.colors.onSurface }]}>
          I accept the{" "}
        </Text>
        <TouchableOpacity onPress={handleTermsPress}>
          <Text style={[styles.linkText, { color: theme.colors.primary }]}>
            Terms of Service
          </Text>
        </TouchableOpacity>
        <Text style={[styles.checkboxText, { color: theme.colors.onSurface }]}>
          {" "}
          and{" "}
        </Text>
        <TouchableOpacity onPress={handlePrivacyPress}>
          <Text style={[styles.linkText, { color: theme.colors.primary }]}>
            Privacy Policy
          </Text>
        </TouchableOpacity>
        <Text style={[styles.checkboxText, { color: theme.colors.onSurface }]}>
          .
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  termsTextContainer: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
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
});