import { useEffect, useRef, useState } from "react";

export function useLatencyMs({
  isReady,
  resetKey,
  enabled = true,
  minimumVisibleMs = 0.1,
}: {
  isReady: boolean;
  resetKey?: unknown;
  enabled?: boolean;
  minimumVisibleMs?: number;
}) {
  const startRef = useRef<number | null>(null);
  const [ms, setMs] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    startRef.current = performance.now();
    setMs(null);
  }, [resetKey, enabled]);

  useEffect(() => {
    if (!enabled || !isReady || ms != null || startRef.current == null) {
      return;
    }

    const elapsedMs = performance.now() - startRef.current;
    setMs(Math.max(elapsedMs, minimumVisibleMs));
  }, [enabled, isReady, minimumVisibleMs, ms]);

  return ms;
}
