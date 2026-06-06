import { useState, useEffect, useCallback, useRef } from "react";

function toLocalISOString(date: Date): string {
  const tz = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tz).toISOString().slice(0, 19);
}

function currentLocalDateTime(): string {
  return toLocalISOString(new Date());
}

export interface RealTimeClock {
  value: string;
  onChange: (next: string) => void;
  reset: () => void;
  isManuallyEdited: boolean;
}

export function useRealTimeClock(initial?: string): RealTimeClock {
  const [value, setValue] = useState<string>(() => initial ?? currentLocalDateTime());
  const [isManuallyEdited, setIsManuallyEdited] = useState<boolean>(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isManuallyEdited) {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const tick = () => {
      setValue(currentLocalDateTime());
    };

    tick();
    intervalRef.current = window.setInterval(tick, 1000);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isManuallyEdited]);

  const onChange = useCallback((next: string) => {
    setValue(next);
    if (next === "" || next === null || next === undefined) {
      setIsManuallyEdited(false);
    } else {
      setIsManuallyEdited(true);
    }
  }, []);

  const reset = useCallback(() => {
    setValue(currentLocalDateTime());
    setIsManuallyEdited(false);
  }, []);

  return { value, onChange, reset, isManuallyEdited };
}
