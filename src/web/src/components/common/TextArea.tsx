/**
 * @fileoverview A highly accessible, validated, and customizable textarea component
 * Implements Material Design 3 specifications with comprehensive validation and accessibility features
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, forwardRef } from 'react';
import { styled, alpha } from '@mui/material/styles';
import { TextareaAutosize } from '@mui/base';
import { validateRequired, validateLength } from '../../utils/validation.utils';
import { useForm } from '../../hooks/useForm';

// Constants for validation and accessibility
const ARIA_LABELS = {
  COUNTER: 'character count',
  ERROR: 'error message',
  HELPER: 'helper text'
} as const;

const DEBOUNCE_MS = 300;

// Styled components with Material Design 3 specifications
const StyledTextArea = styled(TextareaAutosize)(({ theme }) => ({
  width: '100%',
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius,
  border: `1px solid ${theme.palette.divider}`,
  fontFamily: theme.typography.fontFamily,
  fontSize: theme.typography.body1.fontSize,
  lineHeight: theme.typography.body1.lineHeight,
  resize: 'vertical',
  transition: theme.transitions.create(['border-color', 'box-shadow']),
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,

  '&:focus': {
    outline: 'none',
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.25)}`
  },

  '&:disabled': {
    backgroundColor: theme.palette.action.disabledBackground,
    color: theme.palette.action.disabled,
    cursor: 'not-allowed',
    opacity: theme.palette.action.disabledOpacity
  },

  '&.error': {
    borderColor: theme.palette.error.main,
    '&:focus': {
      boxShadow: `0 0 0 2px ${alpha(theme.palette.error.main, 0.25)}`
    }
  },

  // High contrast mode support
  '@media (forced-colors: active)': {
    borderColor: 'CanvasText',
    '&:focus': {
      outline: '2px solid CanvasText'
    }
  },

  // Reduced motion support
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none'
  }
}));

const HelperText = styled('div')(({ theme }) => ({
  marginTop: theme.spacing(0.5),
  fontSize: theme.typography.caption.fontSize,
  lineHeight: theme.typography.caption.lineHeight,
  color: theme.palette.text.secondary,
  minHeight: '1.25em',

  '&.error': {
    color: theme.palette.error.main
  }
}));

const CharacterCounter = styled('div')(({ theme }) => ({
  marginTop: theme.spacing(0.5),
  fontSize: theme.typography.caption.fontSize,
  textAlign: 'right',
  color: theme.palette.text.secondary,

  '&.error': {
    color: theme.palette.error.main
  }
}));

// Component props interface
interface TextAreaProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  minRows?: number;
  maxRows?: number;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  label?: string;
  className?: string;
}

/**
 * TextArea component with comprehensive validation and accessibility features
 * Implements Material Design 3 specifications and WCAG 2.1 Level AA compliance
 */
export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      id,
      value,
      onChange,
      onBlur,
      error,
      helperText,
      required = false,
      disabled = false,
      minRows = 3,
      maxRows = 10,
      minLength = 0,
      maxLength = 2000,
      placeholder,
      label,
      className
    },
    ref
  ) => {
    // State management
    const [charCount, setCharCount] = useState(value?.length || 0);
    const [internalValue, setInternalValue] = useState(value || '');

    // Form validation using useForm hook
    const { validateField } = useForm({
      values: { [id]: value },
      validationRules: {
        [id]: {
          required,
          minLength,
          maxLength,
          validator: (value: string) => {
            if (required && !validateRequired(value)) {
              return 'This field is required';
            }
            if (!validateLength(value, minLength, maxLength)) {
              return `Text must be between ${minLength} and ${maxLength} characters`;
            }
            return null;
          }
        }
      },
      onSubmit: async () => {}
    });

    // Update character count when value changes
    useEffect(() => {
      setCharCount(value?.length || 0);
      setInternalValue(value || '');
    }, [value]);

    // Handle value changes with validation
    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = event.target.value;
        setInternalValue(newValue);
        setCharCount(newValue.length);
        onChange(newValue);
      },
      [onChange]
    );

    // Handle blur events
    const handleBlur = useCallback(
      (event: React.FocusEvent<HTMLTextAreaElement>) => {
        validateField(id);
        onBlur?.(event);
      },
      [id, onBlur, validateField]
    );

    const isError = Boolean(error);
    const showCounter = maxLength > 0;
    const counterColor = charCount > maxLength ? 'error' : undefined;

    return (
      <div className={className}>
        {label && (
          <label
            htmlFor={id}
            className="textarea-label"
            data-required={required}
          >
            {label}
            {required && <span aria-hidden="true"> *</span>}
          </label>
        )}
        <StyledTextArea
          ref={ref}
          id={id}
          value={internalValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className={isError ? 'error' : undefined}
          disabled={disabled}
          minRows={minRows}
          maxRows={maxRows}
          placeholder={placeholder}
          aria-invalid={isError}
          aria-required={required}
          aria-describedby={`${id}-helper ${id}-counter`}
          data-testid={`textarea-${id}`}
        />
        <div className="textarea-footer">
          {(helperText || error) && (
            <HelperText
              id={`${id}-helper`}
              className={isError ? 'error' : undefined}
              role={isError ? 'alert' : 'status'}
              aria-live="polite"
            >
              {error || helperText}
            </HelperText>
          )}
          {showCounter && (
            <CharacterCounter
              id={`${id}-counter`}
              className={counterColor}
              aria-label={ARIA_LABELS.COUNTER}
            >
              {charCount}/{maxLength}
            </CharacterCounter>
          )}
        </div>
      </div>
    );
  }
);

TextArea.displayName = 'TextArea';

export default TextArea;