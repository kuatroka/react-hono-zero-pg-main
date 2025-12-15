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
}: {
  ms: number | null;
  source: string;
  className?: string;
}) {
  const label = ms == null ? "…" : formatLatencyMs(ms);

  return (
    <Badge
      variant="secondary"
      className={cn(
        "font-mono font-medium text-[11px] leading-none px-2 py-1",
        className
      )}
      title={ms == null ? source : `${source} (${formatLatencyMs(ms)})`}
    >
      {label} ({source})
    </Badge>
  );
}
