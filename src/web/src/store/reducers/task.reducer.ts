/**
 * @fileoverview Redux reducer for task management with enterprise-grade features
 * Supports real-time updates, optimistic updates, and conflict resolution
 * @version 1.0.0
 */

import { createReducer } from '@reduxjs/toolkit'; // v2.0.0
import { produce } from 'immer'; // v10.0.0
import { Task } from '../../types/task.types';
import { TaskState, ErrorState } from '../../types/store.types';
import { LoadingState } from '../../types/common.types';

/**
 * Initial state for task management
 * Includes support for optimistic updates and WebSocket synchronization
 */
const initialState: TaskState = {
  items: [],
  selectedTask: null,
  loading: 'idle' as LoadingState,
  error: null,
  filters: {
    searchQuery: null,
    status: [],
    priority: [],
    assigneeId: null,
    projectId: null,
    startDate: null,
    endDate: null,
    showArchived: false
  },
  totalCount: 0,
  lastUpdated: null
};

/**
 * Task version conflict resolution
 * Handles conflicts between local and server task versions
 */
const resolveTaskConflict = (localTask: Task, serverTask: Task): Task => {
  // If server version is newer, use server version
  if (serverTask.version > localTask.version) {
    return serverTask;
  }
  
  // If versions are equal, preserve local changes
  if (serverTask.version === localTask.version) {
    return {
      ...localTask,
      version: localTask.version + 1
    };
  }
  
  // If local version is newer, keep local changes but increment version
  return {
    ...localTask,
    version: Math.max(localTask.version, serverTask.version) + 1
  };
};

/**
 * Task reducer with comprehensive state management
 * Handles all task-related actions including real-time updates
 */
const taskReducer = createReducer(initialState, (builder) => {
  builder
    // Set tasks with normalization
    .addCase('tasks/setTasks', (state, action) => {
      return produce(state, draft => {
        draft.items = action.payload.tasks;
        draft.totalCount = action.payload.totalCount;
        draft.lastUpdated = new Date();
        draft.loading = 'succeeded';
        draft.error = null;
      });
    })

    // Handle task selection with version checking
    .addCase('tasks/setSelectedTask', (state, action) => {
      return produce(state, draft => {
        const task = action.payload;
        if (task && state.selectedTask?.id === task.id) {
          draft.selectedTask = resolveTaskConflict(state.selectedTask, task);
        } else {
          draft.selectedTask = task;
        }
      });
    })

    // Apply task filters
    .addCase('tasks/setFilters', (state, action) => {
      return produce(state, draft => {
        draft.filters = {
          ...draft.filters,
          ...action.payload
        };
      });
    })

    // Handle optimistic task updates
    .addCase('tasks/optimisticUpdate', (state, action) => {
      return produce(state, draft => {
        const updatedTask = action.payload;
        const taskIndex = draft.items.findIndex(task => task.id === updatedTask.id);
        
        if (taskIndex !== -1) {
          // Store original task for potential rollback
          const originalTask = draft.items[taskIndex];
          draft.items[taskIndex] = {
            ...updatedTask,
            version: originalTask.version + 1
          };
          
          // Update selected task if it's the same
          if (draft.selectedTask?.id === updatedTask.id) {
            draft.selectedTask = draft.items[taskIndex];
          }
        }
      });
    })

    // Handle WebSocket task updates with conflict resolution
    .addCase('tasks/webSocketUpdate', (state, action) => {
      return produce(state, draft => {
        const serverTask = action.payload;
        const taskIndex = draft.items.findIndex(task => task.id === serverTask.id);
        
        if (taskIndex !== -1) {
          const localTask = draft.items[taskIndex];
          draft.items[taskIndex] = resolveTaskConflict(localTask, serverTask);
          
          // Update selected task if needed
          if (draft.selectedTask?.id === serverTask.id) {
            draft.selectedTask = resolveTaskConflict(draft.selectedTask, serverTask);
          }
        }
      });
    })

    // Handle successful task updates
    .addCase('tasks/updateSuccess', (state, action) => {
      return produce(state, draft => {
        const { taskId, updatedTask } = action.payload;
        const taskIndex = draft.items.findIndex(task => task.id === taskId);
        
        if (taskIndex !== -1) {
          draft.items[taskIndex] = updatedTask;
          if (draft.selectedTask?.id === taskId) {
            draft.selectedTask = updatedTask;
          }
        }
      });
    })

    // Handle failed task updates with rollback
    .addCase('tasks/updateFailure', (state, action) => {
      return produce(state, draft => {
        const { taskId, originalTask, error } = action.payload;
        const taskIndex = draft.items.findIndex(task => task.id === taskId);
        
        if (taskIndex !== -1 && originalTask) {
          draft.items[taskIndex] = originalTask;
          if (draft.selectedTask?.id === taskId) {
            draft.selectedTask = originalTask;
          }
        }
        
        draft.error = {
          message: error.message,
          code: error.code,
          details: error.details,
          timestamp: new Date(),
          isDisplayed: false
        };
      });
    })

    // Handle loading states
    .addCase('tasks/setLoadingState', (state, action) => {
      return produce(state, draft => {
        draft.loading = action.payload;
        if (action.payload === 'loading') {
          draft.error = null;
        }
      });
    })

    // Handle error states
    .addCase('tasks/setError', (state, action) => {
      return produce(state, draft => {
        draft.error = {
          message: action.payload.message,
          code: action.payload.code,
          details: action.payload.details,
          timestamp: new Date(),
          isDisplayed: false
        };
        draft.loading = 'failed';
      });
    })

    // Clear error state
    .addCase('tasks/clearError', (state) => {
      return produce(state, draft => {
        draft.error = null;
      });
    });
});

export default taskReducer;