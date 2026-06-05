import { PLAN_COLORS } from "@/lib/plans";

interface PlanBadgeProps {
  planName: string | null | undefined;
  className?: string;
}

export default function PlanBadge({ planName, className = "" }: PlanBadgeProps) {
  const name = planName || "free";
  const displayName = name.charAt(0).toUpperCase() + name.slice(1);
  const color = PLAN_COLORS[name] || PLAN_COLORS.free;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}40`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {displayName}
    </span>
  );
}
