"use client";

import { motion, AnimatePresence } from "motion/react";
import { Clock, Trash2 } from "lucide-react";

interface Props {
  history: string[];
  onSelect: (name: string) => void;
  onClear: () => void;
  currentName?: string;
}

export default function HistorySidebar({
  history,
  onSelect,
  onClear,
  currentName,
}: Props) {
  if (history.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="glass rounded-2xl p-4 w-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
          <Clock size={12} />
          Recent
        </div>
        <button
          onClick={onClear}
          className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)]
                     hover:bg-white/5 transition-colors"
          title="Clear history"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Items */}
      <ul className="space-y-0.5">
        <AnimatePresence initial={false}>
          {history.map((name, i) => (
            <motion.li
              key={name}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ delay: i * 0.04, duration: 0.2 }}
            >
              <button
                onClick={() => onSelect(name)}
                className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-all duration-150
                  ${name === currentName
                    ? "bg-[var(--accent-glow)] text-[#93c5fd] border border-[rgba(59,130,246,0.25)]"
                    : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]"
                  }`}
              >
                {name}
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </motion.div>
  );
}
