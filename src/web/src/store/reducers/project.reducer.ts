/**
 * @fileoverview Redux reducer for project state management
 * Implements comprehensive project management with type-safe state updates,
 * optimistic updates, and enhanced error handling
 * @version 1.0.0
 */

import { createReducer } from '@reduxjs/toolkit'; // ^2.0.0
import {
  Project,
  ProjectStatus,
  ProjectFilters,
  ProjectHierarchyNode
} from '../../types/project.types';
import { ProjectState, LoadingState } from '../../types/store.types';
import { projectActions } from '../actions/project.actions';

/**
 * Initial state for project management
 * Implements comprehensive project tracking with hierarchy support
 */
const initialState: ProjectState = {
  items: [],
  selectedProject: null,
  loading: 'idle',
  error: null,
  filters: {
    status: [],
    search: null,
    dateRange: {
      startDate: null,
      endDate: null
    }
  },
  totalCount: 0,
  lastUpdated: null,
  hierarchy: {} as Record<string, ProjectHierarchyNode>,
  optimisticUpdates: [] as Project[],
  pendingOperations: new Set<string>()
};

/**
 * Project reducer with enhanced error handling and optimistic updates
 */
export const projectReducer = createReducer(initialState, (builder) => {
  builder
    // Handle setting projects with optimistic updates
    .addCase(projectActions.setProjects, (state, action) => {
      state.items = action.payload;
      state.lastUpdated = new Date();
      
      // Apply any pending optimistic updates
      state.items = state.items.map(project => {
        const optimisticUpdate = state.optimisticUpdates.find(
          update => update.id === project.id
        );
        return optimisticUpdate || project;
      });
    })

    // Handle project selection with proper null checks
    .addCase(projectActions.setSelectedProject, (state, action) => {
      state.selectedProject = action.payload;
      if (action.payload) {
        // Update project in items list if it exists
        const index = state.items.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      }
    })

    // Handle project filters with enhanced filtering capabilities
    .addCase(projectActions.setProjectFilters, (state, action) => {
      state.filters = {
        ...state.filters,
        ...action.payload,
        // Ensure proper date handling
        dateRange: {
          startDate: action.payload.dateRange?.startDate || null,
          endDate: action.payload.dateRange?.endDate || null
        }
      };
    })

    // Handle project status updates with optimistic updates
    .addCase(projectActions.setProjectStatus, (state, action) => {
      const { projectId, status } = action.payload;
      
      // Create optimistic update
      const projectIndex = state.items.findIndex(p => p.id === projectId);
      if (projectIndex !== -1) {
        const updatedProject = {
          ...state.items[projectIndex],
          status,
          updatedAt: new Date()
        };
        
        // Add to optimistic updates
        state.optimisticUpdates.push(updatedProject);
        
        // Update in items array
        state.items[projectIndex] = updatedProject;
        
        // Update in hierarchy if present
        if (state.hierarchy[projectId]) {
          state.hierarchy[projectId] = {
            ...state.hierarchy[projectId],
            status
          };
        }
      }
    })

    // Handle project hierarchy updates
    .addCase(projectActions.setProjectHierarchy, (state, action) => {
      state.hierarchy = action.payload;
      
      // Update items list with hierarchy information
      state.items = state.items.map(project => {
        const hierarchyNode = state.hierarchy[project.id];
        if (hierarchyNode) {
          return {
            ...project,
            parentId: hierarchyNode.parentId,
            level: hierarchyNode.level
          };
        }
        return project;
      });
    })

    // Handle loading states with detailed tracking
    .addCase(projectActions.setLoading, (state, action) => {
      state.loading = action.payload;
      if (action.payload === 'loading') {
        state.error = null;
      }
    })

    // Handle errors with proper error boundaries
    .addCase(projectActions.setProjectError, (state, action) => {
      state.error = {
        message: action.payload,
        code: 'PROJECT_ERROR',
        timestamp: new Date(),
        isDisplayed: false
      };
      state.loading = 'failed';
    })

    // Handle optimistic update cleanup
    .addCase(projectActions.clearOptimisticUpdate, (state, action) => {
      state.optimisticUpdates = state.optimisticUpdates.filter(
        update => update.id !== action.payload
      );
      
      // Revert any optimistic updates if needed
      if (action.payload) {
        const originalProject = state.items.find(p => p.id === action.payload);
        if (originalProject) {
          const index = state.items.findIndex(p => p.id === action.payload);
          if (index !== -1) {
            state.items[index] = originalProject;
          }
        }
      }
    })

    // Handle pending operations tracking
    .addCase(projectActions.addPendingOperation, (state, action) => {
      state.pendingOperations.add(action.payload);
    })
    .addCase(projectActions.removePendingOperation, (state, action) => {
      state.pendingOperations.delete(action.payload);
    });
});

export default projectReducer;