import React, { useEffect, useState, useCallback, useRef } from 'react';
import { styled } from '@mui/material';
import { Skeleton, Alert, CircularProgress } from '@mui/material';
import ProjectList from '../../components/projects/ProjectList';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import useWebSocket from '../../hooks/useWebSocket';
import { useNotification } from '../../hooks/useNotification';
import { Project, ProjectFilters, ProjectStatus } from '../../types/project.types';
import { ErrorResponse } from '../../types/common.types';
import { BREAKPOINTS, TRANSITIONS } from '../../constants/theme.constants';
import { EventType } from '../../../backend/src/types/event.types';

// Styled components with Material Design 3 principles
const PageContainer = styled('div')(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: BREAKPOINTS.lg,
  margin: '0 auto',
  minHeight: '100vh',

  '@media (max-width: 768px)': {
    padding: theme.spacing(2),
  }
}));

const LoadingOverlay = styled('div')({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.8)',
  zIndex: 1000,
  transition: `opacity ${TRANSITIONS.duration.standard}ms ${TRANSITIONS.easing.easeInOut}`,

  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  }
}));

// Initial filter state
const initialFilters: ProjectFilters = {
  status: [],
  search: '',
  dateRange: {
    startDate: null,
    endDate: null,
    includeUndated: true
  },
  tags: []
};

/**
 * ProjectListPage component displays a list of projects with real-time updates,
 * filtering, and comprehensive error handling
 */
const ProjectListPage: React.FC = () => {
  // State management
  const [projects, setProjects] = useState<Project[]>([]);
  const [filters, setFilters] = useState<ProjectFilters>(initialFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorResponse | null>(null);
  
  // Hooks
  const { showNotification } = useNotification();
  const {
    isConnected,
    connect,
    disconnect,
    subscribe
  } = useWebSocket();

  // Refs for cleanup and API cancellation
  const abortController = useRef<AbortController>();

  // Handle project click navigation with analytics tracking
  const handleProjectClick = useCallback((project: Project) => {
    // Track analytics event
    try {
      // Analytics tracking implementation
      console.log('Project clicked:', project.id);
    } catch (error) {
      console.error('Analytics error:', error);
    }

    // Navigate to project detail page
    window.location.href = `/projects/${project.id}`;
  }, []);

  // Fetch projects with error handling and cancellation
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Cancel previous request if exists
      if (abortController.current) {
        abortController.current.abort();
      }

      // Create new abort controller
      abortController.current = new AbortController();

      // Fetch projects from API
      const response = await fetch('/api/projects', {
        signal: abortController.current.signal,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(filters)
      });

      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }

      const data = await response.json();
      setProjects(data.projects);

    } catch (err) {
      if (err.name === 'AbortError') {
        return;
      }

      const errorResponse: ErrorResponse = {
        code: 'FETCH_ERROR',
        message: 'Failed to load projects. Please try again.',
        details: {},
        correlationId: crypto.randomUUID()
      };

      setError(errorResponse);
      showNotification({
        message: errorResponse.message,
        type: 'error',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  }, [filters, showNotification]);

  // Handle real-time project updates
  const handleProjectUpdate = useCallback((data: any) => {
    const updatedProject = data.project as Project;
    
    setProjects(prevProjects => {
      const projectIndex = prevProjects.findIndex(p => p.id === updatedProject.id);
      
      if (projectIndex === -1) {
        return [...prevProjects, updatedProject];
      }

      const newProjects = [...prevProjects];
      newProjects[projectIndex] = updatedProject;
      return newProjects;
    });

    showNotification({
      message: `Project "${updatedProject.name}" has been updated`,
      type: 'info',
      duration: 3000
    });
  }, [showNotification]);

  // Initialize WebSocket connection and subscriptions
  useEffect(() => {
    connect();

    const unsubscribe = subscribe('projects', handleProjectUpdate);

    return () => {
      unsubscribe();
      disconnect();
    };
  }, [connect, disconnect, subscribe, handleProjectUpdate]);

  // Fetch projects on mount and filter changes
  useEffect(() => {
    fetchProjects();

    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [fetchProjects]);

  // Render loading state
  if (loading && !projects.length) {
    return (
      <LoadingOverlay>
        <CircularProgress 
          size={48}
          aria-label="Loading projects"
        />
      </LoadingOverlay>
    );
  }

  return (
    <ErrorBoundary>
      <PageContainer>
        {error && (
          <Alert 
            severity="error"
            onClose={() => setError(null)}
            sx={{ marginBottom: 2 }}
          >
            {error.message}
          </Alert>
        )}

        {!isConnected && (
          <Alert 
            severity="warning"
            sx={{ marginBottom: 2 }}
          >
            Real-time updates are currently unavailable. Please check your connection.
          </Alert>
        )}

        <ProjectList
          projects={projects}
          filters={filters}
          onProjectClick={handleProjectClick}
          loading={loading}
        />
      </PageContainer>
    </ErrorBoundary>
  );
};

export default ProjectListPage;