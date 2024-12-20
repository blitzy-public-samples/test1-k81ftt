import React from 'react'; // ^18.0.0
import { styled } from '@mui/material'; // ^5.0.0
import { LinearProgress } from '@mui/material'; // ^5.0.0
import { ColorScheme } from '../../constants/theme.constants';

/**
 * Interface defining the props for the ProgressBar component
 */
interface ProgressBarProps {
  /** Current progress value between 0-100 */
  value?: number;
  /** Whether the progress bar should show indeterminate loading state */
  indeterminate?: boolean;
  /** Color scheme following Material Design 3 guidelines */
  color?: ColorScheme;
  /** Accessible label for screen readers */
  label?: string;
  /** Height of the progress bar in pixels (2-24px) */
  height?: number;
  /** Whether to show the visual label */
  showLabel?: boolean;
}

/**
 * Styled LinearProgress component following Material Design 3 guidelines
 * Supports custom height, border radius, and theme-aware colors
 */
const StyledLinearProgress = styled(LinearProgress)(({ height = 4 }) => ({
  height: `${Math.max(2, Math.min(height, 24))}px`,
  borderRadius: `${Math.min(height, 8)}px`,
  backgroundColor: 'var(--surface-variant)',
  
  '& .MuiLinearProgress-bar': {
    transition: '300ms ease-in-out',
    borderRadius: 'inherit',
  },
  
  '&.MuiLinearProgress-colorPrimary': {
    '& .MuiLinearProgress-bar': {
      backgroundColor: 'var(--primary)',
    },
  },
  
  '&.MuiLinearProgress-colorSecondary': {
    '& .MuiLinearProgress-bar': {
      backgroundColor: 'var(--secondary)',
    },
  },

  // High contrast mode support
  '@media (forced-colors: active)': {
    '& .MuiLinearProgress-bar': {
      forcedColorAdjust: 'none',
      backgroundColor: 'Highlight',
    },
    backgroundColor: 'Canvas',
  },
}));

/**
 * Generates an accessible label for screen readers
 * @param label - Custom label for the progress bar
 * @param value - Current progress value
 * @param indeterminate - Whether the progress is indeterminate
 * @returns Formatted ARIA label string
 */
const getAriaLabel = (
  label?: string,
  value?: number,
  indeterminate?: boolean
): string => {
  const baseLabel = label || 'Progress';
  
  if (indeterminate) {
    return `${baseLabel} - Loading...`;
  }
  
  const percentage = Math.round(value || 0);
  return `${baseLabel} - ${percentage}% complete`;
};

/**
 * ProgressBar component that visualizes progress or loading states
 * Implements Material Design 3 guidelines with WCAG 2.1 Level AA compliance
 * 
 * @example
 * ```tsx
 * // Determinate progress
 * <ProgressBar value={75} label="Upload Progress" color={ColorScheme.PRIMARY} />
 * 
 * // Indeterminate loading
 * <ProgressBar indeterminate label="Loading Data" />
 * ```
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value = 0,
  indeterminate = false,
  color = ColorScheme.PRIMARY,
  label,
  height = 4,
  showLabel = false,
}) => {
  // Ensure value is within valid range
  const normalizedValue = Math.max(0, Math.min(value, 100));
  
  // Generate accessible label
  const ariaLabel = getAriaLabel(label, normalizedValue, indeterminate);

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={indeterminate ? undefined : normalizedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={indeterminate ? 'Loading' : `${normalizedValue} percent`}
    >
      {showLabel && (
        <div
          style={{
            marginBottom: '8px',
            fontSize: '0.875rem',
            color: 'var(--on-surface)',
          }}
        >
          {label}
          {!indeterminate && ` - ${normalizedValue}%`}
        </div>
      )}
      
      <StyledLinearProgress
        variant={indeterminate ? 'indeterminate' : 'determinate'}
        value={normalizedValue}
        color={color.toLowerCase() as 'primary' | 'secondary'}
        height={height}
      />
    </div>
  );
};

// Default export for convenient importing
export default ProgressBar;