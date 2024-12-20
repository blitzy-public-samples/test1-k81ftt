/**
 * @fileoverview Task Detail Page Component
 * Displays comprehensive task information with real-time updates,
 * optimistic updates, and accessibility features.
 * @version 1.0.0
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Container, Alert } from '@mui/material';
import { useTranslation } from 'react-i18next';

import TaskDetail from '../../components/tasks/TaskDetail';
import DashboardLayout from '../../layouts/DashboardLayout';
import { taskService } from '../../services/task.service';
import useWebSocket from '../../hooks/useWebSocket';
import useNotification from '../../hooks/useNotification';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { Task, TaskStatus } from '../../types/task.types';
import { handleApiError } from '../../utils/error.utils';

/**
 * Task Detail Page component with real-time updates and error handling
 */
const TaskDetailPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const { isConnected, subscribe, emit } = useWebSocket();

  // State management
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [optimisticUpdate, setOptimisticUpdate] = useState<Task | null>(null);

  // Memoized abort controller for cleanup
  const abortController = useMemo(() => new AbortController(), []);

  /**
   * Fetches task details with error handling
   */
  useEffect(() => {
    const fetchTask = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await taskService.getTaskById(taskId!, {
          signal: abortController.signal
        });

        setTask(response.data);
      } catch (err) {
        const apiError = handleApiError(err as Error);
        setError(apiError);
        showNotification({
          message: apiError.message,
          type: 'error',
          duration: 5000
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (taskId) {
      fetchTask();
    }

    return () => {
      abortController.abort();
    };
  }, [taskId, abortController, showNotification]);

  /**
   * Sets up real-time task updates via WebSocket
   */
  useEffect(() => {
    if (!taskId) return;

    const unsubscribe = subscribe(`task-${taskId}`, (data) => {
      if (data.type === 'TASK_UPDATED') {
        setTask(prevTask => ({
          ...prevTask!,
          ...data.updates
        }));

        showNotification({
          message: t('task.updated'),
          type: 'info'
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [taskId, subscribe, showNotification, t]);

  /**
   * Handles task updates with optimistic updates and error handling
   */
  const handleTaskUpdate = useCallback(async (updatedTask: Task) => {
    try {
      // Store original task for rollback
      const originalTask = task;

      // Apply optimistic update
      setOptimisticUpdate(updatedTask);
      setTask(updatedTask);

      // Attempt to update task
      await taskService.updateTask(updatedTask.id, updatedTask);

      // Broadcast update if connected
      if (isConnected) {
        await emit('task-update', {
          taskId: updatedTask.id,
          updates: updatedTask
        });
      }

      showNotification({
        message: t('task.updateSuccess'),
        type: 'success'
      });
    } catch (err) {
      // Rollback optimistic update
      setTask(task);
      setOptimisticUpdate(null);

      const apiError = handleApiError(err as Error);
      showNotification({
        message: apiError.message,
        type: 'error',
        duration: 7000,
        action: {
          label: t('common.retry'),
          onClick: () => handleTaskUpdate(updatedTask)
        }
      });
    }
  }, [task, isConnected, emit, showNotification, t]);

  /**
   * Handles task deletion with confirmation
   */
  const handleTaskDelete = useCallback(async () => {
    if (!task) return;

    try {
      await taskService.deleteTask(task.id);

      showNotification({
        message: t('task.deleteSuccess'),
        type: 'success'
      });

      navigate('/tasks');
    } catch (err) {
      const apiError = handleApiError(err as Error);
      showNotification({
        message: apiError.message,
        type: 'error',
        action: {
          label: t('common.retry'),
          onClick: () => handleTaskDelete()
        }
      });
    }
  }, [task, navigate, showNotification, t]);

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress aria-label={t('common.loading')} />
        </Box>
      </DashboardLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout>
        <Container>
          <Alert 
            severity="error" 
            aria-live="polite"
            action={
              <button onClick={() => window.location.reload()}>
                {t('common.retry')}
              </button>
            }
          >
            {error.message}
          </Alert>
        </Container>
      </DashboardLayout>
    );
  }

  // Task not found
  if (!task && !isLoading) {
    return (
      <DashboardLayout>
        <Container>
          <Alert severity="info" aria-live="polite">
            {t('task.notFound')}
          </Alert>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ErrorBoundary>
        <Container maxWidth="lg">
          <TaskDetail
            taskId={taskId!}
            onUpdate={handleTaskUpdate}
            onDelete={handleTaskDelete}
          />
        </Container>
      </ErrorBoundary>
    </DashboardLayout>
  );
};

export default TaskDetailPage;