/**
 * @fileoverview TaskDetail component for displaying and managing comprehensive task information
 * Implements Material Design 3 specifications with WCAG 2.1 Level AA compliance
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { styled } from '@mui/material/styles';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import TaskStatus from './TaskStatus';
import TaskComments from './TaskComments';
import useWebSocket from '../../hooks/useWebSocket';
import { Task, TaskStatus as TaskStatusType } from '../../types/task.types';
import { Priority } from '../../types/common.types';
import Button from '../common/Button';
import Avatar from '../common/Avatar';

// Styled components with accessibility enhancements
const StyledCard = styled(Card)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[2],
  '&:focus-within': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
  '@media (forced-colors: active)': {
    border: '1px solid CanvasText',
  },
}));

const ContentGrid = styled(Grid)(({ theme }) => ({
  padding: theme.spacing(3),
  gap: theme.spacing(2),
}));

const MetadataBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  color: theme.palette.text.secondary,
}));

// Interface definitions
interface TaskDetailProps {
  taskId: string;
  onUpdate?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  className?: string;
}

/**
 * TaskDetail component displaying comprehensive task information with real-time updates
 */
const TaskDetail: React.FC<TaskDetailProps> = ({
  taskId,
  onUpdate,
  onDelete,
  className,
}) => {
  // State management
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const optimisticUpdates = useRef(new Map<string, any>());

  // WebSocket integration
  const { isConnected, subscribe, emit } = useWebSocket();

  // Handle task status changes with optimistic updates
  const handleStatusChange = useCallback(async (newStatus: TaskStatusType) => {
    if (!task) return;

    // Optimistic update
    const previousStatus = task.status;
    setTask(prev => prev ? { ...prev, status: newStatus } : null);
    optimisticUpdates.current.set('status', previousStatus);

    try {
      await emit('task-update', 'TASK_UPDATED', {
        taskId,
        updates: { status: newStatus },
      });

      // Clear optimistic update on success
      optimisticUpdates.current.delete('status');
      onUpdate?.(task);
    } catch (error) {
      // Rollback on failure
      setTask(prev => prev ? { ...prev, status: previousStatus } : null);
      setError('Failed to update task status. Please try again.');
      console.error('Status update error:', error);
    }
  }, [task, taskId, emit, onUpdate]);

  // Handle task priority changes
  const handlePriorityChange = useCallback(async (newPriority: Priority) => {
    if (!task) return;

    const previousPriority = task.priority;
    setTask(prev => prev ? { ...prev, priority: newPriority } : null);

    try {
      await emit('task-update', 'TASK_UPDATED', {
        taskId,
        updates: { priority: newPriority },
      });
      onUpdate?.(task);
    } catch (error) {
      setTask(prev => prev ? { ...prev, priority: previousPriority } : null);
      setError('Failed to update task priority. Please try again.');
    }
  }, [task, taskId, emit, onUpdate]);

  // Handle task deletion
  const handleDelete = useCallback(async () => {
    if (!task) return;

    try {
      await emit('task-delete', 'TASK_DELETED', { taskId });
      onDelete?.(taskId);
    } catch (error) {
      setError('Failed to delete task. Please try again.');
      console.error('Delete error:', error);
    }
  }, [task, taskId, emit, onDelete]);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribe(`task-${taskId}`, (data) => {
      if (data.type === 'TASK_UPDATED') {
        setTask(prevTask => ({
          ...prevTask!,
          ...data.updates,
        }));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [taskId, subscribe]);

  // Fetch initial task data
  useEffect(() => {
    const fetchTask = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/tasks/${taskId}`);
        if (!response.ok) throw new Error('Failed to fetch task');
        const data = await response.json();
        setTask(data);
      } catch (error) {
        setError('Failed to load task details. Please try again.');
        console.error('Fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTask();
  }, [taskId]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress aria-label="Loading task details" />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" aria-live="polite">
        {error}
      </Alert>
    );
  }

  if (!task) {
    return (
      <Alert severity="info" aria-live="polite">
        Task not found
      </Alert>
    );
  }

  return (
    <StyledCard className={className} role="article" aria-label="Task details">
      <CardContent>
        <ContentGrid container direction="column">
          {/* Task Header */}
          <Grid item>
            <Typography variant="h4" component="h1" gutterBottom>
              {task.title}
            </Typography>
            <MetadataBox>
              <TaskStatus
                status={task.status}
                onChange={handleStatusChange}
                size="medium"
              />
              <Divider orientation="vertical" flexItem />
              <Avatar
                name={task.assignee?.name || 'Unassigned'}
                src={task.assignee?.avatar}
                size="small"
              />
              <Typography variant="body2">
                Due {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
              </Typography>
            </MetadataBox>
          </Grid>

          <Divider />

          {/* Task Description */}
          <Grid item>
            <Typography variant="body1" component="div">
              {task.description}
            </Typography>
          </Grid>

          {/* Task Comments */}
          <Grid item>
            <TaskComments
              taskId={taskId}
              onCommentAdd={() => {
                // Handle comment addition
              }}
            />
          </Grid>

          {/* Action Buttons */}
          <Grid item container spacing={2} justifyContent="flex-end">
            <Grid item>
              <Button
                variant="outlined"
                onClick={() => setIsEditing(true)}
                ariaLabel="Edit task"
              >
                Edit
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="error"
                onClick={handleDelete}
                ariaLabel="Delete task"
              >
                Delete
              </Button>
            </Grid>
          </Grid>
        </ContentGrid>
      </CardContent>
    </StyledCard>
  );
};

export default React.memo(TaskDetail);

// Type exports for consumers
export type { TaskDetailProps };