import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Hook đồng hồ đếm ngược chuẩn theo mốc thời gian thực (deadline timestamp),
 * không bị trôi/lag khi tab chạy nền hoặc đồng bộ qua mạng.
 */
export function useTimer(maxSeconds: number, onExpire?: () => void) {
  const [seconds, setSeconds] = useState(maxSeconds);
  const [pausedSeconds, setPausedSeconds] = useState(maxSeconds);
  const [running, setRunning] = useState(false);
  const [deadline, setDeadline] = useState<number | null>(null);

  const deadlineRef = useRef<number | null>(null);
  const secondsRef = useRef(maxSeconds);
  secondsRef.current = seconds;
  const expireCbRef = useRef(onExpire);
  expireCbRef.current = onExpire;

  const start = useCallback(
    (overrideSeconds?: number) => {
      const base =
        overrideSeconds !== undefined
          ? overrideSeconds
          : secondsRef.current > 0
          ? secondsRef.current
          : maxSeconds;
      const dl = Date.now() + base * 1000;
      deadlineRef.current = dl;
      secondsRef.current = base;
      setDeadline(dl);
      setSeconds(base);
      setPausedSeconds(base);
      setRunning(true);
    },
    [maxSeconds]
  );

  const pause = useCallback(() => {
    const remain = deadlineRef.current
      ? Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000))
      : secondsRef.current;
    deadlineRef.current = null;
    secondsRef.current = remain;
    setDeadline(null);
    setRunning(false);
    setSeconds(remain);
    setPausedSeconds(remain);
  }, []);

  const reset = useCallback(
    (newMax?: number) => {
      const val = newMax ?? maxSeconds;
      deadlineRef.current = null;
      secondsRef.current = val;
      setDeadline(null);
      setRunning(false);
      setSeconds(val);
      setPausedSeconds(val);
    },
    [maxSeconds]
  );

  useEffect(() => {
    if (!running || !deadlineRef.current) return;

    const tick = () => {
      if (!deadlineRef.current) return;
      const remain = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      secondsRef.current = remain;
      setSeconds(remain);
      if (remain <= 0) {
        deadlineRef.current = null;
        setDeadline(null);
        setRunning(false);
        setPausedSeconds(0);
        expireCbRef.current?.();
      }
    };

    const id = window.setInterval(tick, 200);
    return () => clearInterval(id);
  }, [running]);

  return {
    seconds,
    pausedSeconds,
    running,
    deadline,
    start,
    pause,
    reset,
    setSeconds,
  };
}
