/**
 * @fileoverview Enterprise-grade Material Design 3 radio button component
 * Implements WCAG 2.1 Level AA compliance with comprehensive theme support
 * @version 1.0.0
 */

import React, { FC, ChangeEvent, KeyboardEvent, useCallback, useEffect, useRef } from 'react';
import styled, { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useForm } from '../../hooks/useForm';

// Version comments for external dependencies
// react: ^18.0.0
// @mui/material: ^5.0.0

/**
 * Props interface for the RadioButton component
 */
interface RadioButtonProps {
  name: string;
  value: string;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  label: string;
  error?: string;
  className?: string;
  required?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  groupName?: string;
  size?: 'small' | 'medium' | 'large';
  validationRules?: Record<string, any>;
}

/**
 * Styled container component with accessibility and theme support
 */
const RadioButtonContainer = styled('div')(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  position: 'relative',
  cursor: 'pointer',
  userSelect: 'none',
  gap: theme.spacing(1),
  padding: theme.spacing(0.5),
  transition: theme.transitions.create(['background-color', 'box-shadow']),
  borderRadius: theme.shape.borderRadius,
  
  '&:focus-within': {
    boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
    outline: 'none',
  },
  
  '&:hover:not(.disabled)': {
    backgroundColor: theme.palette.action.hover,
  },
  
  '&.disabled': {
    cursor: 'not-allowed',
    opacity: 0.6,
  },

  // High contrast mode support
  '.high-contrast &': {
    border: `2px solid ${theme.palette.text.primary}`,
  }
}));

/**
 * Styled radio input with enhanced accessibility and theme integration
 */
const RadioInput = styled('input')(({ theme }) => ({
  appearance: 'none',
  margin: 0,
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  border: `2px solid ${theme.palette.grey[400]}`,
  transition: theme.transitions.create(['border-color', 'background-color', 'transform']),
  cursor: 'pointer',
  position: 'relative',
  
  '&:checked': {
    borderColor: theme.palette.primary.main,
    '&:after': {
      transform: 'scale(1)',
    }
  },
  
  '&:after': {
    content: '""',
    position: 'absolute',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: theme.palette.primary.main,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) scale(0)',
    transition: theme.transitions.create('transform'),
  },
  
  '&:disabled': {
    borderColor: theme.palette.grey[300],
    cursor: 'not-allowed',
  },
  
  '&:focus': {
    outline: 'none',
  },
  
  // High contrast mode styles
  '.high-contrast &:checked:after': {
    background: theme.palette.primary.contrastText,
  }
}));

/**
 * Styled label with accessibility considerations
 */
const Label = styled('label')(({ theme }) => ({
  fontSize: '1rem',
  color: theme.palette.text.primary,
  marginLeft: theme.spacing(1),
  cursor: 'pointer',
  
  '.disabled &': {
    cursor: 'not-allowed',
    color: theme.palette.text.disabled,
  }
}));

/**
 * Error message styling
 */
const ErrorText = styled('span')(({ theme }) => ({
  color: theme.palette.error.main,
  fontSize: '0.75rem',
  marginTop: theme.spacing(0.5),
  display: 'block',
}));

/**
 * RadioButton component with comprehensive accessibility and theme support
 */
export const RadioButton: FC<RadioButtonProps> = ({
  name,
  value,
  checked = false,
  disabled = false,
  onChange,
  label,
  error,
  className = '',
  required = false,
  ariaLabel,
  ariaDescribedBy,
  groupName,
  size = 'medium',
  validationRules,
}) => {
  // Hooks
  const theme = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const { handleChange: handleFormChange, registerField } = useForm();

  // Generate unique IDs for accessibility
  const inputId = `radio-${name}-${value}`.replace(/\s+/g, '-');
  const errorId = `${inputId}-error`;

  // Handle radio change with form integration
  const handleRadioChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    // Handle form integration
    if (handleFormChange) {
      handleFormChange(event);
    }

    // Call custom onChange handler
    onChange?.(event);
  }, [disabled, handleFormChange, onChange]);

  // Handle keyboard navigation
  const handleKeyPress = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    switch (event.key) {
      case ' ':
      case 'Enter':
        event.preventDefault();
        inputRef.current?.click();
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'ArrowRight':
      case 'ArrowDown':
        // Handle group navigation - would be implemented by the RadioGroup component
        event.preventDefault();
        break;
    }
  }, [disabled]);

  // Register with form context if available
  useEffect(() => {
    if (registerField && name) {
      registerField(name, { required, ...validationRules });
    }
  }, [name, registerField, required, validationRules]);

  // Compute size-based styles
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { transform: 'scale(0.8)' };
      case 'large':
        return { transform: 'scale(1.2)' };
      default:
        return {};
    }
  };

  return (
    <RadioButtonContainer
      className={`radio-button-container ${disabled ? 'disabled' : ''} ${className}`}
      style={getSizeStyles()}
    >
      <RadioInput
        ref={inputRef}
        type="radio"
        id={inputId}
        name={groupName || name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={handleRadioChange}
        onKeyPress={handleKeyPress}
        aria-label={ariaLabel}
        aria-describedby={`${ariaDescribedBy ? `${ariaDescribedBy} ` : ''}${error ? errorId : ''}`}
        aria-required={required}
        aria-invalid={!!error}
        data-testid={`radio-${name}-${value}`}
      />
      <Label
        htmlFor={inputId}
        className={disabled ? 'disabled' : ''}
      >
        {label}
        {required && <span aria-hidden="true">*</span>}
      </Label>
      {error && (
        <ErrorText
          id={errorId}
          role="alert"
        >
          {error}
        </ErrorText>
      )}
    </RadioButtonContainer>
  );
};

export default RadioButton;