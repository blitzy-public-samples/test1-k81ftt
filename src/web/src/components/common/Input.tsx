/**
 * @fileoverview Enterprise-grade Input component with comprehensive validation and accessibility
 * Implements Material Design 3 specifications with enhanced features
 * @version 1.0.0
 */

import React, { 
  forwardRef, 
  ForwardedRef, 
  ChangeEvent, 
  FocusEvent, 
  memo, 
  useCallback,
  useState,
  useEffect
} from 'react'; // ^18.0.0
import { styled, useTheme } from '@mui/material/styles'; // ^5.0.0
import TextField from '@mui/material/TextField'; // ^5.0.0
import { useForm, ValidationRule } from '../../hooks/useForm';
import useDebounce from '../../hooks/useDebounce';

// Styled TextField with error animation and theme support
const StyledTextField = styled(TextField, {
  shouldForwardProp: prop => prop !== 'hasError' && prop !== 'rtl'
})<{ hasError?: boolean; rtl?: boolean }>(({ theme, hasError, rtl }) => ({
  ...theme.components?.MuiTextField?.styleOverrides?.root,
  direction: rtl ? 'rtl' : 'ltr',
  '& .MuiInputBase-root': {
    transition: theme.transitions.create(['border-color', 'box-shadow']),
  },
  '& .MuiOutlinedInput-root': {
    '&.Mui-error': {
      animation: 'shake 0.5s',
    }
  },
  '@keyframes shake': {
    '0%, 100%': { transform: 'translateX(0)' },
    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
    '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
  }
}));

export interface InputProps {
  /** Input field name */
  name: string;
  /** Input label text */
  label: string;
  /** Input type (text, email, password, etc.) */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date';
  /** Current input value */
  value?: string;
  /** Change event handler */
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  /** Blur event handler */
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  /** Error message */
  error?: string;
  /** Helper text displayed below input */
  helperText?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field should take full width */
  fullWidth?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** HTML autocomplete attribute */
  autoComplete?: string;
  /** Input size variant */
  size?: 'small' | 'medium';
  /** Input variant style */
  variant?: 'outlined' | 'filled' | 'standard';
  /** Array of validation rules */
  validationRules?: ValidationRule[];
  /** Async validation function */
  asyncValidation?: (value: string) => Promise<string | null>;
  /** Debounce delay for validation in milliseconds */
  debounceMs?: number;
  /** RTL text direction support */
  rtl?: boolean;
  /** ARIA label for accessibility */
  ariaLabel?: string;
  /** ARIA describedby for accessibility */
  ariaDescribedBy?: string;
}

/**
 * Enhanced Input component with comprehensive validation and accessibility features
 */
export const Input = memo(forwardRef((props: InputProps, ref: ForwardedRef<HTMLInputElement>) => {
  const {
    name,
    label,
    type = 'text',
    value: externalValue = '',
    onChange: externalOnChange,
    onBlur: externalOnBlur,
    error: externalError,
    helperText,
    required = false,
    disabled = false,
    fullWidth = true,
    placeholder,
    autoComplete,
    size = 'medium',
    variant = 'outlined',
    validationRules = [],
    asyncValidation,
    debounceMs = 300,
    rtl = false,
    ariaLabel,
    ariaDescribedBy,
  } = props;

  const theme = useTheme();
  const [internalValue, setInternalValue] = useState(externalValue);
  const [internalError, setInternalError] = useState<string>('');
  
  // Debounce value changes for validation
  const debouncedValue = useDebounce(internalValue, debounceMs);

  // Initialize form validation
  const { validateField } = useForm({
    [name]: internalValue
  }, {
    [name]: validationRules
  }, async () => {}, {
    validateOnChange: true,
    validateOnBlur: true
  });

  // Handle input change with validation
  const handleChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    
    if (externalOnChange) {
      externalOnChange(e);
    }
  }, [externalOnChange]);

  // Handle input blur with validation
  const handleBlur = useCallback(async (e: FocusEvent<HTMLInputElement>) => {
    const validationError = await validateField(name);
    setInternalError(validationError);

    if (asyncValidation) {
      const asyncError = await asyncValidation(e.target.value);
      if (asyncError) {
        setInternalError(asyncError);
      }
    }

    if (externalOnBlur) {
      externalOnBlur(e);
    }
  }, [name, validateField, asyncValidation, externalOnBlur]);

  // Effect for handling debounced validation
  useEffect(() => {
    const validateDebounced = async () => {
      if (debouncedValue !== externalValue) {
        const validationError = await validateField(name);
        setInternalError(validationError);
      }
    };

    validateDebounced();
  }, [debouncedValue, externalValue, name, validateField]);

  // Combine external and internal errors
  const displayError = externalError || internalError;

  return (
    <StyledTextField
      name={name}
      label={label}
      type={type}
      value={internalValue}
      onChange={handleChange}
      onBlur={handleBlur}
      error={!!displayError}
      helperText={displayError || helperText}
      required={required}
      disabled={disabled}
      fullWidth={fullWidth}
      placeholder={placeholder}
      autoComplete={autoComplete}
      size={size}
      variant={variant}
      inputRef={ref}
      hasError={!!displayError}
      rtl={rtl}
      InputProps={{
        'aria-label': ariaLabel,
        'aria-describedby': ariaDescribedBy,
        'aria-required': required,
        'aria-invalid': !!displayError,
      }}
      FormHelperTextProps={{
        role: displayError ? 'alert' : undefined,
        'aria-live': 'polite',
      }}
    />
  );
}));

Input.displayName = 'Input';

export default Input;