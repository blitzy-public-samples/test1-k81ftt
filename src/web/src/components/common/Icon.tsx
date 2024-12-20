// react version: ^18.0.0
// @mui/material version: ^5.0.0
import React from 'react';
import { SvgIcon } from '@mui/material';
import { styled, useTheme } from '@mui/material/styles';
import { IconComponent } from '../../assets/icons';

// Size constants for icon dimensions with pixel ratio adjustments
const ICON_SIZES = {
  small: '16px',
  medium: '24px',
  large: '32px'
} as const;

// High contrast mode color overrides
const HIGH_CONTRAST_COLORS = {
  light: '#000000',
  dark: '#FFFFFF'
} as const;

// Interface for Icon component props
interface IconProps {
  name: string;
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' | 'inherit' | string;
  className?: string;
  ariaLabel?: string;
  highContrast?: boolean;
  onClick?: (event: React.MouseEvent<SVGSVGElement>) => void;
}

// Styled SvgIcon component with theme and accessibility support
const StyledIcon = styled(SvgIcon, {
  shouldForwardProp: (prop) => !['highContrast'].includes(prop as string),
})<{
  size?: string;
  highContrast?: boolean;
}>(({ theme, size, highContrast }) => ({
  width: ICON_SIZES[size as keyof typeof ICON_SIZES] || ICON_SIZES.medium,
  height: ICON_SIZES[size as keyof typeof ICON_SIZES] || ICON_SIZES.medium,
  transition: theme.transitions.create(['color', 'transform', 'filter'], {
    duration: theme.transitions.duration.shorter,
  }),
  ...(highContrast && {
    color: theme.palette.mode === 'dark' 
      ? HIGH_CONTRAST_COLORS.dark 
      : HIGH_CONTRAST_COLORS.light,
    filter: 'contrast(1.5)',
  }),
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
  },
}));

// Memoized Icon component for performance optimization
const Icon = React.memo<IconProps>(({
  name,
  size = 'medium',
  color = 'inherit',
  className,
  ariaLabel,
  highContrast = false,
  onClick,
}) => {
  const theme = useTheme();

  // Error boundary for development mode
  if (process.env.NODE_ENV === 'development' && !name) {
    console.error('Icon: name prop is required');
    return null;
  }

  // Calculate effective color based on theme and high contrast mode
  const effectiveColor = React.useMemo(() => {
    if (highContrast) {
      return theme.palette.mode === 'dark' 
        ? HIGH_CONTRAST_COLORS.dark 
        : HIGH_CONTRAST_COLORS.light;
    }
    return color;
  }, [color, highContrast, theme.palette.mode]);

  return (
    <StyledIcon
      component="svg"
      size={size}
      color={effectiveColor}
      className={className}
      aria-label={ariaLabel || name}
      role={onClick ? 'button' : 'img'}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      focusable={!!onClick}
      highContrast={highContrast}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick && {
          transform: 'scale(1.1)',
        },
      }}
    >
      {/* Ensure proper accessibility for interactive icons */}
      {onClick && (
        <title>{ariaLabel || name}</title>
      )}
      {/* Icon content will be injected by Material-UI */}
      <use href={`#${name}`} />
    </StyledIcon>
  );
});

// Display name for debugging
Icon.displayName = 'Icon';

export default Icon;

// Type exports for consumers
export type { IconProps };