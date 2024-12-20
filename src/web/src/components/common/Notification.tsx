import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; // v10.0.0
import { styled, useTheme } from '@mui/material/styles'; // v5.0.0
import { IconButton, Paper, useMediaQuery } from '@mui/material'; // v5.0.0
import { 
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material'; // v5.0.0
import { showNotification, hideNotification } from '../../hooks/useNotification';

/**
 * Props interface for the Notification component
 * Includes comprehensive accessibility and theme options
 */
interface NotificationProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  duration?: number;
  onClose: (id: string) => void;
  highContrast?: boolean;
  ariaLive?: 'polite' | 'assertive';
  role?: 'alert' | 'status';
  autoFocus?: boolean;
}

// Styled components with enhanced accessibility and theme support
const NotificationContainer = styled(Paper, {
  shouldForwardProp: prop => !['position', 'type', 'highContrast'].includes(prop as string)
})<{ position: string; type: string; highContrast?: boolean }>(
  ({ theme, position, type, highContrast }) => {
    const positions = {
      'top-right': { top: 24, right: 24 },
      'top-left': { top: 24, left: 24 },
      'bottom-right': { bottom: 24, right: 24 },
      'bottom-left': { bottom: 24, left: 24 },
      'top-center': { top: 24, left: '50%', transform: 'translateX(-50%)' },
      'bottom-center': { bottom: 24, left: '50%', transform: 'translateX(-50%)' }
    };

    const getBackgroundColor = () => {
      const colors = {
        success: highContrast ? theme.palette.success.dark : theme.palette.success.light,
        error: highContrast ? theme.palette.error.dark : theme.palette.error.light,
        warning: highContrast ? theme.palette.warning.dark : theme.palette.warning.light,
        info: highContrast ? theme.palette.info.dark : theme.palette.info.light
      };
      return colors[type as keyof typeof colors];
    };

    return {
      position: 'fixed',
      display: 'flex',
      alignItems: 'center',
      padding: '12px 24px',
      borderRadius: '8px',
      boxShadow: theme.shadows[3],
      zIndex: theme.zIndex.snackbar,
      minWidth: '320px',
      maxWidth: '480px',
      minHeight: '48px',
      backgroundColor: getBackgroundColor(),
      color: highContrast ? theme.palette.common.white : theme.palette.text.primary,
      ...positions[position as keyof typeof positions],
      '@media (max-width: 600px)': {
        width: 'calc(100% - 48px)',
        maxWidth: 'none',
        ...(['top-center', 'bottom-center'].includes(position) && {
          left: '24px',
          transform: 'none'
        })
      }
    };
  }
);

const IconContainer = styled('div')({
  marginRight: '12px',
  display: 'flex',
  alignItems: 'center',
  minWidth: '24px',
  minHeight: '24px'
});

const MessageContainer = styled('div')(({ theme }) => ({
  flex: 1,
  marginRight: '12px',
  fontSize: '14px',
  lineHeight: 1.5,
  wordBreak: 'break-word'
}));

/**
 * Get the appropriate icon component based on notification type
 */
const getNotificationIcon = (type: NotificationProps['type'], highContrast?: boolean) => {
  const iconProps = {
    fontSize: 'small',
    sx: { color: highContrast ? 'inherit' : undefined }
  };

  const icons = {
    success: <CheckCircleIcon {...iconProps} />,
    error: <ErrorIcon {...iconProps} />,
    warning: <WarningIcon {...iconProps} />,
    info: <InfoIcon {...iconProps} />
  };

  return icons[type];
};

/**
 * Enhanced Notification component with accessibility and animations
 */
const Notification = React.memo<NotificationProps>(({
  id,
  type = 'info',
  message,
  position = 'top-right',
  duration = 5000,
  onClose,
  highContrast = false,
  ariaLive = 'polite',
  role = 'status',
  autoFocus = true
}) => {
  const theme = useTheme();
  const preferReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  // Handle notification auto-dismiss
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [id, duration, onClose]);

  // Handle keyboard interaction
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose(id);
    }
  }, [id, onClose]);

  // Animation configuration respecting reduced motion preferences
  const animationConfig = preferReducedMotion ? {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.1 }
  } : {
    initial: { opacity: 0, y: -20, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2, ease: 'easeOut' }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div {...animationConfig}>
        <NotificationContainer
          elevation={3}
          position={position}
          type={type}
          highContrast={highContrast}
          role={role}
          aria-live={ariaLive}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
        >
          <IconContainer>
            {getNotificationIcon(type, highContrast)}
          </IconContainer>
          <MessageContainer>
            {message}
          </MessageContainer>
          <IconButton
            size="small"
            onClick={() => onClose(id)}
            aria-label="Close notification"
            sx={{ color: 'inherit' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </NotificationContainer>
      </motion.div>
    </AnimatePresence>
  );
});

Notification.displayName = 'Notification';

export default Notification;