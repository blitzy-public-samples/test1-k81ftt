/**
 * @fileoverview Project creation page component implementing Material Design 3 principles
 * with comprehensive form validation, error handling, and accessibility features
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  Box,
  Typography,
  CircularProgress,
  Breadcrumbs,
  Link,
  useTheme,
  useMediaQuery
} from '@mui/material';
import ProjectForm from '../../components/projects/ProjectForm';
import DashboardLayout from '../../layouts/DashboardLayout';
import useNotification from '../../hooks/useNotification';
import { CreateProjectPayload } from '../../types/project.types';
import { createProject } from '../../store/actions/project.actions';
import { handleApiError } from '../../utils/error.utils';

/**
 * Project creation page component with enhanced validation and accessibility
 */
const ProjectCreatePage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showNotification } = useNotification();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Local state management
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  /**
   * Handles form submission with validation and error handling
   */
  const handleSubmit = useCallback(async (formData: CreateProjectPayload) => {
    setIsSubmitting(true);
    try {
      await dispatch(createProject(formData));
      
      showNotification({
        message: 'Project created successfully',
        type: 'success',
        aria: {
          role: 'status',
          live: 'polite'
        }
      });

      navigate('/projects');
    } catch (error) {
      const apiError = handleApiError(error as Error);
      showNotification({
        message: apiError.message,
        type: 'error',
        duration: 6000,
        aria: {
          role: 'alert',
          live: 'assertive'
        }
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [dispatch, navigate, showNotification]);

  /**
   * Handles form cancellation with unsaved changes warning
   */
  const handleCancel = useCallback(async () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      );
      if (!confirmed) return;
    }
    navigate('/projects');
  }, [hasUnsavedChanges, navigate]);

  /**
   * Prompt user when trying to leave with unsaved changes
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <DashboardLayout>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: theme.spacing(3),
          maxWidth: '1200px',
          margin: '0 auto'
        }}
      >
        {/* Breadcrumb Navigation */}
        <Breadcrumbs
          aria-label="breadcrumb navigation"
          sx={{ mb: 3 }}
        >
          <Link
            color="inherit"
            href="/dashboard"
            onClick={(e) => {
              e.preventDefault();
              navigate('/dashboard');
            }}
          >
            Dashboard
          </Link>
          <Link
            color="inherit"
            href="/projects"
            onClick={(e) => {
              e.preventDefault();
              navigate('/projects');
            }}
          >
            Projects
          </Link>
          <Typography color="textPrimary">Create Project</Typography>
        </Breadcrumbs>

        {/* Page Title */}
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{
            mb: 4,
            fontSize: isMobile ? '1.5rem' : '2rem'
          }}
        >
          Create New Project
        </Typography>

        {/* Project Creation Form */}
        <Box
          sx={{
            position: 'relative',
            backgroundColor: theme.palette.background.paper,
            borderRadius: theme.shape.borderRadius,
            p: theme.spacing(3),
            boxShadow: theme.shadows[1]
          }}
        >
          <ProjectForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={isSubmitting}
            onChange={() => setHasUnsavedChanges(true)}
            enableRealTimeValidation
            validationMode="onChange"
          />

          {/* Loading Overlay */}
          {isSubmitting && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                zIndex: 1
              }}
            >
              <CircularProgress
                size={48}
                aria-label="Creating project..."
              />
            </Box>
          )}
        </Box>
      </Box>
    </DashboardLayout>
  );
};

export default ProjectCreatePage;