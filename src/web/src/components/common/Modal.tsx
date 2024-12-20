/**
 * @fileoverview A reusable, accessible modal dialog component implementing Material Design 3 principles
 * @version 1.0.0
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom'; // ^18.0.0
import { motion, AnimatePresence } from 'framer-motion'; // ^6.0.0
import classNames from 'classnames'; // ^2.3.0
import { Button, ButtonProps } from './Button';
import { useTheme } from '../../hooks/useTheme';
import { TRANSITIONS } from '../../constants/theme.constants';

/**
 * Props interface for the Modal component
 */
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  footer?: React.ReactNode;
  className?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  animationDuration?: number;
  preventScroll?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
  returnFocusRef?: React.RefObject<HTMLElement>;
  onAnimationComplete?: () => void;
  disablePortal?: boolean;
}

/**
 * Animation variants for modal transitions
 */
const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: -20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
};

/**
 * Modal component implementing Material Design 3 principles with accessibility features
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  showCloseButton = true,
  closeOnOverlayClick = true,
  footer,
  className,
  ariaLabel,
  ariaDescribedBy,
  animationDuration = TRANSITIONS.duration.standard,
  preventScroll = true,
  initialFocusRef,
  returnFocusRef,
  onAnimationComplete,
  disablePortal = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const { currentTheme } = useTheme();
  const modalId = useRef(`modal-${crypto.randomUUID()}`);
  const contentId = useRef(`content-${crypto.randomUUID()}`);

  // Handle keyboard events for accessibility
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && isOpen) {
      onClose();
    }
  }, [isOpen, onClose]);

  // Manage body scroll
  useEffect(() => {
    if (preventScroll && isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, preventScroll]);

  // Handle focus management
  useEffect(() => {
    if (isOpen) {
      const focusElement = initialFocusRef?.current || modalRef.current;
      focusElement?.focus();

      return () => {
        if (returnFocusRef?.current) {
          returnFocusRef.current.focus();
        }
      };
    }
  }, [isOpen, initialFocusRef, returnFocusRef]);

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const modalContent = (
    <AnimatePresence mode="wait" onExitComplete={onAnimationComplete}>
      {isOpen && (
        <div
          className={classNames('modal-overlay', className)}
          onClick={closeOnOverlayClick ? onClose : undefined}
          style={{
            backgroundColor: currentTheme.palette.action.disabledBackground,
            ...styles.overlay,
          }}
        >
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalId.current}
            aria-describedby={ariaDescribedBy || contentId.current}
            className={classNames('modal', `modal--${size}`)}
            onClick={(e) => e.stopPropagation()}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{
              duration: animationDuration / 1000,
              ease: TRANSITIONS.easing.easeInOut,
            }}
            style={{
              ...styles.modal,
              ...styles.modal.sizes[size],
              backgroundColor: currentTheme.palette.background.paper,
            }}
            tabIndex={-1}
          >
            <header className="modal__header" style={styles.header}>
              <h2 id={modalId.current} style={styles.title}>
                {title}
              </h2>
              {showCloseButton && (
                <Button
                  variant="text"
                  onClick={onClose}
                  ariaLabel="Close modal"
                  className="modal__close-button"
                >
                  ✕
                </Button>
              )}
            </header>

            <div
              id={contentId.current}
              className="modal__content"
              style={styles.content}
            >
              {children}
            </div>

            {footer && (
              <footer className="modal__footer" style={styles.footer}>
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return disablePortal
    ? modalContent
    : createPortal(modalContent, document.body);
};

// Styles object following Material Design 3 principles
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '90vh',
    borderRadius: '16px',
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.12)',
    outline: 'none',
    sizes: {
      small: {
        width: '90vw',
        maxWidth: '400px',
      },
      medium: {
        width: '90vw',
        maxWidth: '600px',
      },
      large: {
        width: '90vw',
        maxWidth: '800px',
      },
      fullscreen: {
        width: '100vw',
        height: '100vh',
        maxWidth: 'none',
        maxHeight: 'none',
        borderRadius: 0,
      },
    },
  } as const,
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderBottom: '1px solid',
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 500,
    lineHeight: 1.6,
  },
  content: {
    flex: 1,
    padding: '24px',
    overflowY: 'auto',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '16px 24px',
    borderTop: '1px solid',
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
};

export default Modal;
```

This implementation provides a robust, accessible modal component with the following features:

1. Accessibility:
- ARIA attributes and roles
- Keyboard navigation support
- Focus management
- Screen reader support
- Semantic HTML structure

2. Material Design 3:
- Follows MD3 elevation and spacing principles
- Responsive sizing
- Smooth animations
- Theme integration

3. Features:
- Multiple size options
- Customizable animations
- Portal rendering
- Scroll lock
- Backdrop blur
- Close button option
- Footer support
- Custom class support

4. Performance:
- Memoized event handlers
- Cleanup on unmount
- Efficient re-renders
- Animation performance optimization

5. Type Safety:
- Full TypeScript support
- Comprehensive prop types
- Proper event typing

The component can be used like this:

```typescript
<Modal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  title="Example Modal"
  size="medium"
  footer={
    <>
      <Button onClick={() => setIsModalOpen(false)}>Cancel</Button>
      <Button variant="primary" onClick={handleSubmit}>Submit</Button>
    </>
  }
>
  <p>Modal content goes here</p>
</Modal>