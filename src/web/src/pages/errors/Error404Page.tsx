/**
 * @fileoverview A React component that renders a user-friendly 404 error page
 * Implements Material Design 3 patterns and WCAG 2.1 Level AA compliance
 * @version 1.0.0
 */

import React, { useEffect } from 'react'; // ^18.0.0
import ErrorLayout from '../../layouts/ErrorLayout';

/**
 * Analytics event type for error page navigation
 */
type NavigationType = 'home' | 'back';

/**
 * Error404Page component that displays a user-friendly 404 error page
 * with proper accessibility attributes and analytics tracking
 */
const Error404Page: React.FC = () => {
  /**
   * Set document title and status code on component mount
   */
  useEffect(() => {
    // Update document title for accessibility
    document.title = '404: Page Not Found - Task Management System';

    // Set HTTP status code if running on server
    if (typeof window !== 'undefined' && 'response' in window) {
      (window as any).response.status(404);
    }
  }, []);

  /**
   * Handles navigation tracking from error page
   * @param navigationType - Type of navigation action
   */
  const handleNavigation = (navigationType: NavigationType): void => {
    // Track error page navigation in analytics
    try {
      // Example analytics tracking - replace with actual implementation
      if (process.env.NODE_ENV === 'production') {
        window.gtag?.('event', 'error_page_navigation', {
          error_type: '404',
          navigation_type: navigationType,
          page_url: window.location.href,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      // Silently fail analytics in production
      if (process.env.NODE_ENV !== 'production') {
        console.error('Analytics tracking failed:', error);
      }
    }
  };

  return (
    <ErrorLayout
      statusCode={404}
      title="Page Not Found"
      description="The page you are looking for might have been removed, had its name changed, or is temporarily unavailable."
      showHomeButton={true}
      showBackButton={true}
      onHomeClick={() => handleNavigation('home')}
      onBackClick={() => handleNavigation('back')}
    >
      {/* Additional helpful content for users */}
      <div role="complementary" aria-label="Helpful suggestions">
        <p>You might want to:</p>
        <ul>
          <li>Check the URL for typing errors</li>
          <li>Clear your browser cache and try again</li>
          <li>Contact support if you believe this is a mistake</li>
        </ul>
      </div>
    </ErrorLayout>
  );
};

// Default export for dynamic imports
export default Error404Page;