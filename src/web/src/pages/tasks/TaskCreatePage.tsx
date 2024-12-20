/**
 * @fileoverview Enterprise-grade task creation page component with comprehensive validation,
 * accessibility features, analytics tracking, and performance optimization
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Typography, Paper, CircularProgress } from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary';
import { useAnalytics } from '@analytics/react';

// Internal imports
import TaskForm from '../../components/tasks/TaskForm';
import { CreateTaskPayload, TaskValidationSchema } from '../../types/task.types';
import { taskService } from '../../services/task.service';
import useNotification from '../../hooks/useNotification';

/**
 * Enterprise-grade task creation page component
 * Implements comprehensive validation, analytics tracking, and accessibility
 */
const TaskCreatePage: React.FC = () => {
  // Hooks initialization
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const analytics = useAnalytics();
  const [loading, setLoading] = useState(false);

  // Track page view on mount
  useEffect(() => {
    analytics.page({
      name: 'Task Creation',
      path: '/tasks/create',
      title: 'Create New Task'
    });
  }, [analytics]);

  /**
   * Handles task creation with comprehensive error handling and analytics
   * @param taskData - Task creation payload
   */
  const handleCreateTask = useCallback(async (taskData: CreateTaskPayload) => {
    setLoading(true);
    
    try {
      // Track task creation attempt
      analytics.track('Task Creation Started', {
        taskTitle: taskData.title,
        projectId: taskData.projectId,
        hasAssignee: !!taskData.assigneeId
      });

      // Create task with service
      const response = await taskService.createTask(taskData);

      // Show success notification
      showSuccess({
        message: 'Task created successfully',
        duration: 5000,
        aria: {
          role: 'status',
          live: 'polite'
        }
      });

      // Track successful creation
      analytics.track('Task Creation Completed', {
        taskId: response.data.id,
        taskTitle: response.data.title,
        projectId: response.data.projectId
      });

      // Navigate to task list
      navigate('/tasks');
    } catch (error) {
      // Show error notification
      showError({
        message: error instanceof Error ? error.message : 'Failed to create task',
        duration: 7000,
        aria: {
          role: 'alert',
          live: 'assertive'
        }
      });

      // Track failure
      analytics.track('Task Creation Failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        taskData: {
          title: taskData.title,
          projectId: taskData.projectId
        }
      });

      console.error('Task creation error:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate, showSuccess, showError, analytics]);

  /**
   * Handles cancellation of task creation
   */
  const handleCancel = useCallback(() => {
    // Track cancellation
    analytics.track('Task Creation Cancelled');
    navigate('/tasks');
  }, [navigate, analytics]);

  return (
    <ErrorBoundary
      fallback={
        <Container>
          <Typography color="error" role="alert">
            Error loading task creation form. Please try again.
          </Typography>
        </Container>
      }
    >
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper 
          elevation={2} 
          sx={{ p: 4 }}
          component="main"
          role="main"
          aria-label="Create new task"
        >
          <Typography 
            variant="h4" 
            component="h1" 
            gutterBottom
            sx={{ mb: 4 }}
          >
            Create New Task
          </Typography>

          {loading && (
            <CircularProgress
              size={24}
              sx={{ position: 'absolute', top: 24, right: 24 }}
              aria-label="Creating task..."
            />
          )}

          <TaskForm
            onSubmit={handleCreateTask}
            onCancel={handleCancel}
            loading={loading}
          />
        </Paper>
      </Container>
    </ErrorBoundary>
  );
};

export default TaskCreatePage;