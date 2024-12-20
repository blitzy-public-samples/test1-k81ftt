/**
 * @fileoverview A reusable layout component for error pages implementing Material Design 3 patterns
 * and WCAG 2.1 Level AA compliance for consistent error message display.
 * @version 1.0.0
 */

import React, { useCallback } from 'react'; // ^18.0.0
import { useNavigate } from 'react-router-dom'; // ^6.0.0
import Button from '../components/common/Button';

/**
 * Props interface for the ErrorLayout component
 */
export interface ErrorLayoutProps {
  /** HTTP status code or custom error code */
  statusCode: number;
  /** Main error message title */
  title: string;
  /** Detailed error description */
  description: string;
  /** Toggle home navigation button */
  showHomeButton?: boolean;
  /** Toggle back navigation button */
  showBackButton?: boolean;
  /** Optional additional content */
  children?: React.ReactNode;
}

/**
 * ErrorLayout component providing consistent error page layout with accessibility features
 * and Material Design 3 implementation.
 */
export const ErrorLayout: React.FC<ErrorLayoutProps> = ({
  statusCode,
  title,
  description,
  showHomeButton = true,
  showBackButton = true,
  children,
}) => {
  const navigate = useNavigate();

  /**
   * Handler for navigating to previous page with home fallback
   */
  const handleGoBack = useCallback(() => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  /**
   * Handler for navigating to home page
   */
  const handleGoHome = useCallback(() => {
    navigate('/', { replace: true });
  }, [navigate]);

  return (
    <main
      className="error-layout"
      role="alert"
      aria-live="polite"
      style={styles.container}
    >
      {/* Error Status Code */}
      <div
        className="error-layout__status"
        aria-label={`Error ${statusCode}`}
        style={styles.statusCode}
      >
        {statusCode}
      </div>

      {/* Error Title */}
      <h1 className="error-layout__title" style={styles.title}>
        {title}
      </h1>

      {/* Error Description */}
      <div className="error-layout__description" style={styles.description}>
        {description}
      </div>

      {/* Additional Content */}
      {children && (
        <div className="error-layout__content" style={styles.content}>
          {children}
        </div>
      )}

      {/* Navigation Actions */}
      <div className="error-layout__actions" style={styles.actions}>
        {showBackButton && (
          <Button
            variant="outlined"
            onClick={handleGoBack}
            ariaLabel="Go back to previous page"
            startIcon={
              <span aria-hidden="true" role="img">
                ←
              </span>
            }
          >
            Go Back
          </Button>
        )}
        {showHomeButton && (
          <Button
            variant="primary"
            onClick={handleGoHome}
            ariaLabel="Go to home page"
          >
            Go to Home
          </Button>
        )}
      </div>
    </main>
  );
};

// Styles following Material Design 3 principles
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '2rem',
    backgroundColor: 'var(--md-sys-color-background)',
    color: 'var(--md-sys-color-on-background)',
  },
  statusCode: {
    fontSize: 'clamp(3rem, 8vw, 6rem)',
    fontWeight: 'bold',
    color: 'var(--md-sys-color-error)',
    marginBottom: '1rem',
    fontFamily: 'var(--md-sys-typescale-display-large-font-family)',
  },
  title: {
    fontSize: 'clamp(1.5rem, 4vw, 2rem)',
    fontWeight: '500',
    marginBottom: '1rem',
    textAlign: 'center' as const,
    color: 'var(--md-sys-color-on-surface)',
    fontFamily: 'var(--md-sys-typescale-headline-medium-font-family)',
  },
  description: {
    fontSize: 'clamp(0.875rem, 2vw, 1rem)',
    color: 'var(--md-sys-color-on-surface-variant)',
    marginBottom: '2rem',
    textAlign: 'center' as const,
    maxWidth: '600px',
    lineHeight: '1.5',
    fontFamily: 'var(--md-sys-typescale-body-medium-font-family)',
  },
  content: {
    width: '100%',
    maxWidth: '600px',
    marginBottom: '2rem',
  },
  actions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '2rem',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
} as const;

// Default export
export default ErrorLayout;
```

This implementation:

1. Follows Material Design 3 principles with proper typography, spacing, and color tokens.
2. Implements WCAG 2.1 Level AA compliance with:
   - Proper ARIA roles and labels
   - Semantic HTML structure
   - Keyboard navigation support
   - Sufficient color contrast
   - Responsive text sizing

3. Provides consistent error handling with:
   - Status code display
   - Clear error messaging
   - Navigation options
   - Flexible content area

4. Uses the Button component from the common components library with proper accessibility attributes.

5. Implements responsive design with:
   - Fluid typography using clamp()
   - Flexible layouts
   - Mobile-first approach

6. Includes proper TypeScript typing and documentation.

The component can be used in various error scenarios by importing and providing the required props:

```typescript
<ErrorLayout
  statusCode={404}
  title="Page Not Found"
  description="The page you're looking for doesn't exist or has been moved."
/>