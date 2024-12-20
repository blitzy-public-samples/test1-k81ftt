/**
 * @fileoverview Root application component implementing comprehensive routing,
 * authentication, theme management, and real-time updates with enhanced security
 * and accessibility features.
 * @version 1.0.0
 */

import React, { useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { Provider } from 'react-redux';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';
import ErrorLayout from './layouts/ErrorLayout';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useWebSocket } from './hooks/useWebSocket';
import { useTheme } from './hooks/useTheme';

// Store
import store from './store/store';

// Error handling
import { ErrorBoundary } from './components/common/ErrorBoundary';

/**
 * Protected route wrapper with authentication and role-based access control
 */
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  requiredRoles?: string[];
}> = ({ children, requiredRoles = [] }) => {
  const { isAuthenticated, user, isMfaRequired } = useAuth();

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to MFA verification if required
  if (isMfaRequired) {
    return <Navigate to="/mfa-verification" replace />;
  }

  // Check role-based access
  if (requiredRoles.length > 0 && !requiredRoles.includes(user?.role || '')) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

/**
 * Root application component with enhanced security and accessibility features
 */
const App: React.FC = () => {
  const { currentTheme, themeMode } = useTheme();
  const { connect, disconnect } = useWebSocket();

  // Initialize WebSocket connection
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Configure theme with accessibility features
  const theme = useMemo(() => ({
    ...currentTheme,
    components: {
      ...currentTheme.components,
      MuiCssBaseline: {
        styleOverrides: {
          '@media (prefers-reduced-motion: reduce)': {
            '*': {
              animationDuration: '0.01ms !important',
              animationIterationCount: '1 !important',
              transitionDuration: '0.01ms !important',
              scrollBehavior: 'auto !important',
            },
          },
        },
      },
    },
  }), [currentTheme]);

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<AuthLayout />} />
              <Route path="/register" element={<AuthLayout />} />
              <Route path="/reset-password" element={<AuthLayout />} />
              <Route path="/mfa-verification" element={<AuthLayout />} />

              {/* Protected routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      {/* Dashboard content */}
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/projects/*"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER', 'MEMBER']}>
                    <DashboardLayout>
                      {/* Projects content */}
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/tasks/*"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER', 'MEMBER']}>
                    <DashboardLayout>
                      {/* Tasks content */}
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/analytics"
                element={
                  <ProtectedRoute requiredRoles={['ADMIN', 'MANAGER']}>
                    <DashboardLayout>
                      {/* Analytics content */}
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />

              {/* Error routes */}
              <Route
                path="/error"
                element={
                  <ErrorLayout
                    statusCode={500}
                    title="Internal Server Error"
                    description="An unexpected error occurred. Please try again later."
                  />
                }
              />

              <Route
                path="/unauthorized"
                element={
                  <ErrorLayout
                    statusCode={403}
                    title="Unauthorized Access"
                    description="You don't have permission to access this resource."
                  />
                }
              />

              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* 404 catch-all */}
              <Route
                path="*"
                element={
                  <ErrorLayout
                    statusCode={404}
                    title="Page Not Found"
                    description="The page you're looking for doesn't exist or has been moved."
                  />
                }
              />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;