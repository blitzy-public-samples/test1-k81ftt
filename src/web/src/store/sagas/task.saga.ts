/**
 * @fileoverview Task Management Saga Implementation
 * @version 1.0.0
 * 
 * Implements Redux Saga patterns for task management with optimistic updates,
 * real-time synchronization, and comprehensive error handling.
 */

import { 
  takeLatest, 
  put, 
  call, 
  race, 
  delay, 
  retry,
  select,
  all
} from 'redux-saga/effects'; // ^1.2.0
import { Task, TaskStatus } from '../../types/task.types';
import { taskService } from '../../services/task.service';
import WebSocketService from '../../services/websocket.service';
import { EventType } from '../../backend/src/types/event.types';
import { handleApiError } from '../../utils/error.utils';
import { API_TIMEOUTS } from '../../constants/api.constants';

// Action Types
export const TASK_ACTIONS = {
  FETCH_TASKS: 'task/fetchTasks',
  SET_TASKS: 'task/setTasks',
  CREATE_TASK: 'task/createTask',
  UPDATE_TASK: 'task/updateTask',
  DELETE_TASK: 'task/deleteTask',
  SET_LOADING: 'task/setLoading',
  SET_ERROR: 'task/setError',
  OPTIMISTIC_UPDATE: 'task/optimisticUpdate',
  ROLLBACK_UPDATE: 'task/rollbackUpdate'
} as const;

// Selectors
const selectTasks = (state: any) => state.tasks.items;
const selectTaskById = (state: any, taskId: string) => 
  state.tasks.items.find((task: Task) => task.id === taskId);

/**
 * Saga for fetching tasks with real-time updates and retry mechanism
 */
export function* fetchTasksSaga(action: any) {
  try {
    // Set loading state
    yield put({ type: TASK_ACTIONS.SET_LOADING, payload: true });

    // Subscribe to real-time task updates
    const wsUnsubscribe = yield call(subscribeToTaskUpdates);

    // Attempt to fetch tasks with retry logic
    const { response, timeout } = yield race({
      response: retry(3, 2000, function* () {
        return yield call(taskService.getTasks, action.payload);
      }),
      timeout: delay(API_TIMEOUTS.DEFAULT)
    });

    if (timeout) {
      throw new Error('Request timed out');
    }

    // Update store with fetched tasks
    yield put({ 
      type: TASK_ACTIONS.SET_TASKS, 
      payload: response.data 
    });

  } catch (error) {
    yield put({ 
      type: TASK_ACTIONS.SET_ERROR, 
      payload: handleApiError(error as Error)
    });
  } finally {
    yield put({ type: TASK_ACTIONS.SET_LOADING, payload: false });
  }
}

/**
 * Saga for updating task with optimistic updates and conflict resolution
 */
export function* updateTaskSaga(action: any) {
  const { taskId, updates } = action.payload;
  const originalTask = yield select(selectTaskById, taskId);

  try {
    // Apply optimistic update
    yield put({
      type: TASK_ACTIONS.OPTIMISTIC_UPDATE,
      payload: { taskId, updates }
    });

    // Attempt to update task with version check
    const response = yield call(
      taskService.updateTask,
      taskId,
      { ...updates, version: originalTask.version }
    );

    // Broadcast update through WebSocket
    yield call(WebSocketService.emit, EventType.TASK_UPDATED, {
      taskId,
      updates,
      version: response.data.version
    });

  } catch (error) {
    // Rollback optimistic update on failure
    yield put({
      type: TASK_ACTIONS.ROLLBACK_UPDATE,
      payload: { taskId, originalTask }
    });

    yield put({
      type: TASK_ACTIONS.SET_ERROR,
      payload: handleApiError(error as Error)
    });
  }
}

/**
 * Saga for creating new task with real-time notification
 */
export function* createTaskSaga(action: any) {
  try {
    yield put({ type: TASK_ACTIONS.SET_LOADING, payload: true });

    const response = yield call(taskService.createTask, action.payload);

    // Broadcast new task creation
    yield call(WebSocketService.emit, EventType.TASK_CREATED, {
      task: response.data
    });

    // Update local state
    const currentTasks = yield select(selectTasks);
    yield put({
      type: TASK_ACTIONS.SET_TASKS,
      payload: [...currentTasks, response.data]
    });

  } catch (error) {
    yield put({
      type: TASK_ACTIONS.SET_ERROR,
      payload: handleApiError(error as Error)
    });
  } finally {
    yield put({ type: TASK_ACTIONS.SET_LOADING, payload: false });
  }
}

/**
 * Saga for deleting task with optimistic deletion
 */
export function* deleteTaskSaga(action: any) {
  const { taskId } = action.payload;
  const originalTasks = yield select(selectTasks);

  try {
    // Optimistically remove task
    yield put({
      type: TASK_ACTIONS.SET_TASKS,
      payload: originalTasks.filter((task: Task) => task.id !== taskId)
    });

    yield call(taskService.deleteTask, taskId);

    // Broadcast deletion
    yield call(WebSocketService.emit, EventType.TASK_DELETED, { taskId });

  } catch (error) {
    // Rollback on failure
    yield put({
      type: TASK_ACTIONS.SET_TASKS,
      payload: originalTasks
    });

    yield put({
      type: TASK_ACTIONS.SET_ERROR,
      payload: handleApiError(error as Error)
    });
  }
}

/**
 * Helper function to subscribe to real-time task updates
 */
function* subscribeToTaskUpdates() {
  const unsubscribe = yield call(WebSocketService.subscribe, 
    EventType.REAL_TIME_UPDATE,
    function* (update: any) {
      const currentTasks = yield select(selectTasks);
      
      switch (update.type) {
        case EventType.TASK_UPDATED:
          yield put({
            type: TASK_ACTIONS.SET_TASKS,
            payload: currentTasks.map((task: Task) =>
              task.id === update.taskId ? { ...task, ...update.updates } : task
            )
          });
          break;

        case EventType.TASK_CREATED:
          yield put({
            type: TASK_ACTIONS.SET_TASKS,
            payload: [...currentTasks, update.task]
          });
          break;

        case EventType.TASK_DELETED:
          yield put({
            type: TASK_ACTIONS.SET_TASKS,
            payload: currentTasks.filter((task: Task) => 
              task.id !== update.taskId
            )
          });
          break;
      }
    }
  );

  return unsubscribe;
}

/**
 * Root saga that combines all task-related sagas
 */
export function* watchTaskSagas() {
  yield all([
    takeLatest(TASK_ACTIONS.FETCH_TASKS, fetchTasksSaga),
    takeLatest(TASK_ACTIONS.UPDATE_TASK, updateTaskSaga),
    takeLatest(TASK_ACTIONS.CREATE_TASK, createTaskSaga),
    takeLatest(TASK_ACTIONS.DELETE_TASK, deleteTaskSaga)
  ]);
}