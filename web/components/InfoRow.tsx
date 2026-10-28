import { motion } from "motion/react";
import { cn } from "../lib/utils";

interface Props {
  icon: string;
  label: string;
  value: string | undefined;
  loading?: boolean;
  highlight?: string; // tailwind text colour class
  delay?: number;
}

export default function InfoRow({
  icon,
  label,
  value,
  loading = false,
  highlight,
  delay = 0,
}: Props) {
  const isEmpty = !value || value === "N/A";

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className="grid grid-cols-[1.6rem_8rem_1fr] items-start gap-2 py-2
                 border-b border-[var(--border)] last:border-0"
    >
      {/* Icon */}
      <span className="mt-0.5 text-base leading-none select-none">{icon}</span>

      {/* Label */}
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] pt-0.5">
        {label}
      </span>

      {/* Value */}
      {loading ? (
        <div className="shimmer h-4 w-32 mt-0.5" />
      ) : isEmpty ? (
        <span className="text-sm text-[var(--text-muted)] italic">—</span>
      ) : (
        <span
          className={cn(
            "text-sm leading-snug break-words",
            highlight ?? "text-[var(--text-primary)]"
          )}
        >
          {value}
        </span>
      )}
    </motion.div>
  );
}
