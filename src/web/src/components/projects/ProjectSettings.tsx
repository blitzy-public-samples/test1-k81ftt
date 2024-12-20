/**
 * @fileoverview Project Settings Component for Task Management System
 * @version 1.0.0
 * 
 * Provides a comprehensive interface for managing project settings with
 * enhanced accessibility, validation, and real-time updates.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'; // ^18.0.0
import { useForm, FormProvider } from 'react-hook-form'; // ^7.0.0
import * as yup from 'yup'; // ^1.0.0
import { Project, UpdateProjectPayload, ProjectStatus, ProjectVisibility } from '../../types/project.types';
import { projectService } from '../../services/project.service';
import Button from '../common/Button';
import { handleApiError, handleValidationError } from '../../utils/error.utils';

/**
 * Props interface for the ProjectSettings component
 */
export interface ProjectSettingsProps {
  project: Project;
  onUpdate: (project: Project) => Promise<void>;
  onError: (error: Error) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  autoSave?: boolean;
}

/**
 * Form data interface for project settings
 */
interface ProjectSettingsFormData {
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: Date;
  endDate: Date;
  visibility: ProjectVisibility;
  notifications: {
    emailNotifications: boolean;
    inAppNotifications: boolean;
    frequency: 'INSTANT' | 'DAILY' | 'WEEKLY';
    events: string[];
  };
  metadata: {
    tags: string[];
    customFields: Record<string, unknown>;
  };
}

/**
 * Validation schema for project settings
 */
const validationSchema = yup.object().shape({
  name: yup
    .string()
    .required('Project name is required')
    .min(3, 'Project name must be at least 3 characters')
    .max(100, 'Project name cannot exceed 100 characters')
    .matches(/^[\w\s\-.,()]+$/, 'Project name contains invalid characters'),
  description: yup
    .string()
    .max(2000, 'Description cannot exceed 2000 characters'),
  status: yup
    .string()
    .oneOf(Object.values(ProjectStatus), 'Invalid project status')
    .required('Project status is required'),
  startDate: yup
    .date()
    .required('Start date is required')
    .min(new Date(), 'Start date cannot be in the past'),
  endDate: yup
    .date()
    .required('End date is required')
    .min(yup.ref('startDate'), 'End date cannot be before start date')
    .test('duration', 'Project duration cannot exceed 24 months', function(value) {
      const start = this.parent.startDate;
      if (!start || !value) return true;
      const months = (value.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return months <= 24;
    }),
  visibility: yup
    .string()
    .oneOf(Object.values(ProjectVisibility), 'Invalid visibility setting')
    .required('Visibility setting is required'),
  notifications: yup.object({
    emailNotifications: yup.boolean(),
    inAppNotifications: yup.boolean(),
    frequency: yup.string().oneOf(['INSTANT', 'DAILY', 'WEEKLY']),
    events: yup.array().of(yup.string())
  })
});

/**
 * ProjectSettings component for managing project configuration
 */
export const ProjectSettings: React.FC<ProjectSettingsProps> = ({
  project,
  onUpdate,
  onError,
  onCancel,
  isSubmitting = false,
  autoSave = false
}) => {
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [lastSavedData, setLastSavedData] = useState<ProjectSettingsFormData | null>(null);

  // Initialize form with react-hook-form and validation
  const methods = useForm<ProjectSettingsFormData>({
    defaultValues: {
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: new Date(project.startDate),
      endDate: new Date(project.endDate),
      visibility: project.metadata.settings.visibility,
      notifications: project.metadata.settings.notifications,
      metadata: project.metadata
    },
    mode: 'onChange',
    resolver: async (data) => {
      try {
        await validationSchema.validate(data, { abortEarly: false });
        return { values: data, errors: {} };
      } catch (err) {
        if (err instanceof yup.ValidationError) {
          return {
            values: {},
            errors: handleValidationError(err.inner)
          };
        }
        return { values: {}, errors: { root: { message: 'Validation failed' } } };
      }
    }
  });

  const { handleSubmit, formState: { isDirty, errors }, reset, watch } = methods;

  // Memoize form data for comparison
  const formData = watch();
  const memoizedFormData = useMemo(() => formData, [JSON.stringify(formData)]);

  /**
   * Handle auto-save functionality
   */
  useEffect(() => {
    if (autoSave && isDirty && !isSubmitting) {
      if (saveTimeout) clearTimeout(saveTimeout);
      
      const timeoutId = setTimeout(() => {
        handleSubmit(onSubmit)();
      }, 3000); // Auto-save after 3 seconds of inactivity
      
      setSaveTimeout(timeoutId);
    }

    return () => {
      if (saveTimeout) clearTimeout(saveTimeout);
    };
  }, [memoizedFormData, autoSave, isDirty, isSubmitting]);

  /**
   * Transform form data to update payload
   */
  const transformFormData = (data: ProjectSettingsFormData): UpdateProjectPayload => ({
    id: project.id,
    name: data.name,
    description: data.description,
    status: data.status,
    startDate: data.startDate,
    endDate: data.endDate,
    metadata: {
      ...project.metadata,
      settings: {
        visibility: data.visibility,
        notifications: data.notifications
      },
      tags: data.metadata.tags,
      customFields: data.metadata.customFields
    }
  });

  /**
   * Handle form submission with optimistic updates
   */
  const onSubmit = async (data: ProjectSettingsFormData) => {
    try {
      const updatePayload = transformFormData(data);
      setLastSavedData(data);

      // Optimistic update
      onUpdate({
        ...project,
        ...updatePayload
      });

      // Actual API update
      await projectService.updateProject(project.id, updatePayload);

      // Reset form state
      reset(data);
    } catch (error) {
      // Revert optimistic update
      if (lastSavedData) {
        reset(lastSavedData);
      }
      onError(handleApiError(error as Error));
    }
  };

  /**
   * Handle form cancellation
   */
  const handleCancel = useCallback(() => {
    if (saveTimeout) clearTimeout(saveTimeout);
    reset();
    onCancel();
  }, [saveTimeout, reset, onCancel]);

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="project-settings"
        aria-label="Project Settings Form"
        noValidate
      >
        <div className="project-settings__content" role="group" aria-labelledby="project-settings-title">
          <h2 id="project-settings-title" className="project-settings__title">
            Project Settings
          </h2>

          {/* Form fields would be implemented here */}
          {/* This is a placeholder for the actual form fields */}

          <div className="project-settings__actions">
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              loadingText="Saving..."
              disabled={!isDirty || Object.keys(errors).length > 0}
              ariaLabel="Save project settings"
            >
              Save Changes
            </Button>
            
            <Button
              type="button"
              variant="outlined"
              onClick={handleCancel}
              disabled={isSubmitting}
              ariaLabel="Cancel changes"
            >
              Cancel
            </Button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

export default ProjectSettings;