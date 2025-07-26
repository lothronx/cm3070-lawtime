import React from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { Text } from "react-native-paper";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";
import Header from "@/components/Header";
import TaskSection from "@/components/tasks/TaskSection";
import { useTasks } from "@/hooks/useTasks";
import { taskService } from "@/services/taskService";
import { TaskWithClient } from "@/types";

export default function Tasks() {
  const { theme } = useAppTheme();
  const { tasks, isLoading, isError, error, refetch } = useTasks();

  const handleToggleComplete = async (taskId: number, completedAt: string | null) => {
    try {
      if (completedAt) {
        // Mark as completed
        await taskService.completeTask(taskId);
      } else {
        // Mark as incomplete
        await taskService.uncompleteTask(taskId);
      }
      // Refetch tasks to update the UI
      refetch();
    } catch (err) {
      Alert.alert("Error", "Failed to update task status. Please try again.");
      console.error("Error updating task:", err);
    }
  };

  const handleTaskEdit = (task: TaskWithClient) => {
    console.log("Task pressed:", task.title);
    // TODO: Navigate to edit task screen
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await taskService.deleteTask(taskId);
      // Refetch tasks to update the UI
      refetch();
    } catch (err) {
      Alert.alert("Error", "Failed to delete task. Please try again.");
      console.error("Error deleting task:", err);
    }
  };

  // Separate and sort tasks into sections
  const unscheduledTasks = tasks
    .filter((task) => !task.completed_at && !task.event_time)
    .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime());

  const upcomingTasks = tasks
    .filter((task) => !task.completed_at && task.event_time)
    .sort((a, b) => new Date(a.event_time!).getTime() - new Date(b.event_time!).getTime());

  const completedTasks = tasks
    .filter((task) => task.completed_at)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime());

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Tasks" variant="main" />
        <View style={styles.centerContainer}>
          <Text style={[styles.indicatorText, { color: theme.colors.onSurfaceVariant }]}>
            Loading tasks...
          </Text>
        </View>
      </View>
    );
  }

  // Error state
  if (isError) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Tasks" variant="main" />
        <View style={styles.centerContainer}>
          <Text style={[styles.indicatorText, { color: theme.colors.error }]}>
            Error loading tasks: {error?.message}
          </Text>
          <Text
            style={[styles.retryText, { color: theme.colors.primary }]}
            onPress={() => refetch()}>
            Tap to retry
          </Text>
        </View>
      </View>
    );
  }

  // Empty state
  if (tasks.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Tasks" variant="main" />
        <View style={styles.centerContainer}>
          <Text style={[styles.indicatorText, { color: theme.colors.onSurfaceVariant }]}>
            No tasks yet. Use the action menu below to create your first task.
          </Text>
        </View>
      </View>
    );
  }

  // Main content with tasks
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Tasks" variant="main" />

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Unscheduled Tasks Section */}
        <TaskSection
          title="Unscheduled"
          tasks={unscheduledTasks}
          color={theme.colors.secondary}
          onToggleComplete={handleToggleComplete}
          onEdit={handleTaskEdit}
          onDelete={handleDeleteTask}
        />

        {/* Upcoming Tasks Section */}
        <TaskSection
          title="Upcoming"
          tasks={upcomingTasks}
          color={theme.colors.primary}
          onToggleComplete={handleToggleComplete}
          onEdit={handleTaskEdit}
          onDelete={handleDeleteTask}
        />

        {/* Completed Tasks Section */}
        <TaskSection
          title="Completed"
          tasks={completedTasks}
          color={theme.colors.onSurfaceDisabled}
          defaultExpanded={false}
          onToggleComplete={handleToggleComplete}
          onEdit={handleTaskEdit}
          onDelete={handleDeleteTask}
        />

        {/* Bottom spacing for action menu */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
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
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
  },
  indicatorText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  retryText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginTop: SPACING.md,
    textDecorationLine: "underline",
  },
  bottomSpacing: {
    height: 160, // Space for action menu
  },
});
