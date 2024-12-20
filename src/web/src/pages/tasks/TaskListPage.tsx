/**
 * @fileoverview Task List Page Component
 * Implements a comprehensive task list view with filtering, sorting, pagination,
 * and real-time updates following Material Design 3 principles.
 * @version 1.0.0
 */

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Button,
  Skeleton,
  Alert,
  useTheme,
  useMediaQuery
} from '@mui/material';
import TaskList from '../../components/tasks/TaskList';
import DashboardLayout from '../../layouts/DashboardLayout';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { taskActions } from '../../store/actions/task.actions';
import { Task, TaskStatus, TaskPriority } from '../../types/task.types';
import { RootState } from '../../types/store.types';
import { useWebSocket } from '../../hooks/useWebSocket';
import { EventType } from '../../../backend/src/types/event.types';

// Constants for pagination and performance
const ITEMS_PER_PAGE = 20;
const VIRTUALIZATION_THRESHOLD = 50;
const DEBOUNCE_DELAY = 300;

/**
 * Task List Page component displaying a paginated, filterable list of tasks
 * with real-time updates and virtualization for performance
 */
const TaskListPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { subscribe, unsubscribe } = useWebSocket();

  // Local state
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [filters, setFilters] = useState({
    status: searchParams.getAll('status') as TaskStatus[],
    priority: searchParams.getAll('priority') as TaskPriority[],
    assignee: searchParams.get('assignee') || undefined
  });

  // Redux state
  const {
    items: tasks,
    loading,
    error,
    totalCount
  } = useSelector((state: RootState) => state.tasks);

  // Subscribe to real-time task updates
  useEffect(() => {
    const unsubscribeHandlers = [
      subscribe(EventType.TASK_CREATED, handleTaskCreated),
      subscribe(EventType.TASK_UPDATED, handleTaskUpdated),
      subscribe(EventType.TASK_DELETED, handleTaskDeleted)
    ];

    return () => {
      unsubscribeHandlers.forEach(unsubscribe => unsubscribe());
    };
  }, [subscribe]);

  // Fetch tasks with current filters
  useEffect(() => {
    dispatch(taskActions.fetchTasks({
      page,
      limit: ITEMS_PER_PAGE,
      filters
    }));

    // Update URL params
    setSearchParams({
      page: page.toString(),
      ...(filters.status.length && { status: filters.status }),
      ...(filters.priority.length && { priority: filters.priority }),
      ...(filters.assignee && { assignee: filters.assignee })
    });
  }, [dispatch, page, filters, setSearchParams]);

  // Memoized handlers for task interactions
  const handleTaskClick = useCallback((task: Task) => {
    navigate(`/tasks/${task.id}`);
  }, [navigate]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  }, []);

  // Real-time update handlers
  const handleTaskCreated = useCallback((task: Task) => {
    dispatch(taskActions.setTasks([...tasks, task]));
  }, [dispatch, tasks]);

  const handleTaskUpdated = useCallback((updatedTask: Task) => {
    dispatch(taskActions.setTasks(
      tasks.map(task => task.id === updatedTask.id ? updatedTask : task)
    ));
  }, [dispatch, tasks]);

  const handleTaskDeleted = useCallback((taskId: string) => {
    dispatch(taskActions.setTasks(
      tasks.filter(task => task.id !== taskId)
    ));
  }, [dispatch, tasks]);

  // Render loading state
  if (loading === 'loading' && !tasks.length) {
    return (
      <DashboardLayout>
        <Box sx={{ p: 3 }}>
          <Skeleton variant="rectangular" height={200} />
          <Box sx={{ mt: 2 }}>
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} height={60} sx={{ my: 1 }} />
            ))}
          </Box>
        </Box>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ErrorBoundary>
        <Box sx={{ p: 3 }}>
          {/* Header */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3
          }}>
            <Typography variant="h4" component="h1">
              Tasks
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/tasks/new')}
              sx={{ minWidth: isMobile ? 'auto' : undefined }}
            >
              {isMobile ? '+' : 'New Task'}
            </Button>
          </Box>

          {/* Error message */}
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              onClose={() => dispatch(taskActions.clearError())}
            >
              {error.message}
            </Alert>
          )}

          {/* Task list */}
          <TaskList
            tasks={tasks}
            loading={loading === 'loading'}
            onTaskClick={handleTaskClick}
            onPageChange={handlePageChange}
            onFilterChange={handleFilterChange}
            currentPage={page}
            totalItems={totalCount}
            itemsPerPage={ITEMS_PER_PAGE}
            filters={filters}
            virtualizationThreshold={VIRTUALIZATION_THRESHOLD}
          />
        </Box>
      </ErrorBoundary>
    </DashboardLayout>
  );
};

export default React.memo(TaskListPage);