/**
 * @fileoverview Enterprise-grade toast notification component implementing Material Design 3
 * principles with comprehensive accessibility support, theme adaptability, and real-time
 * notification capabilities.
 * @version 1.0.0
 */

// react version: ^18.0.0
import React from 'react';
// @mui/material version: ^5.0.0
import { styled, useTheme } from '@mui/material/styles';
import { Slide, useTheme as muiUseTheme } from '@mui/material';
// framer-motion version: ^6.0.0
import { motion, AnimatePresence } from 'framer-motion';

import Icon from './Icon';
import { useNotification } from '../../hooks/useNotification';
import { TRANSITIONS, Z_INDEX } from '../../constants/theme.constants';

// Toast type definitions with comprehensive configuration options
export interface ToastProps {
  id: string;
  message: string | React.ReactNode;
  type: 'success' | 'error' | 'warning' | 'info';
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  duration?: number;
  autoHide?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  role?: 'alert' | 'status';
  priority?: 'high' | 'medium' | 'low';
}

// Toast type configurations with Material Design 3 color tokens
const TOAST_TYPES = {
  success: {
    icon: 'check_circle',
    color: 'var(--md-sys-color-success)',
    role: 'status'
  },
  error: {
    icon: 'error',
    color: 'var(--md-sys-color-error)',
    role: 'alert'
  },
  warning: {
    icon: 'warning',
    color: 'var(--md-sys-color-warning)',
    role: 'alert'
  },
  info: {
    icon: 'info',
    color: 'var(--md-sys-color-info)',
    role: 'status'
  }
} as const;

// Animation variants for smooth transitions
const ANIMATION_VARIANTS = {
  initial: { opacity: 0, y: -20, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};

// Styled container with Material Design 3 elevation and theming
const ToastContainer = styled(motion.div)<{
  $type: ToastProps['type'];
  $position: ToastProps['position'];
}>(({ theme, $type, $position }) => ({
  position: 'fixed',
  display: 'flex',
  alignItems: 'center',
  minWidth: '320px',
  maxWidth: '480px',
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[4],
  color: theme.palette.text.primary,
  zIndex: Z_INDEX.tooltip,
  ...getPositionStyles($position),
  border: `1px solid ${TOAST_TYPES[$type].color}`,

  '@media (max-width: 600px)': {
    width: '90vw',
    minWidth: 'auto',
    margin: theme.spacing(1)
  },

  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none'
  }
}));

// Helper function to calculate position styles
const getPositionStyles = (position: ToastProps['position']) => {
  const base = {
    margin: '1rem'
  };

  const positions = {
    'top-right': { top: 0, right: 0 },
    'top-left': { top: 0, left: 0 },
    'bottom-right': { bottom: 0, right: 0 },
    'bottom-left': { bottom: 0, left: 0 },
    'top-center': { top: 0, left: '50%', transform: 'translateX(-50%)' },
    'bottom-center': { bottom: 0, left: '50%', transform: 'translateX(-50%)' }
  };

  return { ...base, ...positions[position] };
};

// Memoized Toast component for performance optimization
export const Toast = React.memo<ToastProps>(({
  id,
  message,
  type = 'info',
  position = 'top-right',
  duration = 5000,
  autoHide = true,
  action,
  role = TOAST_TYPES[type].role,
  priority = 'medium'
}) => {
  const theme = useTheme();
  const { hideNotification } = useNotification();
  const toastRef = React.useRef<HTMLDivElement>(null);

  // Handle auto-dismiss with cleanup
  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (autoHide && duration > 0) {
      timeoutId = setTimeout(() => {
        hideNotification(id);
      }, duration);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [autoHide, duration, hideNotification, id]);

  // Handle keyboard interactions
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      hideNotification(id);
    }
  };

  // Handle action button click
  const handleActionClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (action?.onClick) {
      action.onClick();
    }
    hideNotification(id);
  };

  return (
    <AnimatePresence mode="wait">
      <ToastContainer
        ref={toastRef}
        role={role}
        aria-live={type === 'error' ? 'assertive' : 'polite'}
        aria-atomic="true"
        $type={type}
        $position={position}
        variants={ANIMATION_VARIANTS}
        initial="initial"
        animate="animate"
        exit="exit"
        onKeyDown={handleKeyDown}
        tabIndex={0}
        data-priority={priority}
      >
        <Icon
          name={TOAST_TYPES[type].icon}
          size="medium"
          color={TOAST_TYPES[type].color}
          role="img"
          aria-label={`${type} notification`}
          style={{ marginRight: theme.spacing(1.5) }}
        />
        
        <div style={{ flex: 1 }}>
          {typeof message === 'string' ? (
            <div>{message}</div>
          ) : (
            message
          )}
        </div>

        {action && (
          <button
            onClick={handleActionClick}
            style={{
              marginLeft: theme.spacing(2),
              color: theme.palette.primary.main,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: theme.spacing(1),
              borderRadius: theme.shape.borderRadius,
              transition: TRANSITIONS.duration.standard
            }}
          >
            {action.label}
          </button>
        )}

        <Icon
          name="close"
          size="small"
          color={theme.palette.text.secondary}
          role="button"
          aria-label="Close notification"
          onClick={() => hideNotification(id)}
          style={{
            marginLeft: theme.spacing(1),
            cursor: 'pointer'
          }}
        />
      </ToastContainer>
    </AnimatePresence>
  );
});

Toast.displayName = 'Toast';

export default Toast;