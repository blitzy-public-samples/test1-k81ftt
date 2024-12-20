import { createAction } from '@reduxjs/toolkit';
import axiosRetry from 'axios-retry'; // v3.8.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { Task, TaskFilters, TaskStatus } from '../../types/task.types';
import { LoadingState, ErrorResponse } from '../../types/common.types';
import { EventType } from '../../backend/src/types/event.types';
import WebSocketService from '../../services/websocket.service';
import { AppThunk } from '../store';
import { taskService } from '../../services/task.service';

// Action Types
export const SET_TASKS = 'tasks/setTasks';
export const SET_TASK = 'tasks/setTask';
export const REMOVE_TASK = 'tasks/removeTask';
export const SET_TASK_ERROR = 'tasks/setError';
export const SET_TASK_LOADING = 'tasks/setLoading';
export const MERGE_TASK_UPDATE = 'tasks/mergeUpdate';

// Action Creators
export const setTasks = createAction<{
  tasks: Task[];
  meta: {
    timestamp: number;
    source: 'http' | 'websocket';
    correlationId: string;
  };
}>(SET_TASKS);

export const setTask = createAction<{
  task: Task;
  meta: {
    timestamp: number;
    source: 'http' | 'websocket';
    correlationId: string;
  };
}>(SET_TASK);

export const removeTask = createAction<{
  taskId: string;
  meta: {
    timestamp: number;
    correlationId: string;
  };
}>(REMOVE_TASK);

export const setTaskError = createAction<{
  error: ErrorResponse;
  correlationId: string;
}>(SET_TASK_ERROR);

export const setTaskLoading = createAction<{
  state: LoadingState;
  correlationId: string;
}>(SET_TASK_LOADING);

export const mergeTaskUpdate = createAction<{
  task: Partial<Task>;
  meta: {
    timestamp: number;
    version: number;
    correlationId: string;
  };
}>(MERGE_TASK_UPDATE);

// Configure retry mechanism
axiosRetry(taskService.axiosInstance, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response?.status === 409); // Retry on conflict
  }
});

// Thunk Actions
export const fetchTasks = (
  page: number,
  limit: number,
  filters?: TaskFilters
): AppThunk => async (dispatch, getState) => {
  const correlationId = uuidv4();
  
  dispatch(setTaskLoading({ state: 'loading', correlationId }));
  
  let wsUnsubscribe: (() => void) | undefined;
  
  try {
    // Subscribe to real-time updates
    wsUnsubscribe = WebSocketService.subscribe(
      EventType.TASK_UPDATED,
      (update: { task: Task }) => {
        dispatch(mergeTaskUpdate({
          task: update.task,
          meta: {
            timestamp: Date.now(),
            version: update.task.version,
            correlationId
          }
        }));
      }
    );

    const response = await taskService.getTasks(page, limit, filters);
    
    dispatch(setTasks({
      tasks: response.data,
      meta: {
        timestamp: Date.now(),
        source: 'http',
        correlationId
      }
    }));
    
    dispatch(setTaskLoading({ state: 'succeeded', correlationId }));
    
  } catch (error) {
    dispatch(setTaskError({
      error: {
        code: error.code || 'TASK_FETCH_ERROR',
        message: error.message || 'Failed to fetch tasks',
        details: error.details
      },
      correlationId
    }));
    dispatch(setTaskLoading({ state: 'failed', correlationId }));
  }
  
  return () => {
    if (wsUnsubscribe) {
      wsUnsubscribe();
    }
  };
};

export const updateTask = (
  taskId: string,
  updates: Partial<Task>
): AppThunk => async (dispatch, getState) => {
  const correlationId = uuidv4();
  const currentTask = getState().tasks.entities[taskId];
  
  if (!currentTask) {
    dispatch(setTaskError({
      error: {
        code: 'TASK_NOT_FOUND',
        message: 'Cannot update non-existent task',
        details: { taskId }
      },
      correlationId
    }));
    return;
  }

  dispatch(setTaskLoading({ state: 'loading', correlationId }));

  try {
    const updatedTask = await taskService.updateTask(taskId, {
      ...updates,
      version: currentTask.version // Include version for optimistic concurrency
    });

    dispatch(setTask({
      task: updatedTask,
      meta: {
        timestamp: Date.now(),
        source: 'http',
        correlationId
      }
    }));

    // Emit WebSocket event for real-time updates
    WebSocketService.emit(EventType.TASK_UPDATED, {
      task: updatedTask,
      userId: getState().auth.userId
    }, true);

    dispatch(setTaskLoading({ state: 'succeeded', correlationId }));

  } catch (error) {
    if (error.response?.status === 409) {
      // Handle version conflict
      dispatch(fetchTasks(1, 1, { id: taskId })); // Refresh task data
    }
    
    dispatch(setTaskError({
      error: {
        code: error.code || 'TASK_UPDATE_ERROR',
        message: error.message || 'Failed to update task',
        details: error.details
      },
      correlationId
    }));
    dispatch(setTaskLoading({ state: 'failed', correlationId }));
  }
};

export const deleteTask = (taskId: string): AppThunk => async (dispatch, getState) => {
  const correlationId = uuidv4();
  
  dispatch(setTaskLoading({ state: 'loading', correlationId }));

  try {
    await taskService.deleteTask(taskId);
    
    dispatch(removeTask({
      taskId,
      meta: {
        timestamp: Date.now(),
        correlationId
      }
    }));

    WebSocketService.emit(EventType.TASK_DELETED, {
      taskId,
      userId: getState().auth.userId
    }, true);

    dispatch(setTaskLoading({ state: 'succeeded', correlationId }));

  } catch (error) {
    dispatch(setTaskError({
      error: {
        code: error.code || 'TASK_DELETE_ERROR',
        message: error.message || 'Failed to delete task',
        details: error.details
      },
      correlationId
    }));
    dispatch(setTaskLoading({ state: 'failed', correlationId }));
  }
};

// Helper function to handle WebSocket task updates
const handleTaskWebSocketUpdate = (
  currentTask: Task,
  update: Partial<Task>
): Task => {
  // Implement optimistic concurrency check
  if (update.version && update.version <= currentTask.version) {
    return currentTask; // Ignore outdated updates
  }

  return {
    ...currentTask,
    ...update,
    version: update.version || currentTask.version
  };
};