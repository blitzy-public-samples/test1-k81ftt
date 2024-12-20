/**
 * @fileoverview Custom React hook for managing accessible notifications
 * Provides comprehensive notification management with accessibility support,
 * auto-dismiss functionality, and configurable positions
 * @version 1.0.0
 */

import { useDispatch } from 'react-redux'; // v8.0.0
import { useCallback, useEffect, useRef } from 'react'; // v18.0.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import { addNotification, removeNotification } from '../store/actions/ui.actions';

/**
 * Supported notification types following Material Design principles
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Available notification positions for flexible layout support
 */
export type NotificationPosition = 
  | 'top-right' 
  | 'top-left' 
  | 'bottom-right' 
  | 'bottom-left' 
  | 'top-center' 
  | 'bottom-center';

/**
 * Interface for notification configuration options
 * Includes accessibility attributes and positioning
 */
export interface NotificationOptions {
  /** Notification message content */
  message: string;
  /** Type of notification for styling and screen readers */
  type?: NotificationType;
  /** Position on screen where notification appears */
  position?: NotificationPosition;
  /** Duration in milliseconds before auto-dismiss (0 for persistent) */
  duration?: number;
  /** ARIA attributes for accessibility */
  aria?: {
    /** ARIA role for the notification */
    role?: 'alert' | 'status';
    /** ARIA live region behavior */
    live?: 'polite' | 'assertive';
    /** Custom label for screen readers */
    label?: string;
  };
}

/**
 * Interface for tracking notification timeouts
 */
interface NotificationTimeout {
  /** Unique notification identifier */
  id: string;
  /** Timeout ID for cleanup */
  timeoutId: number;
}

/**
 * Default values for notification options
 */
const DEFAULT_OPTIONS: Partial<NotificationOptions> = {
  type: 'info',
  position: 'top-right',
  duration: 5000,
  aria: {
    role: 'status',
    live: 'polite'
  }
};

/**
 * Custom hook for managing accessible notifications
 * @returns Object containing notification management functions
 */
export const useNotification = () => {
  const dispatch = useDispatch();
  
  // Ref to store active notification timeouts for cleanup
  const timeoutsRef = useRef<NotificationTimeout[]>([]);

  /**
   * Cleanup function to clear all active timeouts
   */
  const clearTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(({ timeoutId }) => {
      window.clearTimeout(timeoutId);
    });
    timeoutsRef.current = [];
  }, []);

  /**
   * Shows a notification with the specified options
   * @param options - Notification configuration options
   * @returns Unique ID of the created notification
   */
  const showNotification = useCallback((options: NotificationOptions): string => {
    const id = uuidv4();
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    const { message, type, position, duration, aria } = mergedOptions;

    // Determine appropriate ARIA role and live region based on notification type
    const ariaRole = aria?.role || (type === 'error' ? 'alert' : 'status');
    const ariaLive = aria?.live || (type === 'error' ? 'assertive' : 'polite');

    // Create notification object with enhanced metadata
    const notification = {
      id,
      message,
      type,
      position,
      timestamp: new Date(),
      isRead: false,
      actionUrl: null,
      onAction: null,
      priority: type === 'error' ? 'high' : 'medium',
      aria: {
        role: ariaRole,
        live: ariaLive,
        label: aria?.label || `${type} notification: ${message}`
      }
    };

    // Dispatch notification to store
    dispatch(addNotification(notification));

    // Set up auto-dismiss if duration is specified
    if (duration && duration > 0) {
      const timeoutId = window.setTimeout(() => {
        hideNotification(id);
      }, duration);

      // Store timeout reference for cleanup
      timeoutsRef.current.push({ id, timeoutId });
    }

    return id;
  }, [dispatch]);

  /**
   * Hides a notification and cleans up associated resources
   * @param id - ID of the notification to hide
   */
  const hideNotification = useCallback((id: string): void => {
    // Clear timeout if exists
    const timeoutIndex = timeoutsRef.current.findIndex(t => t.id === id);
    if (timeoutIndex !== -1) {
      window.clearTimeout(timeoutsRef.current[timeoutIndex].timeoutId);
      timeoutsRef.current.splice(timeoutIndex, 1);
    }

    // Remove notification from store
    dispatch(removeNotification(id));
  }, [dispatch]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  return {
    showNotification,
    hideNotification
  };
};

export default useNotification;