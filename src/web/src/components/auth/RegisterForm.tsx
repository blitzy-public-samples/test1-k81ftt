/**
 * @fileoverview Secure and accessible registration form component
 * Implements comprehensive validation, OAuth integration, and MFA verification
 * with WCAG 2.1 Level AA compliance.
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next'; // ^12.0.0
import {
  Box,
  TextField,
  Button,
  Typography,
  Divider,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment,
  Paper
} from '@mui/material'; // ^5.0.0
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { RegisterData, AuthUser, AuthProvider } from '../../types/auth.types';
import { registerValidationSchema } from '../../validation/auth.validation';
import AuthService from '../../services/auth.service';
import useForm from '../../hooks/useForm';

/**
 * Props for the RegisterForm component
 */
interface RegisterFormProps {
  onSuccess: (user: AuthUser) => void;
  onError: (error: Error) => void;
  onMFARequired: (verificationId: string) => void;
  className?: string;
  csrfToken: string;
}

/**
 * Secure registration form component with comprehensive validation and accessibility
 */
export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  onError,
  onMFARequired,
  className = '',
  csrfToken
}) => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);

  // Initialize form with validation rules and initial values
  const {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldError
  } = useForm<RegisterData>(
    {
      email: '',
      password: '',
      firstName: '',
      lastName: ''
    },
    registerValidationSchema,
    handleRegistration
  );

  /**
   * Handles secure form submission with rate limiting and CSRF protection
   */
  async function handleRegistration(formData: RegisterData): Promise<void> {
    try {
      // Validate CSRF token
      if (!csrfToken) {
        throw new Error('Invalid security token');
      }

      const authService = AuthService.getInstance();
      const response = await authService.register({
        ...formData,
        csrfToken
      });

      if (response.mfaRequired) {
        onMFARequired(response.verificationId);
      } else {
        onSuccess(response.user);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      setFieldError('submit', errorMessage);
      onError(error as Error);
    }
  }

  /**
   * Handles OAuth-based registration through Azure AD B2C
   */
  const handleOAuthRegistration = useCallback(async () => {
    try {
      setIsOAuthLoading(true);
      const authService = AuthService.getInstance();
      await authService.registerWithOAuth(AuthProvider.AZURE_AD);
    } catch (error) {
      onError(error as Error);
    } finally {
      setIsOAuthLoading(false);
    }
  }, [onError]);

  /**
   * Toggles password visibility with accessibility support
   */
  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  return (
    <Paper 
      elevation={3}
      className={className}
      component="form"
      onSubmit={handleSubmit}
      aria-label={t('auth.register.formLabel')}
      sx={{ p: 4, maxWidth: 500, width: '100%' }}
    >
      <Typography variant="h5" component="h1" gutterBottom>
        {t('auth.register.title')}
      </Typography>

      {errors.submit && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errors.submit}
        </Alert>
      )}

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          required
          id="firstName"
          name="firstName"
          label={t('auth.register.firstName')}
          value={values.firstName}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.firstName && !!errors.firstName}
          helperText={touched.firstName && errors.firstName}
          disabled={isSubmitting}
          inputProps={{
            'aria-label': t('auth.register.firstName'),
            'aria-required': 'true',
            maxLength: 50
          }}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          required
          id="lastName"
          name="lastName"
          label={t('auth.register.lastName')}
          value={values.lastName}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.lastName && !!errors.lastName}
          helperText={touched.lastName && errors.lastName}
          disabled={isSubmitting}
          inputProps={{
            'aria-label': t('auth.register.lastName'),
            'aria-required': 'true',
            maxLength: 50
          }}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          required
          type="email"
          id="email"
          name="email"
          label={t('auth.register.email')}
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.email && !!errors.email}
          helperText={touched.email && errors.email}
          disabled={isSubmitting}
          inputProps={{
            'aria-label': t('auth.register.email'),
            'aria-required': 'true',
            maxLength: 255,
            autoComplete: 'email'
          }}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          required
          type={showPassword ? 'text' : 'password'}
          id="password"
          name="password"
          label={t('auth.register.password')}
          value={values.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.password && !!errors.password}
          helperText={touched.password && errors.password}
          disabled={isSubmitting}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}
                  onClick={togglePasswordVisibility}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            )
          }}
          inputProps={{
            'aria-label': t('auth.register.password'),
            'aria-required': 'true',
            maxLength: 128,
            autoComplete: 'new-password'
          }}
        />
      </Box>

      <Button
        fullWidth
        type="submit"
        variant="contained"
        color="primary"
        disabled={isSubmitting}
        aria-label={t('auth.register.submit')}
        sx={{ mb: 2 }}
      >
        {isSubmitting ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          t('auth.register.submit')
        )}
      </Button>

      <Divider sx={{ my: 2 }}>
        <Typography variant="body2" color="textSecondary">
          {t('auth.register.or')}
        </Typography>
      </Divider>

      <Button
        fullWidth
        variant="outlined"
        onClick={handleOAuthRegistration}
        disabled={isOAuthLoading}
        aria-label={t('auth.register.withAzure')}
      >
        {isOAuthLoading ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          t('auth.register.withAzure')
        )}
      </Button>
    </Paper>
  );
};

export type { RegisterFormProps };
export default RegisterForm;