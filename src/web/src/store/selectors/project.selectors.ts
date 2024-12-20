/**
 * @fileoverview Redux selectors for project-related state management
 * Provides memoized, type-safe selectors for accessing project data from the Redux store
 * @version 1.0.0
 */

import { createSelector } from '@reduxjs/toolkit'; // v2.0.0
import { RootState } from '../../types/store.types';
import { Project, ProjectStatus } from '../../types/project.types';

/**
 * Base selector to access the project state slice
 * Provides type-safe access to the project state
 */
export const selectProjectState = (state: RootState) => state.projects;

/**
 * Memoized selector to get all projects
 * Maintains reference equality for unchanged data
 */
export const selectAllProjects = createSelector(
  [selectProjectState],
  (projectState) => projectState.items
);

/**
 * Memoized selector to get the currently selected project
 * Returns null if no project is selected
 */
export const selectSelectedProject = createSelector(
  [selectProjectState],
  (projectState): Project | null => projectState.selectedProject
);

/**
 * Memoized selector to get projects filtered by status
 * Efficiently filters projects while maintaining memoization
 */
export const selectProjectsByStatus = createSelector(
  [selectAllProjects, (_state: RootState, status: ProjectStatus) => status],
  (projects, status): Project[] => 
    projects.filter(project => project.status === status)
);

/**
 * Memoized selector for projects loading state
 * Provides type-safe boolean indicating loading status
 */
export const selectProjectsLoading = createSelector(
  [selectProjectState],
  (projectState): boolean => projectState.loading === 'loading'
);

/**
 * Memoized selector for project-related errors
 * Returns error message with null safety
 */
export const selectProjectError = createSelector(
  [selectProjectState],
  (projectState): string | null => projectState.error?.message ?? null
);

/**
 * Memoized selector for project filters
 * Returns the current filter state for projects
 */
export const selectProjectFilters = createSelector(
  [selectProjectState],
  (projectState) => projectState.filters
);

/**
 * Memoized selector for total project count
 * Returns the total number of projects in the system
 */
export const selectTotalProjectCount = createSelector(
  [selectProjectState],
  (projectState): number => projectState.totalCount
);

/**
 * Memoized selector for last update timestamp
 * Returns the timestamp of the last project state update
 */
export const selectProjectLastUpdated = createSelector(
  [selectProjectState],
  (projectState): Date | null => projectState.lastUpdated
);

/**
 * Memoized selector for active projects
 * Returns projects that are either in planning or in progress
 */
export const selectActiveProjects = createSelector(
  [selectAllProjects],
  (projects): Project[] =>
    projects.filter(project => 
      project.status === ProjectStatus.PLANNING || 
      project.status === ProjectStatus.IN_PROGRESS
    )
);

/**
 * Memoized selector for completed projects
 * Returns projects that are marked as completed
 */
export const selectCompletedProjects = createSelector(
  [selectAllProjects],
  (projects): Project[] =>
    projects.filter(project => project.status === ProjectStatus.COMPLETED)
);

/**
 * Memoized selector for projects search results
 * Filters projects based on the current search query
 */
export const selectProjectsBySearch = createSelector(
  [selectAllProjects, selectProjectFilters],
  (projects, filters): Project[] => {
    const searchQuery = filters.search?.toLowerCase();
    if (!searchQuery) return projects;
    
    return projects.filter(project =>
      project.name.toLowerCase().includes(searchQuery) ||
      project.description.toLowerCase().includes(searchQuery)
    );
  }
);