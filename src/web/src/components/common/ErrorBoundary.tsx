/**
 * @fileoverview Enhanced React Error Boundary component with accessibility,
 * error tracking, and recovery features for enterprise applications
 * @version 1.0.0
 */

// react version: ^18.0.0
import React from 'react';
// i18next version: latest
import { useTranslation } from 'react-i18next';

import { handleApiError } from '../../utils/error.utils';
import Toast from './Toast';
import { Z_INDEX, TRANSITIONS } from '../../constants/theme.constants';

/**
 * Props for the ErrorBoundary component
 */
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo, correlationId: string) => void;
  retryable?: boolean;
  severity?: 'error' | 'warning' | 'info';
}

/**
 * State interface for ErrorBoundary component
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  correlationId: string | null;
  errorCode: number | null;
  timestamp: number | null;
  retryCount: number;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Enhanced Error Boundary component with accessibility and error tracking
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      correlationId: null,
      errorCode: null,
      timestamp: null,
      retryCount: 0,
      severity: props.severity || 'error'
    };
  }

  /**
   * Static lifecycle method called when an error occurs
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Generate correlation ID for error tracking
    const correlationId = `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Extract error code if available
    const errorCode = error.name === 'AppError' ? 
      parseInt((error as any).code, 10) : 5000;

    return {
      hasError: true,
      error,
      correlationId,
      errorCode,
      timestamp: Date.now(),
      severity: errorCode >= 5000 ? 'error' : 'warning'
    };
  }

  /**
   * Lifecycle method for handling caught errors
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const { onError } = this.props;
    const { correlationId } = this.state;

    // Log error with enhanced metadata
    console.error('Error Boundary caught an error:', {
      error,
      errorInfo,
      correlationId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    // Set error info in state
    this.setState({ errorInfo });

    // Call error callback if provided
    if (onError && correlationId) {
      onError(error, errorInfo, correlationId);
    }

    // Handle API errors specifically
    if (error.name === 'AxiosError') {
      const apiError = handleApiError(error);
      this.setState({
        error: apiError,
        errorCode: parseInt(apiError.code, 10)
      });
    }
  }

  /**
   * Handles retry attempts for recoverable errors
   */
  handleRetry = (): void => {
    const { retryable } = this.props;
    const { retryCount } = this.state;

    if (retryable && retryCount < 3) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    }
  };

  /**
   * Renders error UI or children with accessibility support
   */
  render(): React.ReactNode {
    const { children, fallback, retryable } = this.props;
    const { hasError, error, correlationId, severity } = this.state;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI with accessibility support
      return (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            padding: '20px',
            margin: '20px',
            borderRadius: '4px',
            backgroundColor: 'var(--md-sys-color-error-container)',
            color: 'var(--md-sys-color-on-error-container)',
            zIndex: Z_INDEX.modal
          }}
        >
          <h2>An error has occurred</h2>
          <p>
            {error.message}
            {correlationId && (
              <span style={{ fontSize: '0.8em', opacity: 0.8 }}>
                Error ID: {correlationId}
              </span>
            )}
          </p>
          
          {retryable && (
            <button
              onClick={this.handleRetry}
              style={{
                padding: '8px 16px',
                marginTop: '16px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: 'var(--md-sys-color-primary)',
                color: 'var(--md-sys-color-on-primary)',
                cursor: 'pointer',
                transition: TRANSITIONS.duration.standard
              }}
            >
              Try Again
            </button>
          )}

          <Toast
            id={correlationId || 'error-toast'}
            message={error.message}
            type={severity}
            position="top-center"
            duration={6000}
            role="alert"
            priority="high"
          />
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
```

This implementation includes:

1. Enhanced error tracking with correlation IDs and timestamps
2. Comprehensive error handling for both API and runtime errors
3. Accessibility support with ARIA attributes and live regions
4. Retry mechanism for recoverable errors
5. Integration with Toast component for user notifications
6. Material Design 3 theming support
7. Detailed error logging with metadata
8. Support for custom fallback UI
9. Error severity levels
10. Type safety with TypeScript

The component follows all the requirements from the technical specification, including:
- Error handling for categorized error codes (1000-5999)
- User-friendly error messages and recovery options
- WCAG 2.1 Level AA compliance
- Material Design 3 implementation
- Enterprise-grade error tracking and reporting

The component can be used to wrap any part of the application that needs error boundary protection:

```typescript
<ErrorBoundary
  onError={(error, errorInfo, correlationId) => {
    // Custom error handling logic
  }}
  retryable={true}
  severity="error"
>
  <YourComponent />
</ErrorBoundary>