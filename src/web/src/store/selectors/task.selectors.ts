/**
 * @fileoverview Redux selectors for task-related state management
 * Provides memoized selectors for accessing and computing task data with optimal performance
 * @version 1.0.0
 */

import { createSelector } from '@reduxjs/toolkit'; // v2.0.0
import { RootState } from '../../types/store.types';
import { Task, TaskStatus } from '../../types/task.types';
import { Priority } from '../../types/common.types';

/**
 * Base selector to access the tasks slice of state
 */
export const selectTasks = (state: RootState): Task[] => state.tasks.items;

/**
 * Select currently selected task
 */
export const selectSelectedTask = (state: RootState): Task | null => 
  state.tasks.selectedTask;

/**
 * Select task filters
 */
export const selectTaskFilters = (state: RootState) => state.tasks.filters;

/**
 * Select tasks loading state
 */
export const selectTasksLoading = (state: RootState): boolean => 
  state.tasks.loading === 'loading';

/**
 * Select task error state
 */
export const selectTaskError = (state: RootState): string | null => 
  state.tasks.error?.message || null;

/**
 * Memoized selector for filtered tasks based on current filters
 * Optimized for performance with careful memoization
 */
export const selectFilteredTasks = createSelector(
  [selectTasks, selectTaskFilters],
  (tasks, filters): Task[] => {
    if (!tasks.length) return [];

    return tasks.filter(task => {
      // Status filter
      if (filters.status?.length && !filters.status.includes(task.status)) {
        return false;
      }

      // Priority filter
      if (filters.priority?.length && !filters.priority.includes(task.priority)) {
        return false;
      }

      // Assignee filter
      if (filters.assigneeId && task.assigneeId !== filters.assigneeId) {
        return false;
      }

      // Project filter
      if (filters.projectId && task.projectId !== filters.projectId) {
        return false;
      }

      // Date range filter
      if (filters.startDate && new Date(task.startDate) < filters.startDate) {
        return false;
      }
      if (filters.endDate && new Date(task.dueDate) > filters.endDate) {
        return false;
      }

      // Search query filter
      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        return (
          task.title.toLowerCase().includes(searchLower) ||
          task.description.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }
);

/**
 * Memoized selector for tasks grouped by status
 * Useful for kanban board views and status-based analytics
 */
export const selectTasksByStatus = createSelector(
  [selectTasks],
  (tasks): Record<TaskStatus, Task[]> => {
    const initial: Record<TaskStatus, Task[]> = {
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.IN_REVIEW]: [],
      [TaskStatus.BLOCKED]: [],
      [TaskStatus.COMPLETED]: []
    };

    return tasks.reduce((acc, task) => {
      acc[task.status].push(task);
      return acc;
    }, initial);
  }
);

/**
 * Interface for comprehensive task statistics
 */
interface TaskStats {
  totalTasks: number;
  tasksByStatus: Record<TaskStatus, number>;
  tasksByPriority: Record<Priority, number>;
  completionRate: number;
  averageCompletionTime: number;
  overdueTasks: number;
}

/**
 * Memoized selector for computing comprehensive task statistics
 * Optimized for performance with single pass calculations
 */
export const selectTaskStats = createSelector(
  [selectTasks],
  (tasks): TaskStats => {
    const now = new Date();
    const stats: TaskStats = {
      totalTasks: tasks.length,
      tasksByStatus: {
        [TaskStatus.TODO]: 0,
        [TaskStatus.IN_PROGRESS]: 0,
        [TaskStatus.IN_REVIEW]: 0,
        [TaskStatus.BLOCKED]: 0,
        [TaskStatus.COMPLETED]: 0
      },
      tasksByPriority: {
        [Priority.LOW]: 0,
        [Priority.MEDIUM]: 0,
        [Priority.HIGH]: 0,
        [Priority.URGENT]: 0
      },
      completionRate: 0,
      averageCompletionTime: 0,
      overdueTasks: 0
    };

    let totalCompletionTime = 0;
    let completedTasks = 0;

    tasks.forEach(task => {
      // Count by status
      stats.tasksByStatus[task.status]++;

      // Count by priority
      stats.tasksByPriority[task.priority]++;

      // Calculate completion metrics
      if (task.status === TaskStatus.COMPLETED && task.completedAt) {
        completedTasks++;
        totalCompletionTime += new Date(task.completedAt).getTime() - 
          new Date(task.startDate).getTime();
      }

      // Count overdue tasks
      if (task.status !== TaskStatus.COMPLETED && 
          new Date(task.dueDate) < now) {
        stats.overdueTasks++;
      }
    });

    // Calculate derived statistics
    stats.completionRate = tasks.length ? 
      (completedTasks / tasks.length) * 100 : 0;
    
    stats.averageCompletionTime = completedTasks ? 
      totalCompletionTime / completedTasks / (1000 * 60 * 60) : 0; // Convert to hours

    return stats;
  }
);