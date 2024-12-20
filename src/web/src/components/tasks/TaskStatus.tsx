/**
 * @fileoverview TaskStatus component for displaying and managing task status transitions
 * Implements Material Design 3 with full accessibility and theme support
 * @version 1.0.0
 */

// react version: ^18.0.0
// @mui/material version: ^5.0.0
import React from 'react';
import { styled, useTheme } from '@mui/material/styles';
import { Chip } from '@mui/material';
import { TaskStatus } from '../../types/task.types';
import Icon from '../common/Icon';

// Status configuration maps for consistent visualization
const STATUS_ICONS = {
  [TaskStatus.TODO]: 'task_alt',
  [TaskStatus.IN_PROGRESS]: 'pending',
  [TaskStatus.IN_REVIEW]: 'rate_review',
  [TaskStatus.BLOCKED]: 'error',
  [TaskStatus.COMPLETED]: 'check_circle'
} as const;

const STATUS_COLORS = {
  [TaskStatus.TODO]: 'info',
  [TaskStatus.IN_PROGRESS]: 'primary',
  [TaskStatus.IN_REVIEW]: 'warning',
  [TaskStatus.BLOCKED]: 'error',
  [TaskStatus.COMPLETED]: 'success'
} as const;

const STATUS_LABELS = {
  [TaskStatus.TODO]: 'To Do',
  [TaskStatus.IN_PROGRESS]: 'In Progress',
  [TaskStatus.IN_REVIEW]: 'In Review',
  [TaskStatus.BLOCKED]: 'Blocked',
  [TaskStatus.COMPLETED]: 'Completed'
} as const;

// Interface for component props with comprehensive type safety
interface TaskStatusProps {
  /** Current status of the task */
  status: TaskStatus;
  /** Optional callback for status changes */
  onChange?: (status: TaskStatus) => void;
  /** Whether the status chip is disabled */
  disabled?: boolean;
  /** Size variant of the chip */
  size?: 'small' | 'medium';
  /** Optional CSS class name */
  className?: string;
  /** Custom aria label for accessibility */
  ariaLabel?: string;
}

// Styled Chip component with theme integration
const StyledChip = styled(Chip, {
  shouldForwardProp: (prop) => !['status'].includes(prop as string),
})<{ status: TaskStatus }>(({ theme, status }) => ({
  fontWeight: theme.typography.fontWeightMedium,
  transition: theme.transitions.create(['background-color', 'box-shadow', 'border-color'], {
    duration: theme.transitions.duration.short,
  }),
  '&:hover': {
    backgroundColor: theme.palette[STATUS_COLORS[status]].light,
  },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette[STATUS_COLORS[status]].main}`,
    outlineOffset: '2px',
  },
  '&.MuiChip-clickable:active': {
    boxShadow: theme.shadows[1],
  },
  // High contrast mode support
  '@media (forced-colors: active)': {
    border: '1px solid currentColor',
    '&:hover': {
      borderColor: 'Highlight',
    },
  },
  // Reduced motion support
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
}));

/**
 * Gets theme-aware configuration for status visualization
 */
const getStatusConfig = (status: TaskStatus, theme: any) => {
  const isHighContrast = window.matchMedia('(forced-colors: active)').matches;
  
  return {
    icon: STATUS_ICONS[status],
    color: STATUS_COLORS[status],
    label: STATUS_LABELS[status],
    backgroundColor: isHighContrast 
      ? 'Canvas'
      : theme.palette[STATUS_COLORS[status]].light,
    textColor: theme.palette[STATUS_COLORS[status]].contrastText,
  };
};

/**
 * TaskStatus component for displaying and managing task status
 * Implements full accessibility and theme integration
 */
const TaskStatus: React.FC<TaskStatusProps> = ({
  status,
  onChange,
  disabled = false,
  size = 'medium',
  className,
  ariaLabel,
}) => {
  const theme = useTheme();
  const statusConfig = getStatusConfig(status, theme);

  // Handle keyboard interactions for accessibility
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (onChange && !disabled && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      const statusValues = Object.values(TaskStatus);
      const currentIndex = statusValues.indexOf(status);
      const nextStatus = statusValues[(currentIndex + 1) % statusValues.length];
      onChange(nextStatus);
    }
  };

  return (
    <StyledChip
      status={status}
      label={statusConfig.label}
      color={statusConfig.color}
      size={size}
      className={className}
      clickable={!disabled && !!onChange}
      disabled={disabled}
      icon={
        <Icon
          name={statusConfig.icon}
          size={size}
          color={statusConfig.color}
          ariaLabel={`${statusConfig.label} status icon`}
        />
      }
      onClick={() => {
        if (onChange && !disabled) {
          const statusValues = Object.values(TaskStatus);
          const currentIndex = statusValues.indexOf(status);
          const nextStatus = statusValues[(currentIndex + 1) % statusValues.length];
          onChange(nextStatus);
        }
      }}
      onKeyPress={handleKeyPress}
      role="status"
      aria-label={ariaLabel || `Task status: ${statusConfig.label}`}
      sx={{
        backgroundColor: statusConfig.backgroundColor,
        color: statusConfig.textColor,
        cursor: onChange && !disabled ? 'pointer' : 'default',
      }}
    />
  );
};

// Display name for debugging
TaskStatus.displayName = 'TaskStatus';

// Default export
export default TaskStatus;

// Type exports for consumers
export type { TaskStatusProps };