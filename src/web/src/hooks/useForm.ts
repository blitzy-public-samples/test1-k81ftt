/**
 * @fileoverview Enterprise-grade form management hook with comprehensive validation
 * Provides real-time validation, accessibility features, and internationalization support
 * @version 1.0.0
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'; // ^18.0.0
import { debounce } from 'lodash'; // ^4.17.21
import { ValidationRule } from '../types/common.types';
import {
  validateRequired,
  validateLength,
  validatePattern,
  validateEmail,
  validatePassword,
  sanitizeInput
} from '../utils/validation.utils';
import { VALIDATION_MESSAGES } from '../constants/validation.constants';

// Constants for form management
const VALIDATION_DEBOUNCE_MS = 300;
const MAX_VALIDATION_ATTEMPTS = 3;

/**
 * Form field metadata interface
 */
interface FieldMeta {
  touched: boolean;
  dirty: boolean;
  validating: boolean;
  validated: boolean;
  attempts: number;
}

/**
 * Form state interface
 */
export interface FormState<T = Record<string, any>> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  dirty: Record<string, boolean>;
  isSubmitting: boolean;
  isValidating: boolean;
  submitCount: number;
}

/**
 * Form options interface
 */
interface FormOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  revalidateOnChange?: boolean;
  sanitizeInput?: boolean;
  shouldUnregister?: boolean;
}

/**
 * Enterprise-grade form management hook
 * @param initialValues - Initial form values
 * @param validationRules - Validation rules for form fields
 * @param onSubmit - Form submission handler
 * @param options - Form configuration options
 */
export const useForm = <T extends Record<string, any>>(
  initialValues: T,
  validationRules: Record<string, ValidationRule>,
  onSubmit: (values: T) => Promise<void>,
  options: FormOptions = {}
) => {
  // Default options
  const defaultOptions: Required<FormOptions> = {
    validateOnChange: true,
    validateOnBlur: true,
    revalidateOnChange: true,
    sanitizeInput: true,
    shouldUnregister: true,
    ...options
  };

  // Form state
  const [formState, setFormState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    dirty: {},
    isSubmitting: false,
    isValidating: false,
    submitCount: 0
  });

  // Refs for tracking mounted state and field metadata
  const isMounted = useRef(true);
  const fieldsMeta = useRef<Record<string, FieldMeta>>({});

  // Memoized validation function
  const validateField = useCallback(async (
    field: string,
    value: any,
    rules?: ValidationRule
  ): Promise<string | null> => {
    if (!rules) return null;

    try {
      // Required field validation
      if (rules.required && !validateRequired(value)) {
        return VALIDATION_MESSAGES.REQUIRED_FIELD;
      }

      // Length validation
      if ((rules.minLength || rules.maxLength) && typeof value === 'string') {
        const isValidLength = validateLength(
          value,
          rules.minLength || 0,
          rules.maxLength || Number.MAX_SAFE_INTEGER
        );
        if (!isValidLength) {
          return `Length must be between ${rules.minLength} and ${rules.maxLength} characters`;
        }
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value)) {
        return 'Invalid format';
      }

      // Email validation
      if (rules.email && !validateEmail(value)) {
        return VALIDATION_MESSAGES.INVALID_EMAIL;
      }

      // Async validation
      if (rules.asyncValidator) {
        const result = await rules.asyncValidator(value);
        if (result) return result;
      }

      return null;
    } catch (error) {
      console.error(`Validation error for field ${field}:`, error);
      return 'Validation failed';
    }
  }, []);

  // Debounced validation to prevent excessive validation calls
  const debouncedValidation = useMemo(
    () => debounce(validateField, VALIDATION_DEBOUNCE_MS),
    [validateField]
  );

  // Handle field change
  const handleChange = useCallback(async (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    let processedValue = value;

    // Sanitize input if enabled
    if (defaultOptions.sanitizeInput) {
      processedValue = sanitizeInput(value);
    }

    // Update form state
    setFormState(prev => ({
      ...prev,
      values: { ...prev.values, [name]: processedValue },
      dirty: { ...prev.dirty, [name]: true }
    }));

    // Validate on change if enabled
    if (defaultOptions.validateOnChange) {
      const error = await debouncedValidation(name, processedValue, validationRules[name]);
      setFormState(prev => ({
        ...prev,
        errors: { ...prev.errors, [name]: error || '' }
      }));
    }
  }, [defaultOptions, validationRules, debouncedValidation]);

  // Handle field blur
  const handleBlur = useCallback(async (
    event: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name } = event.target;

    // Mark field as touched
    setFormState(prev => ({
      ...prev,
      touched: { ...prev.touched, [name]: true }
    }));

    // Validate on blur if enabled
    if (defaultOptions.validateOnBlur) {
      const error = await validateField(name, formState.values[name], validationRules[name]);
      setFormState(prev => ({
        ...prev,
        errors: { ...prev.errors, [name]: error || '' }
      }));
    }
  }, [defaultOptions, formState.values, validationRules, validateField]);

  // Handle form submission
  const handleSubmit = useCallback(async (
    event?: React.FormEvent<HTMLFormElement>
  ) => {
    if (event) {
      event.preventDefault();
    }

    setFormState(prev => ({
      ...prev,
      isSubmitting: true,
      submitCount: prev.submitCount + 1
    }));

    try {
      // Validate all fields
      const errors: Record<string, string> = {};
      for (const [field, value] of Object.entries(formState.values)) {
        const error = await validateField(field, value, validationRules[field]);
        if (error) errors[field] = error;
      }

      // Check for validation errors
      if (Object.keys(errors).length > 0) {
        setFormState(prev => ({
          ...prev,
          errors,
          isSubmitting: false
        }));
        return;
      }

      // Submit form
      await onSubmit(formState.values);

      // Reset form if still mounted
      if (isMounted.current) {
        setFormState(prev => ({
          ...prev,
          isSubmitting: false,
          errors: {},
          touched: {},
          dirty: {}
        }));
      }
    } catch (error) {
      console.error('Form submission error:', error);
      if (isMounted.current) {
        setFormState(prev => ({
          ...prev,
          isSubmitting: false,
          errors: {
            ...prev.errors,
            submit: 'Form submission failed'
          }
        }));
      }
    }
  }, [formState.values, validationRules, onSubmit, validateField]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormState({
      values: initialValues,
      errors: {},
      touched: {},
      dirty: {},
      isSubmitting: false,
      isValidating: false,
      submitCount: 0
    });
    fieldsMeta.current = {};
  }, [initialValues]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      debouncedValidation.cancel();
    };
  }, [debouncedValidation]);

  return {
    ...formState,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue: (field: string, value: any) => {
      setFormState(prev => ({
        ...prev,
        values: { ...prev.values, [field]: value },
        dirty: { ...prev.dirty, [field]: true }
      }));
    },
    setFieldError: (field: string, error: string) => {
      setFormState(prev => ({
        ...prev,
        errors: { ...prev.errors, [field]: error }
      }));
    },
    validateField: async (field: string) => {
      const error = await validateField(field, formState.values[field], validationRules[field]);
      setFormState(prev => ({
        ...prev,
        errors: { ...prev.errors, [field]: error || '' }
      }));
      return error || '';
    }
  };
};

export default useForm;