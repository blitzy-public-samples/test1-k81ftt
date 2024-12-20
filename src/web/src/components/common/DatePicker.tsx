/**
 * @fileoverview Enhanced date picker component with Material Design 3 implementation,
 * accessibility features, and comprehensive validation support.
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'; // ^18.0.0
import { DatePicker as MuiDatePicker, DatePickerProps } from '@mui/x-date-pickers'; // ^6.0.0
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'; // ^6.0.0
import { useTheme } from '@mui/material'; // ^5.0.0
import { useForm } from '../../hooks/useForm';
import { DateRange } from '../../types/common.types';
import { validateFutureDate } from '../../utils/validation.utils';

// Constants for date handling
const DATE_FORMAT = 'yyyy-MM-dd';
const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const TIMEZONE_DEFAULT = 'UTC';

// Validation messages
const VALIDATION_MESSAGES = {
  FUTURE_DATE: 'Please select a future date',
  INVALID_DATE: 'Please enter a valid date',
  MIN_DATE: 'Date cannot be before minimum date',
  MAX_DATE: 'Date cannot be after maximum date',
  DISABLED_DATE: 'This date is not available for selection'
} as const;

/**
 * Interface for enhanced date picker props
 */
interface EnhancedDatePickerProps extends Omit<DatePickerProps<Date>, 'onChange'> {
  name: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  label: string;
  error?: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  readOnly?: boolean;
  timezone?: string;
  format?: string;
  requireFutureDate?: boolean;
  disabledDates?: Date[];
  ariaLabels?: {
    input?: string;
    calendar?: string;
    clear?: string;
  };
}

/**
 * Enhanced date picker component with comprehensive features
 * @param props Component props
 * @returns React component
 */
export const DatePicker: React.FC<EnhancedDatePickerProps> = ({
  name,
  value,
  onChange,
  label,
  error,
  required = false,
  minDate,
  maxDate,
  readOnly = false,
  timezone = TIMEZONE_DEFAULT,
  format = DATE_FORMAT,
  requireFutureDate = false,
  disabledDates = [],
  ariaLabels,
  ...rest
}) => {
  // Theme and form hooks
  const theme = useTheme();
  const { setFieldValue, setFieldError, setFieldTouched } = useForm();

  // Local state for internal date handling
  const [localDate, setLocalDate] = useState<Date | null>(value);
  const [isOpen, setIsOpen] = useState(false);

  /**
   * Memoized date validation function
   */
  const validateDate = useCallback((date: Date | null): string | null => {
    if (!date) {
      return required ? VALIDATION_MESSAGES.INVALID_DATE : null;
    }

    if (requireFutureDate && !validateFutureDate(date)) {
      return VALIDATION_MESSAGES.FUTURE_DATE;
    }

    if (minDate && date < minDate) {
      return VALIDATION_MESSAGES.MIN_DATE;
    }

    if (maxDate && date > maxDate) {
      return VALIDATION_MESSAGES.MAX_DATE;
    }

    if (disabledDates.some(disabled => 
      disabled.getTime() === date.getTime()
    )) {
      return VALIDATION_MESSAGES.DISABLED_DATE;
    }

    return null;
  }, [required, requireFutureDate, minDate, maxDate, disabledDates]);

  /**
   * Handles date change with validation
   */
  const handleDateChange = useCallback((newDate: Date | null) => {
    setLocalDate(newDate);
    
    // Validate the new date
    const validationError = validateDate(newDate);
    
    // Update form state
    setFieldValue(name, newDate);
    setFieldError(name, validationError || '');
    setFieldTouched(name, true);
    
    // Trigger onChange callback
    onChange(newDate);
  }, [name, onChange, setFieldValue, setFieldError, setFieldTouched, validateDate]);

  /**
   * Memoized date picker styles
   */
  const datePickerStyles = useMemo(() => ({
    width: '100%',
    '& .MuiInputBase-root': {
      backgroundColor: theme.palette.background.paper,
    },
    '& .MuiInputBase-input': {
      color: readOnly ? theme.palette.text.disabled : theme.palette.text.primary,
    },
    '& .Mui-error': {
      color: theme.palette.error.main,
    }
  }), [theme, readOnly]);

  // Effect to sync external value changes
  useEffect(() => {
    if (value !== localDate) {
      setLocalDate(value);
    }
  }, [value]);

  return (
    <MuiDatePicker
      value={localDate}
      onChange={handleDateChange}
      label={label}
      format={format}
      disabled={readOnly}
      minDate={minDate || new Date(MIN_YEAR, 0, 1)}
      maxDate={maxDate || new Date(MAX_YEAR, 11, 31)}
      slotProps={{
        textField: {
          error: !!error,
          helperText: error,
          required,
          inputProps: {
            'aria-label': ariaLabels?.input || label,
            'aria-required': required,
            'aria-invalid': !!error,
          }
        },
        popper: {
          'aria-label': ariaLabels?.calendar || 'Date picker calendar'
        },
        actionBar: {
          actions: ['clear'],
          'aria-label': ariaLabels?.clear || 'Clear date selection'
        }
      }}
      shouldDisableDate={(date: Date) => 
        disabledDates.some(disabled => disabled.getTime() === date.getTime())
      }
      sx={datePickerStyles}
      {...rest}
    />
  );
};

export default DatePicker;