import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Grid, 
  Paper, 
  Typography, 
  Button, 
  Skeleton 
} from '@mui/material';
import ProjectCard from '../../components/projects/ProjectCard';
import ProjectMembers from '../../components/projects/ProjectMembers';
import ProjectTimeline from '../../components/projects/ProjectTimeline';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import useWebSocket from '../../hooks/useWebSocket';
import { Project, ProjectStatus } from '../../types/project.types';
import { EventType } from '../../../backend/src/types/event.types';
import { useNotification } from '../../hooks/useNotification';

// Constants for real-time updates
const WS_CHANNEL = 'project-updates';
const LOADING_DELAY = 300;

interface ProjectDetailState {
  project: Project | null;
  loading: boolean;
  error: Error | null;
}

const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  
  // State management
  const [state, setState] = useState<ProjectDetailState>({
    project: null,
    loading: true,
    error: null
  });

  // WebSocket connection for real-time updates
  const { 
    isConnected, 
    subscribe, 
    connectionLatency 
  } = useWebSocket({
    autoReconnect: true,
    syncAcrossTabs: true
  });

  // Fetch project data with error handling
  const fetchProjectData = useCallback(async () => {
    if (!projectId) return;

    try {
      setState(prev => ({ ...prev, loading: true }));
      const response = await fetch(`/api/projects/${projectId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch project details');
      }

      const data = await response.json();
      setState(prev => ({ 
        ...prev, 
        project: data,
        loading: false,
        error: null
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error as Error,
        loading: false
      }));
      showNotification({
        message: 'Error loading project details',
        type: 'error'
      });
    }
  }, [projectId, showNotification]);

  // Handle real-time project updates
  const handleProjectUpdate = useCallback((data: any) => {
    if (data.projectId === projectId) {
      setState(prev => ({
        ...prev,
        project: {
          ...prev.project!,
          ...data.updates
        }
      }));

      showNotification({
        message: 'Project details updated',
        type: 'info'
      });
    }
  }, [projectId, showNotification]);

  // Setup WebSocket subscription
  useEffect(() => {
    if (isConnected) {
      const unsubscribe = subscribe(WS_CHANNEL, handleProjectUpdate);
      return () => unsubscribe();
    }
  }, [isConnected, subscribe, handleProjectUpdate]);

  // Initial data fetch
  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // Memoized project status color
  const statusColor = useMemo(() => {
    if (!state.project) return 'primary';
    
    const colors: Record<ProjectStatus, 'primary' | 'success' | 'warning' | 'error'> = {
      [ProjectStatus.PLANNING]: 'primary',
      [ProjectStatus.IN_PROGRESS]: 'primary',
      [ProjectStatus.ON_HOLD]: 'warning',
      [ProjectStatus.COMPLETED]: 'success',
      [ProjectStatus.CANCELLED]: 'error'
    };
    
    return colors[state.project.status];
  }, [state.project]);

  // Loading skeleton
  if (state.loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Skeleton variant="rectangular" height={200} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={200} />
          </Grid>
          <Grid item xs={12}>
            <Skeleton variant="rectangular" height={400} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  // Error state
  if (state.error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper 
          sx={{ 
            p: 3, 
            textAlign: 'center',
            backgroundColor: 'error.light'
          }}
        >
          <Typography variant="h6" color="error.dark">
            {state.error.message}
          </Typography>
          <Button 
            variant="contained" 
            onClick={fetchProjectData}
            sx={{ mt: 2 }}
          >
            Retry
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <ErrorBoundary>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3}>
          {/* Project Overview */}
          <Grid item xs={12} md={8}>
            {state.project && (
              <ProjectCard
                project={state.project}
                onClick={() => navigate(`/projects/${projectId}/edit`)}
                testId="project-detail-card"
              />
            )}
          </Grid>

          {/* Project Members */}
          <Grid item xs={12} md={4}>
            {state.project && (
              <ProjectMembers
                projectId={projectId!}
                members={state.project.members}
                onAddMember={async () => {/* Add member logic */}}
                onRemoveMember={async () => {/* Remove member logic */}}
                onMemberClick={() => {/* Member click logic */}}
                isEditable={true}
                isLoading={false}
                error={null}
              />
            )}
          </Grid>

          {/* Project Timeline */}
          <Grid item xs={12}>
            {state.project && (
              <ProjectTimeline
                project={state.project}
                showProgress={true}
                showDates={true}
                interactive={true}
                virtualize={true}
                timezone={Intl.DateTimeFormat().resolvedOptions().timeZone}
              />
            )}
          </Grid>
        </Grid>

        {/* Real-time connection status */}
        {!isConnected && (
          <Typography
            variant="caption"
            color="warning.main"
            sx={{ 
              position: 'fixed', 
              bottom: 16, 
              right: 16,
              bgcolor: 'warning.light',
              p: 1,
              borderRadius: 1
            }}
          >
            Reconnecting to real-time updates...
          </Typography>
        )}
      </Container>
    </ErrorBoundary>
  );
};

export default ProjectDetailPage;