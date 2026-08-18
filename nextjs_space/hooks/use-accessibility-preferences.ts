'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'lucky-tycoon-accessibility';

export function useAccessibilityPreferences() {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
      setHighContrast(stored.highContrast === true);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ highContrast }));
    } catch {}
    return () => document.documentElement.classList.remove('high-contrast');
  }, [highContrast]);

  return {
    highContrast,
    toggleHighContrast: () => setHighContrast((current) => !current),
  };
}
