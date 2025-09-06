import { TaskWithClient, ProposedTask } from '@/types';

/**
 * Task Form Utilities
 * 
 * Centralized utilities for converting various task data formats
 * to form-compatible values, eliminating duplication across components.
 */

/**
 * Convert any task-like object to TaskWithClient form format
 * Handles null/undefined values and provides consistent defaults
 */
export function taskToFormValues(task: Partial<TaskWithClient | ProposedTask> | null | undefined): Partial<TaskWithClient> {
  if (!task) {
    return getEmptyFormValues();
  }

  return {
    title: task.title || "",
    client_name: getClientName(task),
    event_time: task.event_time || null,
    location: task.location || null,
    note: task.note || null,
  };
}

/**
 * Get empty form values (for new tasks)
 */
export function getEmptyFormValues(): Partial<TaskWithClient> {
  return {
    title: "",
    client_name: "",
    event_time: null,
    location: null,
    note: null,
  };
}

/**
 * Extract client name from different task formats
 * Handles both TaskWithClient and ProposedTask structures
 */
function getClientName(task: Partial<TaskWithClient | ProposedTask>): string {
  // Direct client_name (TaskWithClient format)
  if ('client_name' in task && task.client_name) {
    return task.client_name;
  }
  
  // Nested client_resolution (ProposedTask format)
  if ('client_resolution' in task && task.client_resolution?.client_name) {
    return task.client_resolution.client_name;
  }
  
  return "";
}

/**
 * Type guard to check if we're dealing with a ProposedTask
 */
export function isProposedTask(task: any): task is ProposedTask {
  return task && 'client_resolution' in task;
}

/**
 * Type guard to check if we're dealing with a TaskWithClient
 */
export function isTaskWithClient(task: any): task is TaskWithClient {
  return task && 'client_name' in task;
}