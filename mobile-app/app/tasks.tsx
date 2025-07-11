import React, { useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text } from "react-native-paper";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";
import ActionMenu from "@/components/navigation/ActionMenu";
import Header from "@/components/Header";
import TaskSection from "@/components/tasks/TaskSection";
import { mockTasks, TaskWithClient } from "@/mockData";

export default function Tasks() {
  const { theme } = useAppTheme();
  const [tasks, setTasks] = useState<TaskWithClient[]>(mockTasks);

  const handleToggleComplete = (taskId: number, completedAt: string | null) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === taskId ? { ...task, completed_at: completedAt } : task))
    );
  };

  const handleTaskEdit = (task: TaskWithClient) => {
    console.log("Task pressed:", task.title);
    // Navigate to edit task screen
  };

  const handleDeleteTask = (taskId: number) => {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
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

      <ActionMenu />
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
