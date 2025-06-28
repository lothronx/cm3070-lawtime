import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useForm } from "react-hook-form";
import Header from "@/components/Header";
import TitleInput from "@/components/task/TitleInput";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";

interface TaskFormData {
  title: string;
}

export default function App() {
  const { theme } = useAppTheme();
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormData>({
    defaultValues: {
      title: "",
    },
    mode: "onBlur", // Only validate after user leaves field
  });

  return (
    <SafeAreaProvider>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="New Task" variant="modal" />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <TitleInput control={control} name="title" error={errors.title} />
        </ScrollView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
});
