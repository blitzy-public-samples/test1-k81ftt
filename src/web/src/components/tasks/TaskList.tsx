/**
 * @fileoverview TaskList Component
 * A production-ready React component that displays a list of tasks with enhanced
 * features including virtualization, accessibility, and responsive layout.
 * @version 1.0.0
 */

import React, { useCallback, useMemo, useRef } from 'react';
import styled from '@emotion/styled';
import { useVirtualizer } from '@tanstack/react-virtual';
import debounce from 'lodash/debounce';

import TaskCard from './TaskCard';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorBoundary from '../common/ErrorBoundary';
import { Task } from '../../types/task.types';
import { TRANSITIONS } from '../../constants/theme.constants';

// -----------------------------------------------------------------------------
// Styled Components
// -----------------------------------------------------------------------------

const TaskListContainer = styled.div<{ layout: 'grid' | 'list' }>`
  display: grid;
  gap: 16px;
  width: 100%;
  min-height: 200px;
  position: relative;
  
  ${({ layout }) => layout === 'grid' ? `
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  ` : `
    grid-template-columns: 1fr;
  `}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const VirtualScrollContainer = styled.div`
  width: 100%;
  height: 100%;
  overflow-y: auto;
  contain: strict;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  text-align: center;
  color: ${props => props.theme.palette.text.secondary};
  background: ${props => props.theme.palette.background.paper};
  border-radius: 8px;
  box-shadow: ${props => props.theme.shadows[1]};
`;

// -----------------------------------------------------------------------------
// Types & Interfaces
// -----------------------------------------------------------------------------

interface TaskListProps {
  tasks: Task[];
  loading?: boolean;
  error?: Error | null;
  onTaskClick?: (task: Task) => void;
  onRetry?: () => void;
  layout?: 'grid' | 'list';
  className?: string;
  virtualizeThreshold?: number;
  pageSize?: number;
  sortOrder?: 'asc' | 'desc';
  filterCriteria?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

const VIRTUALIZATION_THRESHOLD = 50;
const SCROLL_DEBOUNCE_MS = 150;

// -----------------------------------------------------------------------------
// Component Implementation
// -----------------------------------------------------------------------------

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  loading = false,
  error = null,
  onTaskClick,
  onRetry,
  layout = 'grid',
  className,
  virtualizeThreshold = VIRTUALIZATION_THRESHOLD,
  pageSize = 20
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoize whether to use virtualization based on task count
  const shouldVirtualize = useMemo(() => 
    tasks.length > virtualizeThreshold, 
    [tasks.length, virtualizeThreshold]
  );

  // Configure virtualization if needed
  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? tasks.length : 0,
    getScrollElement: () => containerRef.current,
    estimateSize: () => layout === 'grid' ? 200 : 100,
    overscan: 5
  });

  // Debounced scroll handler for performance
  const handleScroll = useCallback(
    debounce(() => {
      if (!containerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      
      if (scrollHeight - scrollTop <= clientHeight * 1.5) {
        // Implement infinite scroll logic here if needed
      }
    }, SCROLL_DEBOUNCE_MS),
    []
  );

  // Memoized task click handler
  const handleTaskClick = useCallback((task: Task) => {
    if (onTaskClick) {
      onTaskClick(task);
    }
  }, [onTaskClick]);

  // Render loading state
  if (loading) {
    return (
      <TaskListContainer layout={layout} className={className}>
        <LoadingSpinner 
          size="large"
          color="primary"
          ariaLabel="Loading tasks..."
        />
      </TaskListContainer>
    );
  }

  // Render error state
  if (error) {
    return (
      <TaskListContainer layout={layout} className={className}>
        <ErrorBoundary
          fallback={
            <EmptyState>
              <h2>Error loading tasks</h2>
              <p>{error.message}</p>
              {onRetry && (
                <button onClick={onRetry}>
                  Try Again
                </button>
              )}
            </EmptyState>
          }
        />
      </TaskListContainer>
    );
  }

  // Render empty state
  if (!tasks.length) {
    return (
      <TaskListContainer layout={layout} className={className}>
        <EmptyState>
          <h2>No tasks found</h2>
          <p>Create a new task to get started</p>
        </EmptyState>
      </TaskListContainer>
    );
  }

  // Render task list with virtualization if needed
  return (
    <TaskListContainer 
      layout={layout} 
      className={className}
      role="list"
      aria-label="Task list"
    >
      {shouldVirtualize ? (
        <VirtualScrollContainer
          ref={containerRef}
          onScroll={handleScroll}
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map(virtualRow => (
            <div
              key={tasks[virtualRow.index].id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              <TaskCard
                task={tasks[virtualRow.index]}
                onClick={handleTaskClick}
                aria-setsize={tasks.length}
                aria-posinset={virtualRow.index + 1}
              />
            </div>
          ))}
        </VirtualScrollContainer>
      ) : (
        tasks.map((task, index) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={handleTaskClick}
            aria-setsize={tasks.length}
            aria-posinset={index + 1}
          />
        ))
      )}
    </TaskListContainer>
  );
};

TaskList.displayName = 'TaskList';

export default React.memo(TaskList);

export type { TaskListProps };