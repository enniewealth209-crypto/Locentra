"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

interface Props {
  code: string;    // ISO alpha-2, e.g. "fr"
  name: string;
  loading: boolean;
}

export default function FlagPanel({ code, name, loading }: Props) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const flagUrl = code
    ? `https://flagcdn.com/w320/${code.toLowerCase()}.png`
    : null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 p-6",
        "rounded-2xl glass min-h-[180px]"
      )}
    >
      {/* Section label */}
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
        National Flag
      </p>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="shimmer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="shimmer w-48 h-28 rounded-xl"
          />
        ) : flagUrl && !imgError ? (
          <motion.div
            key={code}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: imgLoaded ? 1 : 0, scale: imgLoaded ? 1 : 0.92 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="relative"
          >
            {!imgLoaded && <div className="shimmer absolute inset-0 rounded-xl" />}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={flagUrl}
              alt={`Flag of ${name}`}
              width={192}
              height={120}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              className="w-48 rounded-xl shadow-lg shadow-black/40 object-cover"
            />
          </motion.div>
        ) : (
          <motion.div
            key="no-flag"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-1 text-[var(--text-muted)]"
          >
            <span className="text-4xl">🏳️</span>
            <span className="text-xs">Flag unavailable</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Country code badge */}
      {code && !loading && (
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="stat-badge rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-widest"
        >
          {code.toUpperCase()}
        </motion.span>
      )}
    </div>
  );
}
