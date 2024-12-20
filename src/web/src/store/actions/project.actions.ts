/**
 * @fileoverview Redux actions and thunks for project management operations
 * Implements comprehensive error handling, request cancellation, optimistic updates,
 * and performance monitoring for project-related operations.
 * @version 1.0.0
 */

import { createAction, createAsyncThunk } from '@reduxjs/toolkit'; // ^2.0.0
import axios from 'axios'; // ^1.6.0
import {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectFilters,
  ProjectResponse,
  ProjectListResponse,
  ProjectStatus
} from '../../types/project.types';
import { projectService } from '../../services/project.service';
import { AppThunk, RootState, LoadingState } from '../../types/store.types';
import { handleApiError } from '../../utils/error.utils';

// Constants for request management
const API_TIMEOUT = 5000; // 5 seconds timeout
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second between retries

/**
 * Action creators for synchronous project operations
 */
export const setProjects = createAction<Project[]>('projects/setProjects');
export const setSelectedProject = createAction<Project | null>('projects/setSelectedProject');
export const setProjectLoading = createAction<LoadingState>('projects/setLoading');
export const setProjectError = createAction<string | null>('projects/setError');
export const clearProjectError = createAction('projects/clearError');

/**
 * Fetches projects with comprehensive error handling and request cancellation
 */
export const fetchProjects = createAsyncThunk<
  ProjectListResponse,
  { page: number; limit: number; filters?: ProjectFilters },
  { state: RootState }
>(
  'projects/fetchProjects',
  async ({ page, limit, filters }, { signal, rejectWithValue }) => {
    try {
      const startTime = performance.now();
      const response = await projectService.getProjects(page, limit, filters);
      
      // Performance monitoring
      const duration = performance.now() - startTime;
      if (duration > API_TIMEOUT) {
        console.warn(`Project fetch exceeded timeout: ${duration}ms`);
      }

      return response;
    } catch (error) {
      if (axios.isCancel(error)) {
        throw error;
      }
      return rejectWithValue(handleApiError(error));
    }
  },
  {
    condition: (_, { getState }) => {
      const { projects } = getState();
      return projects.loading !== 'loading';
    }
  }
);

/**
 * Creates a new project with optimistic updates
 */
export const createProject = createAsyncThunk<
  ProjectResponse,
  CreateProjectRequest,
  { state: RootState }
>(
  'projects/createProject',
  async (projectData, { dispatch, rejectWithValue }) => {
    try {
      // Optimistic update
      const optimisticProject: Project = {
        ...projectData,
        id: `temp-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: ProjectStatus.PLANNING
      };
      
      dispatch(setProjects([optimisticProject]));

      const response = await projectService.createProject(projectData);
      return response;
    } catch (error) {
      // Rollback optimistic update on failure
      dispatch(fetchProjects({ page: 1, limit: 10 }));
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Updates an existing project with retry logic
 */
export const updateProject = createAsyncThunk<
  ProjectResponse,
  UpdateProjectRequest,
  { state: RootState }
>(
  'projects/updateProject',
  async (updateData, { dispatch, rejectWithValue }) => {
    let retries = 0;
    
    while (retries < MAX_RETRIES) {
      try {
        const response = await projectService.updateProject(
          updateData.id,
          updateData
        );
        return response;
      } catch (error) {
        if (retries === MAX_RETRIES - 1) {
          return rejectWithValue(handleApiError(error));
        }
        retries++;
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
    
    throw new Error('Max retries exceeded');
  }
);

/**
 * Deletes a project with confirmation and cleanup
 */
export const deleteProject = createAsyncThunk<
  void,
  string,
  { state: RootState }
>(
  'projects/deleteProject',
  async (projectId, { dispatch, rejectWithValue }) => {
    try {
      await projectService.deleteProject(projectId);
      // Refresh project list after successful deletion
      dispatch(fetchProjects({ page: 1, limit: 10 }));
    } catch (error) {
      return rejectWithValue(handleApiError(error));
    }
  }
);

/**
 * Updates project status with optimistic update and rollback
 */
export const updateProjectStatus = (
  projectId: string,
  status: ProjectStatus
): AppThunk => async (dispatch, getState) => {
  const { projects } = getState();
  const originalProject = projects.items.find(p => p.id === projectId);
  
  if (!originalProject) return;

  try {
    // Optimistic update
    dispatch(setProjects(
      projects.items.map(p =>
        p.id === projectId ? { ...p, status } : p
      )
    ));

    await projectService.updateProjectStatus(projectId, status);
  } catch (error) {
    // Rollback on failure
    if (originalProject) {
      dispatch(setProjects(
        projects.items.map(p =>
          p.id === projectId ? originalProject : p
        )
      ));
    }
    dispatch(setProjectError(handleApiError(error).message));
  }
};

/**
 * Cleanup function to cancel ongoing requests
 */
export const cleanupProjectRequests = (): AppThunk => async () => {
  projectService.cancelOngoingRequests();
};