import { useState, useEffect } from 'react'; // v18.0.0

/**
 * A generic hook that provides debounced value updates with configurable delay.
 * Optimized for React 18's concurrent mode and performance-critical scenarios.
 * 
 * @template T - The type of value being debounced
 * @param {T} value - The value to debounce
 * @param {number} delay - The delay in milliseconds before updating the debounced value
 * @returns {T} The debounced value
 * 
 * @example
 * // Usage with search input
 * const searchTerm = "example";
 * const debouncedSearch = useDebounce(searchTerm, 300);
 * 
 * @example
 * // Usage with real-time updates
 * const statusUpdate = { id: 1, status: "active" };
 * const debouncedStatus = useDebounce(statusUpdate, 500);
 */
const useDebounce = <T>(value: T, delay: number): T => {
  // Initialize state with the initial value
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Store timeout ID for cleanup
    let timeoutId: NodeJS.Timeout;

    // Check if document is visible to optimize for tab switching
    const isDocumentVisible = !document.hidden;

    if (isDocumentVisible) {
      timeoutId = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
    } else {
      // If document is hidden, update immediately to prevent stale data
      setDebouncedValue(value);
    }

    // Cleanup function to prevent memory leaks and handle component unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [value, delay]); // Only re-run effect if value or delay changes

  return debouncedValue;
};

export default useDebounce;