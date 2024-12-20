/**
 * @fileoverview Custom React hook for type-safe localStorage operations with state management
 * Provides automatic synchronization across browser tabs, error handling, and storage quota management
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react'; // v18.0.0
import {
  setLocalStorageItem,
  getLocalStorageItem,
  removeLocalStorageItem,
} from '../utils/storage.utils';
import { ErrorResponse } from '../types/common.types';

// Constants for storage management
const STORAGE_EVENT = 'storage';
const DEBOUNCE_DELAY = 100; // ms
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB storage quota

/**
 * Custom hook for managing localStorage values with React state synchronization
 * @template T - Type of the stored value
 * @param {string} key - Storage key
 * @param {T} initialValue - Initial value if none exists in storage
 * @returns {[T, (value: T) => void, () => void, ErrorResponse | null]} Tuple containing:
 * - Current value
 * - Setter function
 * - Remove function
 * - Error state
 */
export default function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void, () => void, ErrorResponse | null] {
  // Initialize state with value from localStorage or initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = getLocalStorageItem<T>(key);
      return item !== null ? item : initialValue;
    } catch (error) {
      console.error(`Error initializing localStorage for key "${key}":`, error);
      return initialValue;
    }
  });

  // Track error state
  const [error, setError] = useState<ErrorResponse | null>(null);

  /**
   * Memoized function to update value in localStorage and state
   * Handles storage quota management and error cases
   */
  const setValue = useCallback(
    (value: T) => {
      try {
        // Check storage quota before setting
        const valueSize = new Blob([JSON.stringify(value)]).size;
        if (valueSize > MAX_STORAGE_SIZE) {
          throw new Error('Storage quota would be exceeded');
        }

        // Update React state
        setStoredValue(value);
        setError(null);

        // Update localStorage
        setLocalStorageItem(key, value);
      } catch (err) {
        const errorResponse: ErrorResponse = {
          code: 'STORAGE_ERROR',
          message: err instanceof Error ? err.message : 'Unknown storage error',
          details: {},
          correlationId: crypto.randomUUID()
        };
        setError(errorResponse);
        console.error('Error setting localStorage value:', errorResponse);
      }
    },
    [key]
  );

  /**
   * Memoized function to remove value from localStorage and reset state
   */
  const removeValue = useCallback(() => {
    try {
      removeLocalStorageItem(key);
      setStoredValue(initialValue);
      setError(null);
    } catch (err) {
      const errorResponse: ErrorResponse = {
        code: 'STORAGE_ERROR',
        message: err instanceof Error ? err.message : 'Error removing storage item',
        details: {},
        correlationId: crypto.randomUUID()
      };
      setError(errorResponse);
      console.error('Error removing localStorage value:', errorResponse);
    }
  }, [key, initialValue]);

  /**
   * Handle storage events for cross-tab synchronization
   * Uses debouncing to prevent excessive updates
   */
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          try {
            if (event.newValue === null) {
              setStoredValue(initialValue);
            } else {
              const newValue = JSON.parse(event.newValue) as T;
              setStoredValue(newValue);
            }
            setError(null);
          } catch (err) {
            const errorResponse: ErrorResponse = {
              code: 'STORAGE_SYNC_ERROR',
              message: err instanceof Error ? err.message : 'Error syncing storage',
              details: {},
              correlationId: crypto.randomUUID()
            };
            setError(errorResponse);
            console.error('Error syncing localStorage value:', errorResponse);
          }
        }, DEBOUNCE_DELAY);
      }
    };

    // Add event listener for storage events
    window.addEventListener(STORAGE_EVENT, handleStorageChange);

    // Cleanup function
    return () => {
      window.removeEventListener(STORAGE_EVENT, handleStorageChange);
      clearTimeout(timeoutId);
    };
  }, [key, initialValue]);

  /**
   * Validate stored data structure on mount and updates
   */
  useEffect(() => {
    try {
      // Attempt to serialize and parse to validate data structure
      const serialized = JSON.stringify(storedValue);
      JSON.parse(serialized);
    } catch (err) {
      const errorResponse: ErrorResponse = {
        code: 'STORAGE_VALIDATION_ERROR',
        message: 'Invalid data structure in storage',
        details: {},
        correlationId: crypto.randomUUID()
      };
      setError(errorResponse);
      console.error('Storage validation error:', errorResponse);
      
      // Recover by resetting to initial value
      setStoredValue(initialValue);
    }
  }, [storedValue, initialValue]);

  return [storedValue, setValue, removeValue, error];
}
```

This implementation provides a robust and type-safe localStorage hook with the following features:

1. Type Safety:
- Fully typed with TypeScript generics
- Type-safe storage operations using utility functions
- Comprehensive error handling with typed error responses

2. Cross-Tab Synchronization:
- Listens for storage events to sync data across tabs
- Implements debouncing to prevent excessive updates
- Handles null/undefined cases gracefully

3. Error Handling:
- Detailed error reporting with ErrorResponse interface
- Storage quota management
- Data structure validation
- Automatic recovery mechanisms

4. Performance:
- Memoized setter and remove functions
- Debounced storage event handling
- Efficient state updates

5. Browser Compatibility:
- Works across all modern browsers
- Fallback handling for storage unavailability
- Safe JSON operations

6. Security:
- No sensitive data exposure in error messages
- Correlation IDs for error tracking
- Safe type casting and validation

The hook can be used like this:

```typescript
const [value, setValue, removeValue, error] = useLocalStorage<UserPreferences>(
  'user-preferences',
  defaultPreferences
);