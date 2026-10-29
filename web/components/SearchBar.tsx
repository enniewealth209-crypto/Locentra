"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

interface Props {
  onSearch: (query: string) => void;
  suggestions: string[];
  onQueryChange: (q: string) => void;
  loading: boolean;
  initialValue?: string;
}

export default function SearchBar({
  onSearch,
  suggestions,
  onQueryChange,
  loading,
  initialValue = "",
}: Props) {
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  /* sync external value changes (e.g. clicking history) */
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  /* close popup on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setValue(v);
      onQueryChange(v);
      setHighlighted(-1);
      setOpen(v.trim().length > 0);
    },
    [onQueryChange]
  );

  const commit = useCallback(
    (name: string) => {
      setValue(name);
      setOpen(false);
      setHighlighted(-1);
      onSearch(name);
    },
    [onSearch]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) {
      if (e.key === "Enter") commit(value);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted >= 0) {
        commit(suggestions[highlighted]);
      } else {
        commit(value);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const clear = () => {
    setValue("");
    onQueryChange("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const showSuggestions = open && suggestions.length > 0;

  return (
    <div ref={wrapRef} className="relative w-full">
      {/* Input row */}
      <div
        className={cn(
          "glow-ring flex items-center gap-3 rounded-2xl px-4 py-3",
          "glass transition-all duration-200"
        )}
      >
        {loading ? (
          <Loader2 size={20} className="shrink-0 animate-spin" />
        ) : (
          <Search size={20} className="shrink-0" />
        )}

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => value.trim() && suggestions.length > 0 && setOpen(true)}
          placeholder="Search any country…"
          autoComplete="off"
          spellCheck={false}
          className="flex-1 bg-transparent text-base outline-none"
        />

        <AnimatePresence>
          {value && (
            <motion.button
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.15 }}
              onClick={clear}
              className="shrink-0 rounded-full p-1 hover:bg-white/10 transition-colors "aria-label="Clear search"
            >
              <X size={16} />
            </motion.button>
          )}
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => commit(value)}
          disabled={!value.trim() || loading}
          className="shrink-0 rounded-xl px-4 py-1.5 text-sm font-semibold hover:disabled:opacity-40 disabled:cursor-not-allowed
          transition-colors text-black bg"
        >
          Search
        </motion.button>
      </div>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {showSuggestions && (
          <motion.ul
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 mt-2 w-full rounded-2xl bg-white glass-elevated
                       overflow-hidden shadow-2xl shadow-black/40"
            role="listbox"
          >
            {suggestions.map((s, i) => (
              <motion.li
                key={s}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                role="option"
                aria-selected={i === highlighted}
                onMouseDown={() => commit(s)}
                onMouseEnter={() => setHighlighted(i)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 cursor-pointer text-sm transition-colors",
                  i === highlighted
                    ? "bg-[var(--accent-glow)] text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-white/5"
                )}
              >
                <Search size={14} className="shrink-0 text-[var(--text-muted)]" />
                {s}
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
