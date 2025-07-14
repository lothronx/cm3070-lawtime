import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Text, Surface, List } from "react-native-paper";
import { useAppTheme } from "@/theme/ThemeProvider";

type AlertTimeOption = {
  label: string;
  value: number;
};

const alertTimeOptions: AlertTimeOption[] = [
  { label: "15 minutes before", value: 15 },
  { label: "30 minutes before", value: 30 },
  { label: "1 hour before", value: 60 },
  { label: "2 hours before", value: 120 },
  { label: "1 day before", value: 1440 },
  { label: "2 days before", value: 2880 },
  { label: "1 week before", value: 10080 },
  { label: "2 weeks before", value: 20160 },
  { label: "3 weeks before", value: 30240 },
  { label: "4 weeks before", value: 40320 },
  { label: "5 weeks before", value: 50400 },
  { label: "6 weeks before", value: 60480 },
];

interface AlertTimePickerProps {
  selectedValue: number;
  onValueChange: (value: number) => void;
}

const AlertTimePicker: React.FC<AlertTimePickerProps> = ({ selectedValue, onValueChange }) => {
  const { theme } = useAppTheme();
  const [showAlertPicker, setShowAlertPicker] = React.useState(false);

  const selectedAlertOption = 
    alertTimeOptions.find((option) => option.value === selectedValue) || alertTimeOptions[2];

  const handleOptionPress = (value: number) => {
    onValueChange(value);
    setShowAlertPicker(false);
  };

  return (
    <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={1}>
      <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        Notification Preferences
      </Text>

      <View style={styles.pickerContainer}>
        <List.Accordion
          title="Default Alert Time"
          description={selectedAlertOption.label}
          expanded={showAlertPicker}
          onPress={() => setShowAlertPicker(!showAlertPicker)}
          style={[styles.accordion, { backgroundColor: theme.colors.surfaceVariant }]}>
          <ScrollView 
            style={styles.optionsScrollView}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}>
            {alertTimeOptions.map((option) => (
              <List.Item
                key={option.value}
                title={option.label}
                onPress={() => handleOptionPress(option.value)}
                style={{
                  backgroundColor:
                    option.value === selectedValue
                      ? theme.colors.primaryContainer
                      : theme.colors.surface,
                }}
                titleStyle={{
                  color:
                    option.value === selectedValue
                      ? theme.colors.onPrimaryContainer
                      : theme.colors.onSurface,
                }}
              />
            ))}
          </ScrollView>
        </List.Accordion>
      </View>
    </Surface>
  );
};

export default AlertTimePicker;

const styles = StyleSheet.create({
  section: {
    borderRadius: 12,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  pickerContainer: {
    marginBottom: 8,
  },
  accordion: {
    borderRadius: 8,
  },
  optionsScrollView: {
    maxHeight: 240,
  },
});