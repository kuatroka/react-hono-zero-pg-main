import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function formatLatencyMs(ms: number) {
  if (!Number.isFinite(ms)) return "—";
  if (ms < 10) return `${ms.toFixed(2)}ms`;
  if (ms < 100) return `${ms.toFixed(1)}ms`;
  return `${ms.toFixed(0)}ms`;
}

export function LatencyBadge({
  ms,
  source,
  className,
  label,
  renderMs,
}: {
  ms: number | null;
  source: string;
  className?: string;
  label?: string;
  renderMs?: number | null;
}) {
  const valueLabel = ms == null ? "…" : formatLatencyMs(ms);
  const renderLabel = renderMs == null ? '…' : formatLatencyMs(renderMs);
  const shortSource = source.replace(/^Zero: /, 'zero.').split('.', 2).join('.');
  const badgeLabel = renderMs !== undefined
    ? `${shortSource} - data: ${valueLabel} - render: ${renderLabel}`
    : label
      ? `${shortSource} - ${label}: ${valueLabel}`
      : `${shortSource}: ${valueLabel}`;

  return (
    <Badge
      variant="secondary"
      className={cn(
        "font-mono font-medium text-[11px] leading-none px-2 py-1",
        className
      )}
      title={ms == null ? source : `${source} (${formatLatencyMs(ms)})`}
    >
      {badgeLabel}
    </Badge>
  );
}
