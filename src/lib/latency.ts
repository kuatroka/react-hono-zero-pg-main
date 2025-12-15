import { useEffect, useRef, useState } from "react";

export function useLatencyMs({
  isReady,
  resetKey,
  enabled = true,
}: {
  isReady: boolean;
  resetKey?: unknown;
  enabled?: boolean;
}) {
  const startRef = useRef<number | null>(null);
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    startRef.current = performance.now();
    setMs(null);
  }, [resetKey, enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (startRef.current == null) {
      startRef.current = performance.now();
    }
    if (isReady && ms == null) {
      setMs(performance.now() - startRef.current);
    }
  }, [enabled, isReady, ms]);

  return ms;
}
