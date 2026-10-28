"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Globe, AlertCircle } from "lucide-react";

import SearchBar from "../components/SearchBar";
import CountryCard from "../components/CountryCard";
import HistorySidebar from "../components/HistorySidebar";
import EmptyState from "../components/EmptyState";
import { fetchCountries, fetchSuggestions, fetchCountry, fetchExtra } from "../lib/api";
import type { CountryRecord, ExtraInfo } from "../lib/api";

export default function HomePage() {
  /* ── search state ─────────────────────────────────────────────────────── */
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── result state ─────────────────────────────────────────────────────── */
  const [country, setCountry] = useState<CountryRecord | null>(null);
  const [extra, setExtra] = useState<ExtraInfo | null>(null);
  const [extraLoading, setExtraLoading] = useState(false);

  /* ── history ──────────────────────────────────────────────────────────── */
  const [history, setHistory] = useState<string[]>([]);
  const [countries, setCountries] = useState<CountryRecord[]>([]);
  const [countriesError, setCountriesError] = useState(false);

  /* Generation counter — prevents stale async results overwriting newer ones */
  const genRef = useRef(0);

  /* Debounce suggestions */
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchCountries()
      .then(setCountries)
      .catch(() => setCountriesError(true));
  }, []);

  const handleQueryChange = useCallback((q: string) => {
    setQuery(q);
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (!q.trim()) { setSuggestions([]); return; }
    suggestTimer.current = setTimeout(async () => {
      const hits = await fetchSuggestions(q);
      setSuggestions(hits);
    }, 120);
  }, []);

  const handleSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;

    setSuggestions([]);
    setError(null);
    setSearching(true);
    setCountry(null);
    setExtra(null);

    const gen = ++genRef.current;

    try {
      const result = await fetchCountry(trimmed);
      if (gen !== genRef.current) return; // superseded

      if (!result) {
        setError(`No country found for "${trimmed}". Check the spelling.`);
        setSearching(false);
        return;
      }

      setCountry(result);
      setSearching(false);

      // Add to history (deduplicated, newest first)
      setHistory((prev) => {
        const next = [result.name, ...prev.filter((n) => n !== result.name)];
        return next.slice(0, 12);
      });

      // Fetch enrichment asynchronously
      if (result.country_code) {
        setExtraLoading(true);
        const enriched = await fetchExtra(result.country_code);
        if (gen === genRef.current) {
          setExtra(enriched);
          setExtraLoading(false);
        }
      }
    } catch {
      if (gen === genRef.current) {
        setError("Could not reach the API. Make sure the backend is running on port 8000.");
        setSearching(false);
      }
    }
  }, []);

  /* Keyboard shortcut: "/" focuses search */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      {/* Animated mesh background */}
      <div className="mesh-bg" aria-hidden />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* ── Nav ─────────────────────────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between px-6 py-4
                     border-b border-[var(--border)] glass sticky top-0 z-20"
        >
          <div className="flex items-center gap-2.5">
            <Globe size={22} className="text-[var(--accent)]" />
            <span className="font-bold text-base text-[var(--text-primary)] tracking-tight">
              Locentra
            </span>
          </div>
          <span className="stat-badge rounded-full px-3 py-1 text-xs font-medium hidden sm:block">
            {countries.length || "..."} countries
          </span>
        </motion.header>

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="px-6 pt-14 pb-8 text-center max-w-2xl mx-auto w-full"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.15, type: "spring", stiffness: 200 }}
            className="text-6xl mb-4 select-none"
          >
            🌍
          </motion.div>

          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-3">
            <span className="gradient-text">Explore Every Country</span>
          </h1>
          <p className="text-[var(--text-secondary)] text-base sm:text-lg mb-8">
            Capitals, populations, currencies, languages, timezones — all in one place.
          </p>

          {/* Search bar */}
          <SearchBar
            onSearch={handleSearch}
            suggestions={suggestions}
            onQueryChange={handleQueryChange}
            loading={searching}
            initialValue={query}
          />

          {/* Keyboard hint */}
          <p className="mt-3 text-[10px] text-[var(--text-muted)]">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">/</kbd> to focus search
          </p>
        </motion.section>

        {/* ── Main content ────────────────────────────────────────────────── */}
        <main className="flex-1 px-4 sm:px-6 pb-16 max-w-6xl mx-auto w-full">
          <div className="flex flex-col lg:flex-row gap-6 items-start">

            {/* Results / empty state — takes up remaining width */}
            <div className="flex-1 min-w-0">
              {/* Error banner */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-4
                               bg-[rgba(239,68,68,0.10)] border border-[rgba(239,68,68,0.25)]
                               text-[#fca5a5] text-sm"
                  >
                    <AlertCircle size={16} className="shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Skeleton while searching */}
              <AnimatePresence>
                {searching && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="glass-elevated rounded-3xl overflow-hidden"
                  >
                    <div className="px-7 pt-6 pb-4 border-b border-[var(--border)]">
                      <div className="shimmer h-8 w-48 mb-2 rounded-lg" />
                      <div className="shimmer h-4 w-24 rounded" />
                    </div>
                    <div className="grid md:grid-cols-[1fr_220px]">
                      <div className="px-7 py-5 space-y-4">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="flex items-center gap-4">
                            <div className="shimmer w-6 h-4 rounded" />
                            <div className="shimmer h-3 w-20 rounded" />
                            <div className="shimmer h-3 flex-1 max-w-xs rounded" />
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-center p-6
                                      border-t md:border-t-0 md:border-l border-[var(--border)]">
                        <div className="shimmer w-48 h-28 rounded-xl" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Country result */}
              <AnimatePresence mode="wait">
                {country && !searching && (
                  <CountryCard
                    key={country.name}
                    country={country}
                    extra={extra}
                    extraLoading={extraLoading}
                  />
                )}
              </AnimatePresence>

              {/* Empty state — shown when no search has been done */}
              <AnimatePresence>
                {!country && !searching && !error && (
                  <EmptyState
                    countries={countries}
                    error={countriesError}
                    onSelect={(name) => {
                      setQuery(name);
                      handleSearch(name);
                    }}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* History sidebar — only visible once there's history */}
            <AnimatePresence>
              {history.length > 0 && (
                <motion.aside
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.35 }}
                  className="lg:w-52 w-full shrink-0"
                >
                  <HistorySidebar
                    history={history}
                    onSelect={(name) => {
                      setQuery(name);
                      handleSearch(name);
                    }}
                    onClear={() => setHistory([])}
                    currentName={country?.name}
                  />
                </motion.aside>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <footer className="text-center pb-6 text-[10px] text-[var(--text-muted)]">
          Data from{" "}
          <a
            href="https://countries.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[var(--text-secondary)]"
          >
            countries.dev
          </a>
          {" · "}
          Flags from{" "}
          <a
            href="https://flagcdn.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[var(--text-secondary)]"
          >
            flagcdn.com
          </a>
        </footer>
      </div>
    </>
  );
}
