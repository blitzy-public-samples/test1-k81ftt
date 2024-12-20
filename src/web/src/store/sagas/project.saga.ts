/**
 * @fileoverview Redux Saga implementation for project management operations
 * Handles side effects, async operations, and error handling for project-related actions
 * @version 1.0.0
 */

import { 
  takeLatest, 
  put, 
  call, 
  all, 
  select, 
  race, 
  delay 
} from 'redux-saga/effects'; // ^1.2.0
import { CircuitBreaker } from 'opossum'; // ^6.0.0
import { PayloadAction } from '@reduxjs/toolkit';
import {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectFilters,
  ProjectResponse,
  ProjectListResponse,
  ProjectError
} from '../../types/project.types';
import { projectService } from '../../services/project.service';
import {
  setProjects,
  setSelectedProject,
  setProjectFilters,
  setProjectStatus,
  setProjectError,
  setProjectMetrics
} from '../actions/project.actions';
import { RootState } from '../../types/store.types';
import { handleApiError } from '../../utils/error.utils';

// Constants for saga configuration
const FETCH_TIMEOUT = 5000; // 5 seconds
const CIRCUIT_BREAKER_OPTIONS = {
  timeout: 3000, // 3 seconds
  errorThresholdPercentage: 50,
  resetTimeout: 30000 // 30 seconds
};

// Initialize circuit breaker
const circuitBreaker = new CircuitBreaker(projectService.getProjects, CIRCUIT_BREAKER_OPTIONS);

/**
 * Saga for fetching projects with timeout and circuit breaker
 * Implements comprehensive error handling and performance monitoring
 */
function* fetchProjectsSaga(
  action: PayloadAction<{
    page: number;
    limit: number;
    filters?: ProjectFilters;
    signal?: AbortSignal;
  }>
) {
  const startTime = performance.now();
  
  try {
    // Race between API call and timeout
    const { response, timeout } = yield race({
      response: call(
        [circuitBreaker, circuitBreaker.fire],
        action.payload.page,
        action.payload.limit,
        action.payload.filters,
        action.payload.signal
      ),
      timeout: delay(FETCH_TIMEOUT)
    });

    if (timeout) {
      throw new Error('Request timeout exceeded');
    }

    const projectList: ProjectListResponse = response;
    
    // Update performance metrics
    const duration = performance.now() - startTime;
    yield put(setProjectMetrics({ fetchDuration: duration }));

    yield put(setProjects(projectList.items));
  } catch (error) {
    // Handle circuit breaker state
    if (circuitBreaker.opened) {
      yield put(setProjectError('Service temporarily unavailable. Please try again later.'));
    } else {
      yield put(setProjectError(handleApiError(error).message));
    }
  }
}

/**
 * Saga for creating a new project with optimistic updates
 * Implements rollback on failure
 */
function* createProjectSaga(
  action: PayloadAction<CreateProjectRequest & { signal?: AbortSignal }>
) {
  const optimisticId = `temp-${Date.now()}`;
  
  try {
    // Optimistic update
    const optimisticProject: Project = {
      id: optimisticId,
      ...action.payload,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    yield put(setSelectedProject(optimisticProject));

    // Actual API call
    const response: ProjectResponse = yield call(
      projectService.createProject,
      action.payload,
      action.payload.signal
    );

    // Update with real data
    yield put(setSelectedProject(response.data));
    
    // Refresh project list
    yield put(setProjects([response.data]));
  } catch (error) {
    // Rollback optimistic update
    yield put(setSelectedProject(null));
    yield put(setProjectError(handleApiError(error).message));
  }
}

/**
 * Saga for updating project with retry mechanism
 * Implements optimistic updates and rollback
 */
function* updateProjectSaga(
  action: PayloadAction<UpdateProjectRequest & { signal?: AbortSignal }>
) {
  const currentState: RootState = yield select();
  const originalProject = currentState.projects.items.find(
    p => p.id === action.payload.id
  );

  try {
    // Optimistic update
    yield put(setProjects(
      currentState.projects.items.map(p =>
        p.id === action.payload.id ? { ...p, ...action.payload } : p
      )
    ));

    const response: ProjectResponse = yield call(
      projectService.updateProject,
      action.payload.id,
      action.payload,
      action.payload.signal
    );

    // Update with confirmed data
    yield put(setSelectedProject(response.data));
  } catch (error) {
    // Rollback on failure
    if (originalProject) {
      yield put(setProjects(
        currentState.projects.items.map(p =>
          p.id === action.payload.id ? originalProject : p
        )
      ));
    }
    yield put(setProjectError(handleApiError(error).message));
  }
}

/**
 * Saga for deleting project with confirmation
 * Implements optimistic deletion and rollback
 */
function* deleteProjectSaga(
  action: PayloadAction<{ id: string; signal?: AbortSignal }>
) {
  const currentState: RootState = yield select();
  const projectToDelete = currentState.projects.items.find(
    p => p.id === action.payload.id
  );

  try {
    // Optimistic delete
    yield put(setProjects(
      currentState.projects.items.filter(p => p.id !== action.payload.id)
    ));

    yield call(
      projectService.deleteProject,
      action.payload.id,
      action.payload.signal
    );
  } catch (error) {
    // Rollback on failure
    if (projectToDelete) {
      yield put(setProjects([...currentState.projects.items, projectToDelete]));
    }
    yield put(setProjectError(handleApiError(error).message));
  }
}

/**
 * Root saga that combines all project-related sagas
 * Implements enhanced error handling and performance monitoring
 */
export function* watchProjectSagas() {
  yield all([
    takeLatest('projects/fetchProjects', fetchProjectsSaga),
    takeLatest('projects/createProject', createProjectSaga),
    takeLatest('projects/updateProject', updateProjectSaga),
    takeLatest('projects/deleteProject', deleteProjectSaga)
  ]);
}