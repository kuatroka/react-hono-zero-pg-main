import { Badge } from "@/components/ui/badge";
import {
  createLegacyPerfTelemetry,
  type PerfTelemetry,
} from "@/lib/perf/telemetry";
import { cn } from "@/lib/utils";

export function LatencyBadge({
  ms,
  source,
  className,
  label,
  renderMs,
  telemetry,
}: {
  ms?: number | null;
  source?: string;
  className?: string;
  label?: string;
  renderMs?: number | null;
  telemetry?: PerfTelemetry | null;
}) {
  const resolvedTelemetry = telemetry ?? createLegacyPerfTelemetry({
    label,
    ms: ms ?? null,
    renderMs,
    source: source ?? 'api:pg',
  });
  const { ms: resolvedMs, primaryLine, secondaryLine } = resolvedTelemetry;

  return (
    <Badge
      variant="secondary"
      className={cn(
        "font-mono font-medium text-[11px] leading-none px-2 py-1 shrink-0 whitespace-nowrap",
        secondaryLine ? 'flex flex-col items-start gap-0.5 py-1.5 leading-tight whitespace-nowrap' : undefined,
        className
      )}
      title={resolvedMs == null ? primaryLine : `${primaryLine} (${resolvedMs.toFixed(2)}ms)`}
    >
      <span>{primaryLine}</span>
      {secondaryLine ? <span>{secondaryLine}</span> : null}
    </Badge>
  );
}
