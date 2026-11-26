import { useEffect } from 'react';

export function useKeyboard(handlers: Record<string, () => void>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (e.ctrlKey && e.key === 'z') {
        if (isEditable) return;
        e.preventDefault();
        handlers['ctrl+z']?.();
        return;
      }
      if (e.key === 'Escape') {
        handlers['escape']?.();
        return;
      }
      if (e.key === ' ' || e.code === 'Space') {
        if (!isEditable) {
          e.preventDefault();
          handlers['space']?.();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handlers]);
}
