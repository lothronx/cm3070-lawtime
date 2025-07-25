import React, { useState, useMemo } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Text } from "react-native-paper";
import { ExpandableCalendar, CalendarProvider } from "react-native-calendars";
import { useAppTheme, SPACING } from "@/theme/ThemeProvider";
import Header from "@/components/Header";
import { mockTasks, TaskWithClient } from "@/mockData";
import TaskItem from "@/components/tasks/TaskItem";

export default function Calendar() {
  const { theme } = useAppTheme();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  // Create marked dates object from mock tasks
  const markedDates = useMemo(() => {
    const marked: { [key: string]: any } = {};

    mockTasks.forEach((task) => {
      if (task.event_time) {
        const date = new Date(task.event_time).toISOString().split("T")[0];
        if (!marked[date]) {
          marked[date] = { marked: true, dots: [] };
        }
        // Add dot for task (different colors for completed vs pending)
        const dotColor = task.completed_at ? theme.colors.onSurfaceDisabled : theme.colors.primary;
        marked[date].dots.push({ color: dotColor });
      }
    });

    // Mark selected date
    if (marked[selectedDate]) {
      marked[selectedDate].selected = true;
    } else {
      marked[selectedDate] = { selected: true };
    }

    return marked;
  }, [selectedDate, theme.colors.primary, theme.colors.onSurfaceDisabled]);

  // Get tasks for selected date
  const selectedDateTasks = useMemo(() => {
    return mockTasks
      .filter((task) => {
        if (!task.event_time) return false;
        const taskDate = new Date(task.event_time).toISOString().split("T")[0];
        return taskDate === selectedDate;
      })
      .sort((a, b) => {
        if (!a.event_time || !b.event_time) return 0;
        return new Date(a.event_time).getTime() - new Date(b.event_time).getTime();
      });
  }, [selectedDate]);

  const handleToggleComplete = (taskId: number, completedAt: string | null) => {
    console.log("Toggle complete:", taskId, completedAt);
    // TODO: Implement actual toggle functionality
  };

  const handleEdit = (task: TaskWithClient) => {
    console.log("Edit task:", task.id);
    // TODO: Navigate to task edit screen
  };

  const handleDelete = (taskId: number) => {
    console.log("Delete task:", taskId);
    // TODO: Implement delete functionality
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Header title="Calendar" variant="main" />

      <CalendarProvider
        date={selectedDate}
        onDateChanged={setSelectedDate}
        showTodayButton
        disabledOpacity={0.6}
        theme={{
          selectedDayBackgroundColor: theme.colors.primary,
          selectedDayTextColor: theme.colors.onPrimary,
          todayTextColor: theme.colors.primary,
          dayTextColor: theme.colors.onBackground,
          textDisabledColor: theme.colors.onSurfaceDisabled,
          dotColor: theme.colors.primary,
          selectedDotColor: theme.colors.onPrimary,
          arrowColor: theme.colors.primary,
          monthTextColor: theme.colors.onBackground,
          indicatorColor: theme.colors.primary,
          textDayFontWeight: "500",
          textMonthFontWeight: "600",
          textDayHeaderFontWeight: "600",
          textDayFontSize: 16,
          textMonthFontSize: 20,
          textDayHeaderFontSize: 14,
          backgroundColor: theme.colors.surface,
          calendarBackground: theme.colors.surface,
        }}>
        <ExpandableCalendar
          firstDay={1} // Monday first
          markedDates={markedDates}
          markingType={"multi-dot"}
          hideKnob={false}
          initialPosition="closed"
          calendarStyle={[styles.calendar, { backgroundColor: theme.colors.surface }]}
          headerStyle={[styles.calendarHeader, { backgroundColor: theme.colors.surface }]}
        />

        <ScrollView
          style={styles.tasksList}
          contentContainerStyle={styles.tasksContent}
          showsVerticalScrollIndicator={false}>
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
  calendar: {
    paddingLeft: SPACING.md,
    paddingRight: SPACING.md,
  },
  calendarHeader: {
    paddingLeft: SPACING.md,
    paddingRight: SPACING.md,
  },
  tasksList: {
    flex: 1,
  },
  tasksContent: {
    paddingBottom: 160, // Account for bottom navigation
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
    justifyContent: "center",
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
