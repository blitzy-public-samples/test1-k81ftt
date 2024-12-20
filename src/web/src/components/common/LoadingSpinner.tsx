import React from 'react'; // ^18.0.0
import { spinner } from '../../styles/animations.scss';

/**
 * LoadingSpinner Props Interface
 * Defines type-safe props for the LoadingSpinner component with strict validation
 */
interface LoadingSpinnerProps {
  /** Size variant following Material Design 3 specifications */
  size?: 'small' | 'medium' | 'large';
  /** Theme-aware color variant matching application color system */
  color?: 'primary' | 'secondary' | 'surface' | 'error';
  /** Optional CSS class for custom styling integration */
  className?: string;
  /** Accessibility label for screen readers */
  ariaLabel?: string;
}

/**
 * LoadingSpinner Component
 * 
 * A highly optimized, accessible loading spinner component that provides visual feedback
 * during asynchronous operations. Implements Material Design 3 principles with comprehensive
 * accessibility features including reduced motion support.
 * 
 * @component
 * @example
 * ```tsx
 * <LoadingSpinner size="medium" color="primary" ariaLabel="Loading content..." />
 * ```
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'primary',
  className = '',
  ariaLabel = 'Loading...'
}) => {
  // Size mapping following Material Design 3 specifications
  const sizeMap = {
    small: '24px',
    medium: '40px',
    large: '56px'
  };

  // Inline styles for performance optimization
  const spinnerStyle: React.CSSProperties = {
    width: sizeMap[size],
    height: sizeMap[size],
    contain: 'layout style paint', // Optimize rendering performance
    willChange: 'transform', // GPU acceleration hint
    position: 'relative',
    display: 'inline-block'
  };

  return (
    <div
      role="progressbar" // Semantic ARIA role
      aria-label={ariaLabel}
      aria-busy="true" // Indicates active loading state
      data-size={size}
      data-color={color}
      className={`${spinner} ${className} spinner--${size} spinner--${color}`}
      style={spinnerStyle}
      data-testid="loading-spinner" // For testing purposes
    >
      {/* 
        Note: The actual spinning animation is handled by CSS in animations.scss
        with proper reduced motion support and performance optimizations
      */}
    </div>
  );
};

// Performance optimization: Prevent unnecessary re-renders
const MemoizedLoadingSpinner = React.memo(LoadingSpinner);

// Export the memoized component
export default MemoizedLoadingSpinner;

// Named exports for specific use cases
export type { LoadingSpinnerProps };
export { MemoizedLoadingSpinner as LoadingSpinner };