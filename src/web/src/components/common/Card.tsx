import React, { useCallback, useState } from 'react';
import styled from '@emotion/styled'; // v11.0.0
import useTheme from '../../hooks/useTheme';
import { TRANSITIONS } from '../../constants/theme.constants';

/**
 * Props interface for the Card component with comprehensive accessibility support
 */
interface CardProps {
  /** Card content */
  children: React.ReactNode;
  /** Optional CSS class name */
  className?: string;
  /** Optional click handler for interactive cards */
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  /** Material elevation level (0-24) */
  elevation?: number;
  /** ARIA role for accessibility */
  role?: string;
  /** Tab index for keyboard navigation */
  tabIndex?: number;
  /** ARIA label for screen readers */
  ariaLabel?: string;
  /** ARIA describedby for additional descriptions */
  ariaDescribedBy?: string;
  /** High contrast mode flag */
  highContrast?: boolean;
}

/**
 * Styled card container with comprehensive theme and accessibility support
 */
const StyledCard = styled.div<{
  elevation?: number;
  isClickable: boolean;
  isFocused: boolean;
  highContrast?: boolean;
  theme: any;
}>`
  padding: 16px;
  border-radius: 8px;
  background: ${({ theme }) => theme.currentTheme.palette.surface};
  color: ${({ theme }) => theme.currentTheme.palette.onSurface};
  box-shadow: ${({ elevation, theme }) =>
    elevation
      ? `0 ${elevation * 2}px ${elevation * 4}px rgba(0, 0, 0, ${
          theme.isDarkMode ? 0.3 : 0.1
        })`
      : '0 2px 4px rgba(0, 0, 0, 0.1)'};
  
  position: relative;
  outline: none;
  transition: all ${TRANSITIONS.duration.standard}ms ${TRANSITIONS.easing.easeInOut};

  ${({ isClickable }) =>
    isClickable &&
    `
    cursor: pointer;
    &:hover {
      transform: translateY(-2px);
    }
  `}

  ${({ isFocused, theme }) =>
    isFocused &&
    `
    outline: 2px solid ${theme.currentTheme.palette.primary};
    outline-offset: 2px;
  `}

  ${({ highContrast, theme }) =>
    highContrast &&
    `
    border: 2px solid ${theme.currentTheme.palette.onSurface};
  `}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  /* Ensure touch target size for interactive elements */
  ${({ isClickable }) =>
    isClickable &&
    `
    min-height: 48px;
    min-width: 48px;
  `}
`;

/**
 * A highly reusable Material Design 3 card component with comprehensive
 * accessibility support, theme integration, and responsive behavior.
 */
export const Card: React.FC<CardProps> = ({
  children,
  className,
  onClick,
  elevation = 1,
  role = onClick ? 'button' : 'article',
  tabIndex = onClick ? 0 : undefined,
  ariaLabel,
  ariaDescribedBy,
  highContrast = false,
}) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  /**
   * Handles keyboard interactions for clickable cards
   */
  const handleKeyPress = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!onClick) return;

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick(event as unknown as React.MouseEvent<HTMLDivElement>);
      }
    },
    [onClick]
  );

  /**
   * Manages focus states for accessibility
   */
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  return (
    <StyledCard
      className={className}
      onClick={onClick}
      elevation={elevation}
      role={role}
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      onKeyDown={handleKeyPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      isClickable={!!onClick}
      isFocused={isFocused}
      highContrast={highContrast}
      theme={theme}
    >
      {children}
    </StyledCard>
  );
};

// Default export for convenient importing
export default Card;
```

This implementation provides a highly reusable card component with the following features:

1. Material Design 3 Compliance:
- Follows Material Design 3 specifications for cards
- Implements elevation, border radius, and transitions
- Supports both light and dark themes

2. Accessibility (WCAG 2.1 Level AA):
- Proper ARIA attributes and roles
- Keyboard navigation support
- Focus management
- High contrast mode support
- Screen reader compatibility

3. Theme Integration:
- Uses theme context for colors and styles
- Supports dark mode
- Implements high contrast mode
- Respects reduced motion preferences

4. Interactive Features:
- Click handler support
- Hover and focus states
- Keyboard interaction
- Touch target sizing

5. Responsive Design:
- Fluid transitions
- Mobile-friendly touch targets
- Reduced motion support
- Flexible content container

6. Type Safety:
- Comprehensive TypeScript interfaces
- Proper prop types
- Strict null checks

The component can be used like this:

```typescript
// Basic usage
<Card>
  <h2>Basic Card</h2>
  <p>Card content</p>
</Card>

// Interactive card with accessibility
<Card
  onClick={handleClick}
  ariaLabel="Interactive card"
  elevation={2}
  highContrast={isHighContrastMode}
>
  <h2>Interactive Card</h2>
  <p>Click or press Enter to interact</p>
</Card>