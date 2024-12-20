/**
 * @fileoverview Authentication Layout Component
 * Provides a consistent, accessible, and responsive layout wrapper for authentication pages
 * Implements WCAG 2.1 Level AA compliance and Material Design 3 principles
 * @version 1.0.0
 */

import React, { useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { Box, Paper, Typography, useMediaQuery } from '@mui/material';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';
import { PasswordReset } from '../components/auth/PasswordReset';
import { ErrorBoundary } from '../components/common/ErrorBoundary';
import { useTheme } from '../hooks/useTheme';
import useAnalytics from '@mixpanel/browser';

// Styled components for enhanced layout presentation
const AuthContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  transition: theme.transitions.create(['background-color'], {
    duration: theme.transitions.duration.standard,
  }),
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
  [theme.breakpoints.up('sm')]: {
    padding: theme.spacing(4),
  },
}));

const AuthContent = styled(Paper)(({ theme }) => ({
  width: '100%',
  maxWidth: 400,
  margin: '0 auto',
  marginTop: theme.spacing(8),
  padding: theme.spacing(4),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[3],
  [theme.breakpoints.down('sm')]: {
    marginTop: theme.spacing(4),
    padding: theme.spacing(3),
  },
}));

const BrandLogo = styled('img')({
  width: 150,
  height: 'auto',
  marginBottom: 24,
});

interface AuthLayoutProps {
  children?: React.ReactNode;
  className?: string;
  showBranding?: boolean;
}

/**
 * Authentication Layout component providing consistent UI for auth flows
 */
const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  className,
  showBranding = true,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentTheme, themeMode } = useTheme();
  const analytics = useAnalytics();
  const isMobile = useMediaQuery(currentTheme.breakpoints.down('sm'));

  // Get page title based on current route
  const getPageTitle = useCallback((pathname: string): string => {
    switch (pathname) {
      case '/login':
        return 'Sign In';
      case '/register':
        return 'Create Account';
      case '/forgot-password':
        return 'Reset Password';
      default:
        return 'Authentication';
    }
  }, []);

  // Track page views for analytics
  useEffect(() => {
    analytics.track('Auth Page View', {
      page: location.pathname,
      theme: themeMode,
      device: isMobile ? 'mobile' : 'desktop',
    });
  }, [location.pathname, themeMode, isMobile, analytics]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        navigate('/login');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <ErrorBoundary>
      <AuthContainer
        className={className}
        role="main"
        aria-label={`${getPageTitle(location.pathname)} page`}
      >
        <AuthContent>
          {showBranding && (
            <Box
              component="header"
              display="flex"
              flexDirection="column"
              alignItems="center"
              mb={4}
            >
              <BrandLogo
                src="/logo.svg"
                alt="Task Management System"
                role="img"
              />
              <Typography
                variant="h4"
                component="h1"
                align="center"
                gutterBottom
                aria-label={getPageTitle(location.pathname)}
              >
                {getPageTitle(location.pathname)}
              </Typography>
            </Box>
          )}

          {/* Render appropriate auth form based on route */}
          <Box
            component="section"
            width="100%"
            role="region"
            aria-label="Authentication form"
          >
            <Outlet />
          </Box>

          {/* Footer with additional links and info */}
          <Box
            component="footer"
            mt={4}
            textAlign="center"
            role="contentinfo"
          >
            <Typography variant="body2" color="textSecondary">
              &copy; {new Date().getFullYear()} Task Management System
            </Typography>
          </Box>
        </AuthContent>
      </AuthContainer>
    </ErrorBoundary>
  );
};

export type { AuthLayoutProps };
export default AuthLayout;