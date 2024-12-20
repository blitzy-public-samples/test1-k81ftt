// =============================================================================
// Tooltip Component
// Material Design 3 Implementation
// Version: 1.0.0
// =============================================================================

import React, { useState, useRef, useEffect, useCallback, memo } from 'react'; // ^18.0.0
import classNames from 'classnames'; // ^2.3.0
import '../styles/components.scss';

// -----------------------------------------------------------------------------
// Types & Interfaces
// -----------------------------------------------------------------------------

interface Position {
  top: number;
  left: number;
  placement: 'top' | 'right' | 'bottom' | 'left';
}

interface TooltipProps {
  children: React.ReactNode;
  content: string | React.ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
  className?: string;
  disabled?: boolean;
  showOnFocus?: boolean;
  id?: string;
  maxWidth?: number;
  zIndex?: number;
  motionReduced?: boolean;
}

// -----------------------------------------------------------------------------
// Position Calculation
// -----------------------------------------------------------------------------

const calculatePosition = (
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  preferredPosition: string,
  isRTL: boolean
): Position => {
  const spacing = 8; // Base spacing following Material Design guidelines
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  // Initial position calculations
  const positions: Record<string, Position> = {
    top: {
      top: triggerRect.top - tooltipRect.height - spacing,
      left: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2,
      placement: 'top',
    },
    right: {
      top: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2,
      left: triggerRect.right + spacing,
      placement: 'right',
    },
    bottom: {
      top: triggerRect.bottom + spacing,
      left: triggerRect.left + (triggerRect.width - tooltipRect.width) / 2,
      placement: 'bottom',
    },
    left: {
      top: triggerRect.top + (triggerRect.height - tooltipRect.height) / 2,
      left: triggerRect.left - tooltipRect.width - spacing,
      placement: 'left',
    },
  };

  // RTL support
  if (isRTL) {
    Object.keys(positions).forEach((key) => {
      if (key === 'left' || key === 'right') {
        positions[key].left = viewport.width - positions[key].left - tooltipRect.width;
      }
    });
  }

  // Get initial position based on preference
  let position = positions[preferredPosition] || positions.bottom;

  // Viewport boundary checks and adjustments
  if (position.left < spacing) {
    position.left = spacing;
  } else if (position.left + tooltipRect.width > viewport.width - spacing) {
    position.left = viewport.width - tooltipRect.width - spacing;
  }

  if (position.top < spacing) {
    position = positions.bottom;
  } else if (position.top + tooltipRect.height > viewport.height - spacing) {
    position = positions.top;
  }

  return position;
};

// -----------------------------------------------------------------------------
// Tooltip Component
// -----------------------------------------------------------------------------

export const Tooltip: React.FC<TooltipProps> = memo(({
  children,
  content,
  position = 'bottom',
  delay = 200,
  className,
  disabled = false,
  showOnFocus = true,
  id,
  maxWidth = 250,
  zIndex = 1000,
  motionReduced = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<Position | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const isRTL = document.dir === 'rtl';

  // Generate unique ID for ARIA attributes
  const tooltipId = id || `tooltip-${Math.random().toString(36).substr(2, 9)}`;

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current || !isVisible) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const newPosition = calculatePosition(triggerRect, tooltipRect, position, isRTL);
    setTooltipPosition(newPosition);
  }, [isVisible, position, isRTL]);

  // Handle show/hide with delay
  const showTooltip = useCallback(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [delay]);

  const hideTooltip = useCallback(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100); // Quick hide for better UX
  }, []);

  // Update position on scroll/resize
  useEffect(() => {
    if (!isVisible) return;

    const handleUpdate = () => {
      requestAnimationFrame(updatePosition);
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isVisible, updatePosition]);

  // Update position when content changes
  useEffect(() => {
    if (isVisible) {
      updatePosition();
    }
  }, [content, isVisible, updatePosition]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <>
      <div
        ref={triggerRef}
        className={classNames('tooltip-trigger', className)}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showOnFocus ? showTooltip : undefined}
        onBlur={showOnFocus ? hideTooltip : undefined}
        aria-describedby={isVisible ? tooltipId : undefined}
      >
        {children}
      </div>
      {isVisible && tooltipPosition && (
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className={classNames(
            'tooltip',
            `tooltip--${tooltipPosition.placement}`,
            { 'tooltip--reduced-motion': motionReduced }
          )}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
            maxWidth,
            zIndex,
          }}
        >
          {content}
        </div>
      )}
    </>
  );
});

Tooltip.displayName = 'Tooltip';

// Named export for TypeScript interface
export type { TooltipProps };