import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for managing localStorage with SSR support and type safety.
 * Handles JSON serialization/deserialization automatically.
 *
 * @template T - The type of value to store
 * @param key - The localStorage key
 * @param initialValue - The initial value if key doesn't exist
 * @returns Tuple of [storedValue, setValue, removeValue]
 *
 * @example
 * // Basic usage
 * const [theme, setTheme, removeTheme] = useLocalStorage('theme', 'light');
 *
 * @example
 * // With object
 * interface UserPreferences {
 *   language: string;
 *   notifications: boolean;
 * }
 * const [prefs, setPrefs] = useLocalStorage<UserPreferences>('prefs', {
 *   language: 'en',
 *   notifications: true
 * });
 *
 * @example
 * // Remove value
 * const [token, setToken, removeToken] = useLocalStorage('authToken', null);
 * // Call removeToken() to delete from localStorage
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    // SSR guard: return initial value during server-side rendering
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      // Get from local storage by key
      const item = window.localStorage.getItem(key);

      // Parse stored json or return initialValue if item doesn't exist
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      // If error reading from localStorage, return initial value
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        // Allow value to be a function so we have same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;

        // Save state
        setStoredValue(valueToStore);

        // Save to local storage (only on client side)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));

          // Dispatch storage event to sync across tabs
          window.dispatchEvent(new StorageEvent('storage', {
            key,
            newValue: JSON.stringify(valueToStore),
            storageArea: window.localStorage,
          }));
        }
      } catch (error) {
        // A more advanced implementation would handle the error case
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Function to remove value from localStorage
  const removeValue = useCallback(() => {
    try {
      // Remove from state
      setStoredValue(initialValue);

      // Remove from localStorage (only on client side)
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);

        // Dispatch storage event to sync across tabs
        window.dispatchEvent(new StorageEvent('storage', {
          key,
          newValue: null,
          storageArea: window.localStorage,
        }));
      }
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Listen for changes to this key in other tabs/windows
  useEffect(() => {
    // SSR guard
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.storageArea === window.localStorage) {
        try {
          // Update state if value changed in another tab
          const newValue = e.newValue ? (JSON.parse(e.newValue) as T) : initialValue;
          setStoredValue(newValue);
        } catch (error) {
          console.error(`Error parsing storage event for key "${key}":`, error);
        }
      }
    };

    // Listen for storage events
    window.addEventListener('storage', handleStorageChange);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

/**
 * Hook for managing sessionStorage with SSR support and type safety.
 * Similar to useLocalStorage but uses sessionStorage (cleared when tab closes).
 *
 * @template T - The type of value to store
 * @param key - The sessionStorage key
 * @param initialValue - The initial value if key doesn't exist
 * @returns Tuple of [storedValue, setValue, removeValue]
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    // SSR guard
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.sessionStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.error(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Error setting sessionStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);

      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(key);
      }
    } catch (error) {
      console.error(`Error removing sessionStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
