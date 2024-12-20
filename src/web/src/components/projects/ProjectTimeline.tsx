/**
 * @fileoverview Project Timeline Component
 * Visualizes project timeline and progress using Material UI Timeline components
 * Supports interactive features, accessibility, and timezone-aware date handling
 * @version 1.0.0
 */

import React, { useMemo, useCallback, memo } from 'react'; // ^18.0.0
import { styled, useTheme } from '@mui/material'; // ^5.0.0
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot
} from '@mui/lab'; // ^5.0.0
import { VirtualizedList } from 'react-window'; // ^1.8.0

import { Project, ProjectStatus, Milestone } from '../../types/project.types';
import ProgressBar from '../common/ProgressBar';
import { formatDate, calculateDateRange, isValidDateRange } from '../../utils/date.utils';
import ErrorBoundary from '../common/ErrorBoundary';

// Styled components with Material Design 3 implementation
const TimelineContainer = styled('div')(({ theme }) => ({
  width: '100%',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1],
  transition: 'all 0.3s ease',
  '@media (prefers-reduced-motion)': {
    transition: 'none'
  }
}));

const TimelineDate = styled('span')(({ theme }) => ({
  fontSize: theme.typography.caption.fontSize,
  color: theme.palette.text.secondary,
  marginBottom: theme.spacing(0.5),
  fontWeight: theme.typography.fontWeightMedium
}));

// Interface definitions
interface ProjectTimelineProps {
  project: Project;
  showProgress?: boolean;
  showDates?: boolean;
  interactive?: boolean;
  onMilestoneClick?: (milestone: Milestone) => void;
  className?: string;
  virtualize?: boolean;
  timezone?: string;
}

interface TimelineState {
  progress: number;
  isLoading: boolean;
  error: Error | null;
  selectedMilestone: Milestone | null;
}

/**
 * Calculates project progress based on start and end dates with timezone support
 */
const calculateProgress = (project: Project, timezone?: string): number => {
  if (!isValidDateRange({ startDate: project.startDate, endDate: project.endDate })) {
    return 0;
  }

  // Handle completed projects
  if (project.status === ProjectStatus.COMPLETED) {
    return 100;
  }

  const now = timezone 
    ? new Date(new Date().toLocaleString('en-US', { timeZone: timezone }))
    : new Date();

  const totalDuration = project.endDate.getTime() - project.startDate.getTime();
  const elapsedDuration = now.getTime() - project.startDate.getTime();
  
  const progress = Math.min(Math.max((elapsedDuration / totalDuration) * 100, 0), 100);
  return Math.round(progress);
};

/**
 * Determines timeline color based on project status and theme
 */
const getTimelineColor = (status: ProjectStatus, theme: any): string => {
  const colors = {
    [ProjectStatus.PLANNING]: theme.palette.info.main,
    [ProjectStatus.IN_PROGRESS]: theme.palette.primary.main,
    [ProjectStatus.ON_HOLD]: theme.palette.warning.main,
    [ProjectStatus.COMPLETED]: theme.palette.success.main,
    [ProjectStatus.CANCELLED]: theme.palette.error.main
  };

  return colors[status] || theme.palette.primary.main;
};

/**
 * ProjectTimeline Component
 * Visualizes project timeline with interactive features and accessibility support
 */
const ProjectTimeline: React.FC<ProjectTimelineProps> = memo(({
  project,
  showProgress = true,
  showDates = true,
  interactive = true,
  onMilestoneClick,
  className,
  virtualize = false,
  timezone
}) => {
  const theme = useTheme();

  // Calculate project progress with timezone support
  const progress = useMemo(() => 
    calculateProgress(project, timezone),
    [project, timezone]
  );

  // Get timeline color based on project status
  const timelineColor = useMemo(() => 
    getTimelineColor(project.status, theme),
    [project.status, theme]
  );

  // Handle milestone click with accessibility support
  const handleMilestoneClick = useCallback((milestone: Milestone) => {
    if (interactive && onMilestoneClick) {
      onMilestoneClick(milestone);
    }
  }, [interactive, onMilestoneClick]);

  // Render timeline item with accessibility support
  const renderTimelineItem = useCallback(({ milestone, index }: { milestone: Milestone, index: number }) => (
    <TimelineItem
      key={milestone.id}
      sx={{ minHeight: 64 }}
      role="listitem"
      aria-label={`Milestone: ${milestone.title}`}
    >
      <TimelineSeparator>
        <TimelineDot
          color={milestone.completed ? 'success' : 'primary'}
          sx={{ cursor: interactive ? 'pointer' : 'default' }}
          onClick={() => handleMilestoneClick(milestone)}
          tabIndex={interactive ? 0 : -1}
          role={interactive ? 'button' : 'presentation'}
          aria-label={interactive ? `Select milestone: ${milestone.title}` : undefined}
        />
        {index < project.milestones.length - 1 && (
          <TimelineConnector sx={{ bgcolor: timelineColor }} />
        )}
      </TimelineSeparator>
      <TimelineContent>
        {showDates && (
          <TimelineDate>
            {formatDate(milestone.date, timezone)}
          </TimelineDate>
        )}
        <div>{milestone.title}</div>
      </TimelineContent>
    </TimelineItem>
  ), [handleMilestoneClick, interactive, showDates, timelineColor, timezone]);

  // Virtualized timeline for performance optimization
  const VirtualizedTimeline = useMemo(() => {
    if (!virtualize || project.milestones.length <= 10) return null;

    return (
      <VirtualizedList
        height={400}
        width="100%"
        itemCount={project.milestones.length}
        itemSize={64}
        overscanCount={3}
      >
        {({ index, style }) => (
          <div style={style}>
            {renderTimelineItem({ 
              milestone: project.milestones[index],
              index 
            })}
          </div>
        )}
      </VirtualizedList>
    );
  }, [virtualize, project.milestones, renderTimelineItem]);

  return (
    <ErrorBoundary>
      <TimelineContainer className={className}>
        {showProgress && (
          <ProgressBar
            value={progress}
            color={timelineColor}
            aria-label={`Project progress: ${progress}%`}
          />
        )}
        
        <Timeline
          role="list"
          aria-label="Project timeline"
          sx={{ 
            p: 0,
            m: theme.spacing(2, 0),
            [theme.breakpoints.down('sm')]: {
              '.MuiTimelineItem-root': {
                minHeight: 48
              }
            }
          }}
        >
          {VirtualizedTimeline || project.milestones.map((milestone, index) => 
            renderTimelineItem({ milestone, index })
          )}
        </Timeline>
      </TimelineContainer>
    </ErrorBoundary>
  );
});

ProjectTimeline.displayName = 'ProjectTimeline';

export default ProjectTimeline;
export type { ProjectTimelineProps };