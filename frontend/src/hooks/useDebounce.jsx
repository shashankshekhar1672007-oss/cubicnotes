import { useState, useEffect } from "react";

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms
 * of no further changes. Perfect for auto-saving notes as the user types
 * without hammering the API on every keystroke.
 *
 * Usage:
 *   const debouncedContent = useDebounce(content, 800);
 *   useEffect(() => { saveNote(debouncedContent) }, [debouncedContent]);
 */
export const useDebounce = (value, delay = 600) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};
