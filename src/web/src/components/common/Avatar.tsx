// @mui/material version ^5.0.0
// react version ^18.0.0
import React, { useMemo } from 'react';
import { styled } from '@mui/material/styles';
import { Avatar as MuiAvatar, Tooltip } from '@mui/material';
import type { Theme } from '../../config/theme.config';

// Constants for avatar sizing
const AVATAR_SIZES = {
  small: '32px',
  medium: '40px',
  large: '48px',
} as const;

const FONT_SIZES = {
  small: '14px',
  medium: '16px',
  large: '20px',
} as const;

// Interface for component props with accessibility support
interface AvatarProps {
  size?: keyof typeof AVATAR_SIZES;
  src?: string;
  alt?: string;
  name: string;
  variant?: 'circular' | 'rounded' | 'square';
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  loading?: boolean;
  error?: boolean;
  ariaLabel?: string;
}

// Styled components with proper accessibility and theme integration
const StyledAvatar = styled(MuiAvatar, {
  shouldForwardProp: (prop) => 
    !['size', 'loading', 'error'].includes(prop as string),
})<{
  size: keyof typeof AVATAR_SIZES;
  loading?: boolean;
  error?: boolean;
  theme: Theme;
}>(({ theme, size, loading, error }) => ({
  width: AVATAR_SIZES[size],
  height: AVATAR_SIZES[size],
  fontSize: FONT_SIZES[size],
  backgroundColor: error 
    ? theme.palette.error.main 
    : theme.palette.primary.main,
  color: error 
    ? theme.palette.error.contrastText 
    : theme.palette.primary.contrastText,
  opacity: loading ? 0.7 : 1,
  transition: theme.transitions.create(['opacity', 'background-color'], {
    duration: theme.transitions.duration.shorter,
  }),
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },
  '&:hover': {
    cursor: (props) => props.onClick ? 'pointer' : 'default',
    transform: (props) => props.onClick ? 'scale(1.05)' : 'none',
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
    transform: 'none !important',
  },
}));

// Helper function to get initials from name
const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// Helper function to determine contrast color for background
const getContrastColor = (backgroundColor: string): string => {
  // Simple luminance calculation for demo - in production, use a more robust algorithm
  const isLight = backgroundColor.toLowerCase() === '#ffffff';
  return isLight ? '#000000' : '#ffffff';
};

/**
 * Avatar component that displays user profile images or initials
 * with support for different sizes, shapes, and loading states.
 * Implements WCAG 2.1 Level AA compliance for accessibility.
 */
export const Avatar: React.FC<AvatarProps> = ({
  size = 'medium',
  src,
  alt,
  name,
  variant = 'circular',
  className,
  onClick,
  loading = false,
  error = false,
  ariaLabel,
}) => {
  // Memoize initials calculation
  const initials = useMemo(() => getInitials(name), [name]);

  // Prepare aria label for accessibility
  const computedAriaLabel = ariaLabel || `Avatar for ${name}`;

  // Wrap avatar in tooltip for accessible name display
  const avatarElement = (
    <StyledAvatar
      size={size}
      src={src}
      variant={variant}
      className={className}
      onClick={onClick}
      loading={loading}
      error={error}
      aria-label={computedAriaLabel}
      role={onClick ? 'button' : 'img'}
      tabIndex={onClick ? 0 : -1}
    >
      {!src && initials}
    </StyledAvatar>
  );

  // Only add tooltip if there's a name and we're not in a loading state
  if (name && !loading) {
    return (
      <Tooltip 
        title={name}
        aria-hidden="true" // Hide from screen readers as they already announce the avatar
      >
        {avatarElement}
      </Tooltip>
    );
  }

  return avatarElement;
};

// Default export for convenient importing
export default Avatar;