/**
 * @fileoverview Enhanced project form component with comprehensive validation,
 * accessibility features, and Material Design 3 implementation
 * @version 1.0.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm, useFormState, useWatch } from 'react-hook-form';
import { debounce } from 'lodash';
import {
  TextField,
  TextareaAutosize,
  Button,
  FormControl,
  FormHelperText,
  Select,
  MenuItem,
  Stack,
  Alert,
  Box,
  Typography,
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import {
  Project,
  CreateProjectPayload,
  UpdateProjectPayload,
  ProjectStatus,
  ValidationError
} from '../../types/project.types';
import {
  validateCreateProject,
  validateUpdateProject,
  validateProjectField
} from '../../validation/project.validation';

// Version comments for third-party dependencies
// @mui/material: ^5.14.0
// react-hook-form: ^7.45.0
// lodash: ^4.17.21

/**
 * Props interface for the ProjectForm component
 */
interface ProjectFormProps {
  project?: Project | null;
  onSubmit: (data: CreateProjectPayload | UpdateProjectPayload) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  validationMode?: 'onChange' | 'onBlur' | 'onSubmit';
  enableRealTimeValidation?: boolean;
  locale?: string;
}

/**
 * Custom hook for form validation with debouncing
 */
const useFormValidation = (
  formData: any,
  isEdit: boolean,
  currentStatus?: ProjectStatus
) => {
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = useCallback(
    debounce(async (data: any) => {
      const validationResult = isEdit
        ? validateUpdateProject(data, currentStatus)
        : validateCreateProject(data);

      setValidationErrors(validationResult.errors || {});
    }, 300),
    [isEdit, currentStatus]
  );

  useEffect(() => {
    validateForm(formData);
  }, [formData, validateForm]);

  return validationErrors;
};

/**
 * ProjectForm component for creating and editing projects with enhanced validation
 * and accessibility features
 */
export const ProjectForm: React.FC<ProjectFormProps> = ({
  project = null,
  onSubmit,
  onCancel,
  loading = false,
  validationMode = 'onChange',
  enableRealTimeValidation = true,
  locale = 'en-US'
}) => {
  const isEdit = Boolean(project);
  const defaultValues = useMemo(() => ({
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || ProjectStatus.PLANNING,
    startDate: project?.startDate || new Date(),
    endDate: project?.endDate || new Date(),
    metadata: project?.metadata || {
      tags: [],
      customFields: {},
      settings: {
        visibility: 'PRIVATE',
        notifications: {
          emailNotifications: true,
          inAppNotifications: true,
          frequency: 'INSTANT',
          events: ['STATUS_CHANGE', 'DUE_DATE']
        }
      }
    }
  }), [project]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty, isValid },
    watch,
    setValue,
    trigger
  } = useForm({
    defaultValues,
    mode: validationMode
  });

  const formData = watch();
  const validationErrors = useFormValidation(
    formData,
    isEdit,
    project?.status
  );

  const onFormSubmit = async (data: any) => {
    if (loading) return;

    try {
      const payload = isEdit
        ? { id: project.id, ...data } as UpdateProjectPayload
        : data as CreateProjectPayload;

      await onSubmit(payload);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onFormSubmit)}
      noValidate
      aria-label={isEdit ? 'Edit Project Form' : 'Create Project Form'}
      sx={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}
    >
      <Stack spacing={3}>
        <Typography variant="h5" component="h2">
          {isEdit ? 'Edit Project' : 'Create New Project'}
        </Typography>

        {/* Project Name Field */}
        <FormControl error={Boolean(errors.name || validationErrors.name)}>
          <TextField
            {...register('name', {
              required: 'Project name is required',
              validate: validateProjectField
            })}
            label="Project Name"
            fullWidth
            error={Boolean(errors.name || validationErrors.name)}
            helperText={errors.name?.message || validationErrors.name}
            disabled={loading}
            inputProps={{
              'aria-label': 'Project name',
              'aria-describedby': 'project-name-helper-text'
            }}
          />
        </FormControl>

        {/* Project Description Field */}
        <FormControl error={Boolean(errors.description || validationErrors.description)}>
          <TextareaAutosize
            {...register('description', {
              validate: validateProjectField
            })}
            minRows={4}
            placeholder="Enter project description"
            style={{
              width: '100%',
              padding: '8px',
              borderColor: errors.description ? '#d32f2f' : '#ccc'
            }}
            disabled={loading}
            aria-label="Project description"
            aria-describedby="project-description-helper-text"
          />
          {(errors.description || validationErrors.description) && (
            <FormHelperText error>
              {errors.description?.message || validationErrors.description}
            </FormHelperText>
          )}
        </FormControl>

        {/* Project Status Field */}
        {isEdit && (
          <FormControl>
            <Select
              {...register('status')}
              value={formData.status}
              disabled={loading}
              aria-label="Project status"
            >
              {Object.values(ProjectStatus).map((status) => (
                <MenuItem key={status} value={status}>
                  {status.replace('_', ' ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Date Fields */}
        <Stack direction="row" spacing={2}>
          <DatePicker
            label="Start Date"
            value={formData.startDate}
            onChange={(date) => setValue('startDate', date)}
            disabled={loading}
            slotProps={{
              textField: {
                'aria-label': 'Project start date'
              }
            }}
          />
          <DatePicker
            label="End Date"
            value={formData.endDate}
            onChange={(date) => setValue('endDate', date)}
            disabled={loading}
            slotProps={{
              textField: {
                'aria-label': 'Project end date'
              }
            }}
          />
        </Stack>

        {/* Form Actions */}
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label="Cancel form"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || (!isDirty && !isValid)}
            aria-label={isEdit ? 'Save project changes' : 'Create project'}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : isEdit ? (
              'Save Changes'
            ) : (
              'Create Project'
            )}
          </Button>
        </Stack>

        {/* Validation Feedback */}
        {Object.keys(validationErrors).length > 0 && (
          <Alert severity="error" aria-live="polite">
            Please correct the errors before submitting the form
          </Alert>
        )}
      </Stack>
    </Box>
  );
};

export default ProjectForm;