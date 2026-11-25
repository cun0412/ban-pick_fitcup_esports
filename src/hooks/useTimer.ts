import { useEffect, useRef, useCallback, useState } from 'react';

export function useTimer(maxSeconds: number, onExpire?: () => void) {
  const [seconds, setSeconds] = useState(maxSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const expireCbRef = useRef(onExpire);
  expireCbRef.current = onExpire;

  const start = useCallback(() => setRunning(true), []);
  const pause = useCallback(() => setRunning(false), []);
  const reset = useCallback((newMax?: number) => {
    setRunning(false);
    setSeconds(newMax ?? maxSeconds);
  }, [maxSeconds]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          setRunning(false);
          expireCbRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  return { seconds, running, start, pause, reset, setSeconds };
}
