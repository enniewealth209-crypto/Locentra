"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  Copy, Download, Map, CheckCheck,
} from "lucide-react";
import InfoRow from "./InfoRow";
import FlagPanel from "./FlagPanel";
import type { CountryRecord, ExtraInfo } from "../lib/api";

interface Props {
  country: CountryRecord;
  extra: ExtraInfo | null;
  extraLoading: boolean;
}

function fmtPop(raw: string): string {
  const n = parseInt(raw.replace(/,/g, ""), 10);
  if (isNaN(n)) return raw;
  return n.toLocaleString();
}

export default function CountryCard({ country, extra, extraLoading }: Props) {
  const [copied, setCopied] = useState(false);

  const copyInfo = async () => {
    const lines = [
      `Country:    ${country.name}`,
      `Capital:    ${country.capital}`,
      `Continent:  ${country.continent}`,
      `Population: ${fmtPop(country.population)}`,
    ];
    if (extra?.area && extra.area !== "N/A") lines.push(`Area:       ${extra.area}`);
    if (extra?.currency && extra.currency !== "N/A") lines.push(`Currency:   ${extra.currency}`);
    if (extra?.language && extra.language !== "N/A") lines.push(`Language:   ${extra.language}`);
    if (extra?.timezone && extra.timezone !== "N/A") lines.push(`Timezone:   ${extra.timezone}`);
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const exportJson = () => {
    const data = { ...country, ...extra };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${country.name.toLowerCase().replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openMaps = () => {
    const q = encodeURIComponent(country.name);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank");
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 28 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="glass-elevated rounded-3xl overflow-hidden"
    >
      {/* Header strip */}
      <div className="relative px-7 pt-6 pb-4 border-b border-[var(--border)]">
        <div className="absolute inset-0 opacity-10"
          style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }} />
        <motion.h2
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="relative text-3xl font-bold gradient-text"
        >
          {country.name}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative mt-0.5 text-sm text-[var(--text-secondary)]"
        >
          {country.continent}
        </motion.p>
      </div>

      {/* Body */}
      <div className="grid md:grid-cols-[1fr_220px] gap-0">
        {/* Info column */}
        <div className="px-7 py-5 space-y-0">
          <InfoRow icon="🏛️" label="Capital" value={country.capital} delay={0.05} />
          <InfoRow icon="🌍" label="Continent" value={country.continent} delay={0.10} highlight="text-[#60a5fa]" />
          <InfoRow icon="👥" label="Population" value={fmtPop(country.population)} delay={0.15} highlight="text-[#34d399]" />
          <InfoRow icon="📐" label="Area" value={extra?.area} loading={extraLoading} delay={0.20} />
          <InfoRow icon="💱" label="Currency" value={extra?.currency} loading={extraLoading} delay={0.25} />
          <InfoRow icon="🗣️" label="Language" value={extra?.language} loading={extraLoading} delay={0.30} />
          <InfoRow icon="🕐" label="Timezone" value={extra?.timezone} loading={extraLoading} delay={0.35} />

          {/* Action buttons */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="flex flex-wrap gap-2 pt-5"
          >
            <button
              onClick={copyInfo}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium
                         bg-white/5 hover:bg-white/10 border border-white/10
                         text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                         transition-all duration-150"
            >
              {copied ? <CheckCheck size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy Info"}
            </button>

            <button
              onClick={exportJson}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium
                         bg-white/5 hover:bg-white/10 border border-white/10
                         text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                         transition-all duration-150"
            >
              <Download size={14} />
              Export JSON
            </button>

            <button
              onClick={openMaps}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium
                         bg-[var(--accent-glow)] hover:bg-[rgba(59,130,246,0.3)]
                         border border-[rgba(59,130,246,0.3)]
                         text-[#93c5fd] hover:text-white
                         transition-all duration-150"
            >
              <Map size={14} />
              Open in Maps
            </button>
          </motion.div>
        </div>

        {/* Flag column */}
        <div className="flex items-start justify-center px-5 py-5
                        border-t md:border-t-0 md:border-l border-[var(--border)]">
          <FlagPanel
            code={country.country_code}
            name={country.name}
            loading={false}
          />
        </div>
      </div>
    </motion.div>
  );
}
