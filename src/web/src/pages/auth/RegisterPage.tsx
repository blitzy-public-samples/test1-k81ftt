/**
 * @fileoverview Registration Page Component
 * Implements secure user registration with OAuth 2.0/OIDC support and WCAG 2.1 Level AA compliance
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useErrorBoundary } from 'react-error-boundary';
import { RegisterForm, RegisterFormProps } from '../../components/auth/RegisterForm';
import { AuthLayout } from '../../layouts/AuthLayout';
import { useAuth } from '../../hooks/useAuth';
import { Toast } from '../../components/common/Toast';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';

/**
 * Registration page component implementing secure registration flows
 * with comprehensive validation and accessibility support
 */
const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, registerWithProvider, error: authError } = useAuth();
  const { showBoundary } = useErrorBoundary();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Fetch CSRF token on mount
  useEffect(() => {
    const metaElement = document.querySelector('meta[name="csrf-token"]');
    if (metaElement) {
      setCsrfToken(metaElement.getAttribute('content'));
    }
  }, []);

  /**
   * Handles successful registration with proper navigation
   * and user feedback
   */
  const handleRegistrationSuccess = useCallback(async (user: any) => {
    try {
      // Show success notification
      Toast({
        id: 'registration-success',
        message: 'Registration successful! Please check your email for verification.',
        type: 'success',
        duration: 6000,
        position: 'top-center',
        aria: {
          role: 'status',
          live: 'polite'
        }
      });

      // Navigate to login page
      navigate('/login', {
        state: { message: 'Please verify your email before logging in.' }
      });
    } catch (error) {
      showBoundary(error);
    } finally {
      setIsSubmitting(false);
    }
  }, [navigate, showBoundary]);

  /**
   * Handles registration errors with proper user feedback
   */
  const handleRegistrationError = useCallback((error: Error) => {
    setIsSubmitting(false);
    Toast({
      id: 'registration-error',
      message: error.message || 'Registration failed. Please try again.',
      type: 'error',
      duration: 8000,
      position: 'top-center',
      aria: {
        role: 'alert',
        live: 'assertive'
      }
    });
  }, []);

  /**
   * Handles form submission with validation and security checks
   */
  const handleSubmit: RegisterFormProps['onSuccess'] = useCallback(async (formData) => {
    if (!csrfToken) {
      handleRegistrationError(new Error('Security token missing. Please refresh the page.'));
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await register({
        ...formData,
        csrfToken
      });
      await handleRegistrationSuccess(user);
    } catch (error) {
      handleRegistrationError(error as Error);
    }
  }, [csrfToken, register, handleRegistrationSuccess, handleRegistrationError]);

  /**
   * Handles OAuth provider registration with proper error handling
   */
  const handleProviderRegistration = useCallback(async (providerId: string) => {
    if (!csrfToken) {
      handleRegistrationError(new Error('Security token missing. Please refresh the page.'));
      return;
    }

    setIsSubmitting(true);

    try {
      const user = await registerWithProvider(providerId, csrfToken);
      await handleRegistrationSuccess(user);
    } catch (error) {
      handleRegistrationError(error as Error);
    }
  }, [csrfToken, registerWithProvider, handleRegistrationSuccess, handleRegistrationError]);

  return (
    <ErrorBoundary>
      <AuthLayout>
        <RegisterForm
          onSuccess={handleSubmit}
          onError={handleRegistrationError}
          onProviderRegister={handleProviderRegistration}
          isSubmitting={isSubmitting}
          error={authError}
          csrfToken={csrfToken || ''}
          providers={['azure']} // Supported OAuth providers
        />
      </AuthLayout>
    </ErrorBoundary>
  );
};

export default RegisterPage;