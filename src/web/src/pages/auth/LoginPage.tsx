/**
 * @fileoverview Secure and accessible login page component implementing Material Design 3
 * Supports multiple authentication methods, real-time validation, and enhanced error handling
 * @version 1.0.0
 */

import React, { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material';
import { LoginForm } from '../../components/auth/LoginForm';
import { AuthLayout } from '../../layouts/AuthLayout';
import { useAuth } from '../../hooks/useAuth';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';

// Interface for location state with return URL
interface LocationState {
  returnUrl?: string;
  error?: string;
}

/**
 * Enhanced login page component with comprehensive security and accessibility features
 */
const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading, error } = useAuth();
  const theme = useTheme();

  // Extract return URL from location state or query params
  const returnUrl = useCallback(() => {
    const state = location.state as LocationState;
    const params = new URLSearchParams(location.search);
    return state?.returnUrl || params.get('returnUrl') || '/dashboard';
  }, [location]);

  // Handle successful authentication
  useEffect(() => {
    if (isAuthenticated && !loading) {
      // Validate return URL to prevent open redirect vulnerabilities
      const targetUrl = returnUrl();
      const isValidUrl = /^\/[a-zA-Z0-9\-_/]*$/.test(targetUrl);
      navigate(isValidUrl ? targetUrl : '/dashboard', { replace: true });
    }
  }, [isAuthenticated, loading, navigate, returnUrl]);

  // Handle authentication errors with analytics tracking
  useEffect(() => {
    if (error) {
      // Track authentication error for monitoring
      const errorEvent = {
        type: 'AUTH_ERROR',
        code: error.code || 'UNKNOWN',
        message: error.message,
        timestamp: new Date().toISOString()
      };
      console.error('Authentication error:', errorEvent);
    }
  }, [error]);

  // Render login page with error boundary and accessibility support
  return (
    <ErrorBoundary>
      <AuthLayout>
        <div
          role="main"
          aria-label="Login page"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: theme.spacing(2),
            backgroundColor: theme.palette.background.default,
            '@media (prefers-contrast: high)': {
              backgroundColor: theme.palette.background.paper,
            }
          }}
        >
          <LoginForm
            onSuccess={() => {
              const targetUrl = returnUrl();
              const isValidUrl = /^\/[a-zA-Z0-9\-_/]*$/.test(targetUrl);
              navigate(isValidUrl ? targetUrl : '/dashboard', { replace: true });
            }}
            onError={(error) => {
              console.error('Login error:', error);
            }}
            onMFARequired={(verificationId) => {
              navigate('/mfa-verification', {
                state: { verificationId }
              });
            }}
            csrfToken={document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || ''}
          />
        </div>
      </AuthLayout>
    </ErrorBoundary>
  );
};

// Export type for location state
export type { LocationState };

// Export component with display name for debugging
LoginPage.displayName = 'LoginPage';
export default LoginPage;