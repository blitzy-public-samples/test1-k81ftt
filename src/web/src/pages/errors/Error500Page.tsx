/**
 * @fileoverview A production-ready 500 error page component with enhanced error tracking,
 * retry functionality, and accessibility features following Material Design 3 principles.
 * @version 1.0.0
 */

import React, { useCallback, useEffect } from 'react'; // ^18.0.0
import { useNavigate } from 'react-router-dom'; // ^6.0.0
import ErrorLayout from '../../layouts/ErrorLayout';
import Button from '../../components/common/Button';
import { LoadingState } from '../../types/common.types';

/**
 * Props interface for the Error500Page component
 */
interface Error500Props {
  /** Unique identifier for error tracking */
  correlationId?: string;
  /** Additional error context for analytics */
  errorContext?: Record<string, unknown>;
}

/**
 * Support contact information
 */
const SUPPORT_CONTACT = {
  email: 'support@taskmaster.com',
  phone: '+1-888-TASK-HELP',
  hours: '24/7',
} as const;

/**
 * Error500Page component displaying a user-friendly internal server error message
 * with enhanced error tracking and retry functionality.
 */
const Error500Page: React.FC<Error500Props> = ({
  correlationId = crypto.randomUUID(),
  errorContext = {},
}) => {
  const navigate = useNavigate();
  const [retryState, setRetryState] = React.useState<LoadingState>('idle');

  /**
   * Track error occurrence in analytics
   */
  useEffect(() => {
    // Log error to analytics service
    console.error('500 Error encountered:', {
      correlationId,
      timestamp: new Date().toISOString(),
      path: window.location.pathname,
      errorContext,
    });
  }, [correlationId, errorContext]);

  /**
   * Handle retry attempt with error tracking
   */
  const handleRetry = useCallback(async () => {
    setRetryState('loading');
    
    try {
      // Log retry attempt
      console.info('Retry attempted:', { correlationId });
      
      // Clear any cached error states
      sessionStorage.removeItem('lastError');
      
      // Reload the current page
      window.location.reload();
      
      setRetryState('succeeded');
    } catch (error) {
      setRetryState('failed');
      console.error('Retry failed:', { correlationId, error });
    }
  }, [correlationId]);

  /**
   * Render support contact information
   */
  const renderSupportInfo = () => (
    <div className="error-500__support" style={styles.support}>
      <p>Please contact our support team if the problem persists:</p>
      <ul style={styles.supportList}>
        <li>Email: <a href={`mailto:${SUPPORT_CONTACT.email}`}>{SUPPORT_CONTACT.email}</a></li>
        <li>Phone: <a href={`tel:${SUPPORT_CONTACT.phone}`}>{SUPPORT_CONTACT.phone}</a></li>
        <li>Hours: {SUPPORT_CONTACT.hours}</li>
      </ul>
      <p style={styles.correlationId}>
        Error Reference: <code>{correlationId}</code>
      </p>
    </div>
  );

  return (
    <ErrorLayout
      statusCode={500}
      title="Internal Server Error"
      description="We apologize, but something went wrong on our end. Our team has been notified and is working to fix the issue."
      showHomeButton
      showBackButton
    >
      {/* Support Information */}
      {renderSupportInfo()}

      {/* Retry Button */}
      <div style={styles.actions}>
        <Button
          variant="primary"
          onClick={handleRetry}
          loading={retryState === 'loading'}
          loadingText="Retrying..."
          disabled={retryState === 'loading'}
          ariaLabel="Retry current operation"
          startIcon={
            <span aria-hidden="true" role="img">
              ↻
            </span>
          }
        >
          Try Again
        </Button>
      </div>
    </ErrorLayout>
  );
};

// Styles following Material Design 3 principles
const styles = {
  support: {
    marginTop: '2rem',
    textAlign: 'center' as const,
    color: 'var(--md-sys-color-on-surface-variant)',
    fontFamily: 'var(--md-sys-typescale-body-medium-font-family)',
  },
  supportList: {
    listStyle: 'none',
    padding: 0,
    margin: '1rem 0',
    lineHeight: '1.5',
  },
  correlationId: {
    marginTop: '1rem',
    fontSize: '0.875rem',
    color: 'var(--md-sys-color-outline)',
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '2rem',
    gap: '1rem',
  },
} as const;

export default Error500Page;