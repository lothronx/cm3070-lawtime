import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text } from "react-native-paper";
import { useAppTheme, SPACING } from "../theme/ThemeProvider";
import ActionMenu from "@/components/menu/ActionMenu";
import Header from "@/components/Header";
import TaskItem from "@/components/TaskItem";
import { mockTasks, TaskWithClient } from "@/mockData";

export default function Calendar() {
  const { theme } = useAppTheme();
  const [tasks, setTasks] = useState<TaskWithClient[]>(mockTasks);

  const handlePhotoLibrary = () => {
    console.log("Photo Library action pressed");
  };

  const handleTakePhoto = () => {
    console.log("Take Photo action pressed");
  };

  const handleChooseFile = () => {
    console.log("Choose File action pressed");
  };

  const handleMicrophonePressStart = () => {
    console.log("Microphone action pressed");
  };

  const handleMicrophonePressEnd = () => {
    console.log("Microphone action released");
  };

  const handleAddPress = () => {
    console.log("Add action pressed");
  };

  const handleToggleComplete = (taskId: number, isCompleted: boolean) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, is_completed: isCompleted } : task
      )
    );
  };

  const handleTaskPress = (task: TaskWithClient) => {
    console.log("Task pressed:", task.title);
    // Navigate to edit task screen
  };

  const handleDeleteTask = (taskId: number) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
  };

  // Separate tasks into sections
  const upcomingTasks = tasks.filter(task => !task.is_completed);
  const completedTasks = tasks.filter(task => task.is_completed);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Tasks" variant="modal" />

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Upcoming Tasks Section */}
        {upcomingTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
              Upcoming ({upcomingTasks.length})
            </Text>
            {upcomingTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onPress={handleTaskPress}
                onDelete={handleDeleteTask}
              />
            ))}
          </View>
        )}

        {/* Completed Tasks Section */}
        {completedTasks.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
              Completed ({completedTasks.length})
            </Text>
            {completedTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onPress={handleTaskPress}
                onDelete={handleDeleteTask}
              />
            ))}
          </View>
        )}

        {/* Empty State */}
        {tasks.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              No tasks yet. Use the action menu below to create your first task.
            </Text>
          </View>
        )}

        {/* Bottom spacing for action menu */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      <ActionMenu
        onPhotoLibrary={handlePhotoLibrary}
        onTakePhoto={handleTakePhoto}
        onChooseFile={handleChooseFile}
        onAudioHoldStart={handleMicrophonePressStart}
        onAudioHoldEnd={handleMicrophonePressEnd}
        onManualPress={handleAddPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  section: {
    marginTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: SPACING.sm,
    marginHorizontal: SPACING.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  bottomSpacing: {
    height: 160, // Space for action menu
  },
});
