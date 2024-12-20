/**
 * @fileoverview TaskPriority Component
 * A React component that displays and manages task priority levels with visual indicators
 * and tooltips, following Material Design 3 principles and WCAG 2.1 Level AA guidelines.
 * @version 1.0.0
 */

import React, { useCallback, useMemo } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import { Priority } from '../../types/task.types';
import Icon from '../common/Icon';
import Tooltip from '../common/Tooltip';

// -----------------------------------------------------------------------------
// Styled Components
// -----------------------------------------------------------------------------

const StyledPriorityContainer = styled('div')<{
  size?: 'small' | 'medium' | 'large';
  readOnly?: boolean;
  isHighContrast?: boolean;
}>(({ theme, size = 'medium', readOnly, isHighContrast }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(0.5),
  borderRadius: theme.shape.borderRadius,
  cursor: readOnly ? 'default' : 'pointer',
  minWidth: {
    small: 32,
    medium: 44,
    large: 56
  }[size],
  minHeight: {
    small: 32,
    medium: 44,
    large: 56
  }[size],
  transition: theme.transitions.create(['background-color', 'transform'], {
    duration: theme.transitions.duration.shorter
  }),
  ...(isHighContrast && {
    border: `2px solid ${theme.palette.text.primary}`,
    '& .MuiSvgIcon-root': {
      filter: 'contrast(1.5)'
    }
  }),
  '&:hover': !readOnly && {
    backgroundColor: theme.palette.action.hover,
    transform: 'scale(1.05)'
  },
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px'
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none'
  }
}));

// -----------------------------------------------------------------------------
// Types & Interfaces
// -----------------------------------------------------------------------------

export interface TaskPriorityProps {
  priority: Priority;
  onChange?: (priority: Priority) => void;
  readOnly?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  id?: string;
}

// -----------------------------------------------------------------------------
// Priority Configuration
// -----------------------------------------------------------------------------

const PRIORITY_CONFIG = {
  [Priority.LOW]: {
    icon: 'flag',
    color: 'info',
    label: 'Low Priority',
    description: 'Task with low urgency',
    ariaLabel: 'Set task priority to low'
  },
  [Priority.MEDIUM]: {
    icon: 'flag',
    color: 'warning',
    label: 'Medium Priority',
    description: 'Task with medium urgency',
    ariaLabel: 'Set task priority to medium'
  },
  [Priority.HIGH]: {
    icon: 'flag',
    color: 'error',
    label: 'High Priority',
    description: 'Task with high urgency',
    ariaLabel: 'Set task priority to high'
  },
  [Priority.URGENT]: {
    icon: 'priority_high',
    color: 'error',
    label: 'Urgent Priority',
    description: 'Task requiring immediate attention',
    ariaLabel: 'Set task priority to urgent'
  }
} as const;

// -----------------------------------------------------------------------------
// Component Implementation
// -----------------------------------------------------------------------------

const TaskPriority: React.FC<TaskPriorityProps> = React.memo(({
  priority,
  onChange,
  readOnly = false,
  size = 'medium',
  className,
  id
}) => {
  const theme = useTheme();
  const isHighContrast = theme.palette.mode === 'high-contrast';

  // Get priority configuration based on current priority level
  const priorityConfig = useMemo(() => PRIORITY_CONFIG[priority], [priority]);

  // Handle priority change with keyboard support
  const handlePriorityChange = useCallback((event: React.MouseEvent | React.KeyboardEvent) => {
    if (readOnly || !onChange) return;

    const priorities = Object.values(Priority);
    const currentIndex = priorities.indexOf(priority);
    const nextIndex = (currentIndex + 1) % priorities.length;
    onChange(priorities[nextIndex]);
  }, [priority, onChange, readOnly]);

  // Handle keyboard interaction
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handlePriorityChange(event);
    }
  }, [handlePriorityChange]);

  return (
    <Tooltip
      content={priorityConfig.description}
      position="top"
      delay={200}
      id={`${id}-tooltip`}
    >
      <StyledPriorityContainer
        className={className}
        size={size}
        readOnly={readOnly}
        isHighContrast={isHighContrast}
        onClick={handlePriorityChange}
        onKeyDown={handleKeyDown}
        role={readOnly ? 'status' : 'button'}
        tabIndex={readOnly ? -1 : 0}
        aria-label={readOnly ? priorityConfig.label : priorityConfig.ariaLabel}
        id={id}
      >
        <Icon
          name={priorityConfig.icon}
          color={priorityConfig.color}
          size={size}
          aria-hidden="true"
        />
      </StyledPriorityContainer>
    </Tooltip>
  );
});

TaskPriority.displayName = 'TaskPriority';

export default TaskPriority;