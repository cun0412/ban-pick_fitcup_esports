import { useEffect } from 'react';

export function useKeyboard(handlers: Record<string, () => void>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); handlers['ctrl+z']?.(); return; }
      if (e.key === 'Escape') { handlers['escape']?.(); return; }
      if (e.key === ' ' || e.code === 'Space') {
        if ((e.target as HTMLElement).tagName !== 'INPUT') {
          e.preventDefault(); handlers['space']?.();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlers]);
}
