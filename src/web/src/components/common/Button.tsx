/**
 * @fileoverview A reusable, accessible button component implementing Material Design 3 principles
 * @version 1.0.0
 * Supports various variants, sizes, loading states, and ARIA attributes for enterprise applications
 */

import React, { useCallback, useEffect, useState } from 'react'; // ^18.0.0
import classNames from 'classnames'; // ^2.3.0
import { LoadingState } from '../../types/common.types';

/**
 * Props interface for the Button component with comprehensive ARIA support
 */
export interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outlined' | 'text' | 'error' | 'success';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  fullWidth?: boolean;
  loading?: boolean;
  loadingText?: string;
  loadingPosition?: 'start' | 'end' | 'center';
  loadingTimeout?: number;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  ariaLabel?: string;
  ariaPressed?: boolean;
  ariaExpanded?: boolean;
  ariaControls?: string;
  role?: 'button' | 'menuitem' | 'tab';
  tabIndex?: number;
}

/**
 * Loading spinner component for button loading states
 */
const LoadingSpinner: React.FC = () => (
  <svg
    className="button-spinner"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    role="progressbar"
    aria-label="Loading"
  >
    <circle
      className="button-spinner-track"
      cx="8"
      cy="8"
      r="7"
      stroke="currentColor"
      strokeOpacity="0.2"
      strokeWidth="2"
    />
    <circle
      className="button-spinner-head"
      cx="8"
      cy="8"
      r="7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeDasharray="12 32"
    />
  </svg>
);

/**
 * Button component implementing Material Design 3 principles
 */
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  fullWidth = false,
  loading = false,
  loadingText,
  loadingPosition = 'center',
  loadingTimeout = 0,
  startIcon,
  endIcon,
  type = 'button',
  onClick,
  className,
  ariaLabel,
  ariaPressed,
  ariaExpanded,
  ariaControls,
  role = 'button',
  tabIndex = 0,
}) => {
  const [internalLoading, setInternalLoading] = useState<LoadingState>('idle');
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Handle loading state with timeout
  useEffect(() => {
    if (loading && loadingTimeout > 0) {
      const timeout = setTimeout(() => {
        setInternalLoading('idle');
      }, loadingTimeout);
      setTimeoutId(timeout);
      setInternalLoading('loading');
    } else {
      setInternalLoading(loading ? 'loading' : 'idle');
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [loading, loadingTimeout]);

  // Handle click with loading state
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || internalLoading === 'loading') return;
      onClick?.(event);
    },
    [disabled, internalLoading, onClick]
  );

  const buttonClasses = classNames(
    'md-button',
    `md-button--${variant}`,
    `md-button--${size}`,
    {
      'md-button--full-width': fullWidth,
      'md-button--loading': internalLoading === 'loading',
      'md-button--disabled': disabled,
      [`md-button--loading-${loadingPosition}`]: internalLoading === 'loading',
    },
    className
  );

  const renderContent = () => (
    <>
      {startIcon && !loading && (
        <span className="md-button__start-icon">{startIcon}</span>
      )}
      {internalLoading === 'loading' && loadingPosition === 'start' && (
        <LoadingSpinner />
      )}
      <span className="md-button__label">
        {internalLoading === 'loading' && loadingText ? loadingText : children}
      </span>
      {internalLoading === 'loading' && loadingPosition === 'end' && (
        <LoadingSpinner />
      )}
      {endIcon && !loading && <span className="md-button__end-icon">{endIcon}</span>}
      {internalLoading === 'loading' && loadingPosition === 'center' && (
        <LoadingSpinner />
      )}
    </>
  );

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || internalLoading === 'loading'}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      aria-busy={internalLoading === 'loading'}
      aria-disabled={disabled}
      role={role}
      tabIndex={disabled ? -1 : tabIndex}
      data-loading={internalLoading === 'loading'}
      data-variant={variant}
      data-size={size}
    >
      {renderContent()}
    </button>
  );
};

// Default styles (can be overridden via CSS)
const styles = `
  .md-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-family: var(--md-sys-typescale-label-large-font-family);
    font-weight: var(--md-sys-typescale-label-large-font-weight);
    letter-spacing: var(--md-sys-typescale-label-large-letter-spacing);
    transition: all 200ms ease-in-out;
    outline: none;
    text-decoration: none;
    user-select: none;
  }

  .md-button:focus-visible {
    outline: 2px solid var(--md-sys-color-primary);
    outline-offset: 2px;
  }

  .md-button--primary {
    background-color: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
  }

  .md-button--secondary {
    background-color: var(--md-sys-color-secondary);
    color: var(--md-sys-color-on-secondary);
  }

  .md-button--outlined {
    background-color: transparent;
    border: 1px solid var(--md-sys-color-outline);
    color: var(--md-sys-color-primary);
  }

  .md-button--text {
    background-color: transparent;
    color: var(--md-sys-color-primary);
    padding: 0;
  }

  .md-button--error {
    background-color: var(--md-sys-color-error);
    color: var(--md-sys-color-on-error);
  }

  .md-button--success {
    background-color: var(--md-sys-color-success);
    color: var(--md-sys-color-on-success);
  }

  .md-button--small {
    height: 32px;
    padding: 0 12px;
    font-size: 14px;
  }

  .md-button--medium {
    height: 36px;
    padding: 0 16px;
    font-size: 16px;
  }

  .md-button--large {
    height: 42px;
    padding: 0 24px;
    font-size: 16px;
  }

  .md-button--full-width {
    width: 100%;
  }

  .md-button--disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .md-button--loading {
    cursor: wait;
    opacity: 0.7;
  }

  .button-spinner {
    animation: spin 1s linear infinite;
  }

  .button-spinner-head {
    animation: dash 1.5s ease-in-out infinite;
  }

  @keyframes spin {
    100% {
      transform: rotate(360deg);
    }
  }

  @keyframes dash {
    0% {
      stroke-dasharray: 1, 150;
      stroke-dashoffset: 0;
    }
    50% {
      stroke-dasharray: 90, 150;
      stroke-dashoffset: -35;
    }
    100% {
      stroke-dasharray: 90, 150;
      stroke-dashoffset: -124;
    }
  }
`;

// Inject styles into document head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

export default Button;