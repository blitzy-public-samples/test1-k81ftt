// @mui/material version ^5.0.0
// react version ^18.0.0
import React, { useCallback, useRef } from 'react';
import { styled } from '@mui/material/styles';
import { Checkbox as MuiCheckbox } from '@mui/material';
import { FormControlLabel } from '@mui/material';
import { Theme } from '../../config/theme.config';

/**
 * Props interface for the Checkbox component with enhanced accessibility and form integration
 */
interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
  name?: string;
  required?: boolean;
  className?: string;
  size?: 'small' | 'medium';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  ariaLabel?: string;
  ariaDescribedBy?: string;
  highContrast?: boolean;
  onFocus?: (event: React.FocusEvent) => void;
  onBlur?: (event: React.FocusEvent) => void;
}

/**
 * Styled checkbox component with enhanced theme integration and accessibility
 */
const StyledCheckbox = styled(MuiCheckbox)<{ theme: Theme }>(({ theme, error, highContrast }) => ({
  padding: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  transition: theme.transitions.create(['background-color', 'box-shadow'], {
    duration: theme.transitions.duration.shortest,
  }),
  
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },

  '&.Mui-checked': {
    color: highContrast 
      ? theme.palette.mode === 'light' 
        ? theme.palette.common.black 
        : theme.palette.common.white
      : theme.palette.primary.main,
  },

  '&.Mui-disabled': {
    opacity: theme.palette.action.disabledOpacity,
  },

  '&.Mui-error': {
    color: theme.palette.error.main,
  },

  '&.high-contrast': {
    borderWidth: '2px',
    outlineWidth: '2px',
  },

  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: '2px',
  },

  // Enhanced touch target for accessibility
  '@media (pointer: coarse)': {
    minHeight: '48px',
    minWidth: '48px',
  },
}));

/**
 * Styled helper text component for error messages
 */
const HelperText = styled('span')<{ theme: Theme; error?: boolean }>(({ theme, error }) => ({
  marginTop: theme.spacing(0.5),
  fontSize: theme.typography.caption.fontSize,
  color: error ? theme.palette.error.main : theme.palette.text.secondary,
  minHeight: '1rem',
  display: 'block',
  role: 'alert',
  'aria-live': 'polite',
}));

/**
 * Checkbox component implementing Material Design 3 specifications with enhanced accessibility
 */
export const Checkbox: React.FC<CheckboxProps> = React.memo(({
  checked,
  onChange,
  label,
  disabled = false,
  error = false,
  helperText,
  name,
  required = false,
  className,
  size = 'medium',
  color = 'primary',
  ariaLabel,
  ariaDescribedBy,
  highContrast = false,
  onFocus,
  onBlur,
}) => {
  const checkboxRef = useRef<HTMLInputElement>(null);
  const helperTextId = `${name}-helper-text`;

  /**
   * Handles checkbox state changes with enhanced error handling and accessibility
   */
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    const newChecked = event.target.checked;
    onChange(newChecked);

    // Announce state change to screen readers
    const announcement = `Checkbox ${label} ${newChecked ? 'checked' : 'unchecked'}`;
    const virtualAnnouncer = document.createElement('div');
    virtualAnnouncer.setAttribute('role', 'status');
    virtualAnnouncer.setAttribute('aria-live', 'polite');
    virtualAnnouncer.textContent = announcement;
    document.body.appendChild(virtualAnnouncer);
    setTimeout(() => document.body.removeChild(virtualAnnouncer), 1000);
  }, [disabled, onChange, label]);

  /**
   * Handles keyboard interactions for accessibility
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (disabled) return;

    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (checkboxRef.current) {
        checkboxRef.current.click();
      }
    }
  }, [disabled]);

  return (
    <div className={className}>
      <FormControlLabel
        control={
          <StyledCheckbox
            ref={checkboxRef}
            checked={checked}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            size={size}
            color={color}
            className={`${error ? 'Mui-error' : ''} ${highContrast ? 'high-contrast' : ''}`}
            inputProps={{
              'aria-label': ariaLabel || label,
              'aria-describedby': ariaDescribedBy || (helperText ? helperTextId : undefined),
              'aria-invalid': error,
              'aria-required': required,
              name,
            }}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        }
        label={label}
        required={required}
      />
      {helperText && (
        <HelperText
          id={helperTextId}
          error={error}
          theme={undefined} // Theme will be injected by styled-components
        >
          {helperText}
        </HelperText>
      )}
    </div>
  );
});

Checkbox.displayName = 'Checkbox';

export default Checkbox;