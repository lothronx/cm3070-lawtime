import React, { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { Text } from "react-native-paper";
import { ExpandableCalendar, CalendarProvider } from "react-native-calendars";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";
import Header from "@/components/Header";
import { TaskWithClient } from "@/types";
import TaskItem from "@/components/tasks/TaskItem";
import { useTasks } from "@/hooks/useTasks";
import { taskService } from "@/services/taskService";

export default function Calendar() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const { tasks, isLoading, isError, error, refetch } = useTasks();

  // Create marked dates object from real tasks
  const markedDates = useMemo(() => {
    const marked: { [key: string]: any } = {};

    tasks.forEach((task) => {
      if (task.event_time) {
        const date = new Date(task.event_time).toISOString().split("T")[0];
        if (!marked[date]) {
          marked[date] = { marked: true, dots: [] };
        }

        // Dot color based on selection state and completion status
        let dotColor: string;
        dotColor = task.completed_at
          ? theme.colors.onSurfaceDisabled // Completed tasks (muted)
          : theme.colors.secondary; // Active tasks (prominent)

        marked[date].dots.push({ color: dotColor, selectedDotColor: theme.colors.onSecondary });
      }
    });

    // Mark selected date
    if (marked[selectedDate]) {
      marked[selectedDate].selected = true;
    } else {
      marked[selectedDate] = { selected: true };
    }

    return marked;
  }, [
    tasks,
    selectedDate,
    theme.colors.onSurfaceDisabled,
    theme.colors.primary,
    theme.colors.onSecondary,
  ]);

  // Get tasks for selected date
  const selectedDateTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (!task.event_time) return false;
        const taskDate = new Date(task.event_time).toISOString().split("T")[0];
        return taskDate === selectedDate;
      })
      .sort((a, b) => {
        if (!a.event_time || !b.event_time) return 0;
        return new Date(a.event_time).getTime() - new Date(b.event_time).getTime();
      });
  }, [tasks, selectedDate]);

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

  const handleEdit = (task: TaskWithClient) => {
    console.log("Navigating to edit task:", task.title);
    router.push(`/task?taskId=${task.id}`);
  };

  const handleDelete = async (taskId: number) => {
    try {
      await taskService.deleteTask(taskId);
      // Refetch tasks to update the UI
      refetch();
    } catch (err) {
      Alert.alert("Error", "Failed to delete task. Please try again.");
      console.error("Error deleting task:", err);
    }
  };

  const getTaskColor = (task: TaskWithClient) => {
    // Color logic based on task status
    if (task.completed_at) {
      return theme.colors.onSurfaceDisabled;
    }
    if (task.event_time && new Date(task.event_time) < new Date()) {
      return theme.colors.error; // Overdue
    }
    return theme.colors.primary; // Normal
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Calendar" variant="main" />
        <View style={styles.centerContainer}>
          <Text style={[styles.indicatorText, { color: theme.colors.onSurfaceVariant }]}>
            Loading calendar...
          </Text>
        </View>
      </View>
    );
  }

  // Error state
  if (isError) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Header title="Calendar" variant="main" />
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Calendar" variant="main" />

      <CalendarProvider
        date={selectedDate}
        onDateChanged={setSelectedDate}
        showTodayButton={true}
        disabledOpacity={0.5}>
        <ExpandableCalendar
          markedDates={markedDates}
          markingType={"multi-dot"}
          initialPosition={ExpandableCalendar.positions.OPEN}
          disablePan={true}
          hideKnob={true}
          theme={{
            backgroundColor: theme.colors.background,
            calendarBackground: theme.colors.background,
            textSectionTitleColor: theme.colors.scrim,
            textSectionTitleDisabledColor: theme.colors.onSurfaceDisabled,
            selectedDayBackgroundColor: theme.colors.secondary,
            selectedDayTextColor: theme.colors.onSecondary,
            todayTextColor: theme.colors.secondary,
            dayTextColor: theme.colors.onSurface,
            textDisabledColor: theme.colors.onSurfaceDisabled,
            arrowColor: theme.colors.secondary,
            disabledArrowColor: theme.colors.onSurfaceDisabled,
            monthTextColor: theme.colors.primary,
            indicatorColor: theme.colors.primary,
            textMonthFontSize: 18,
            textMonthFontWeight: "500",
            textDayFontWeight: "400",
          }}
        />

        <ScrollView
          style={styles.tasksList}
          contentContainerStyle={[styles.tasksContent, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={true}>
          {selectedDateTasks.length > 0 ? (
            <View style={styles.tasksContainer}>
              <Text
                variant="titleMedium"
                style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
                {new Date(selectedDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
              {selectedDateTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  color={getTaskColor(task)}
                  onToggleComplete={handleToggleComplete}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text
                variant="titleMedium"
                style={[styles.emptyTitle, { color: theme.colors.onSurfaceVariant }]}>
                No tasks scheduled
              </Text>
              <Text
                variant="bodyMedium"
                style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
                {new Date(selectedDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </View>
          )}
        </ScrollView>
      </CalendarProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
    paddingBottom: SPACING.xl * 4,
    paddingHorizontal: SPACING.md,
  },
  retryText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginTop: SPACING.md,
    textDecorationLine: "underline",
  },
  tasksList: {
    flex: 1,
  },
  tasksContent: {
    flexGrow: 1,
  },
  tasksContainer: {
    paddingTop: SPACING.md,
  },
  sectionTitle: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
  },
  emptyTitle: {
    textAlign: "center",
    marginBottom: SPACING.xs,
    fontWeight: "600",
  },
  emptySubtitle: {
    textAlign: "center",
  },
});
