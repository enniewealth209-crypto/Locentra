import { useState } from "react";
import { motion } from "motion/react";
import type { CountryRecord } from "../lib/api";

interface Props {
  countries: CountryRecord[];
  error: boolean;
  onSelect: (name: string) => void;
}

export default function EmptyState({ countries, error, onSelect }: Props) {
  const [continent, setContinent] = useState("All continents");
  const continents = [...new Set(countries.map((country) => country.continent))].sort();
  const filteredCountries = countries.filter(
    (country) => continent === "All continents" || country.continent === continent
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="glass rounded-3xl px-6 py-8 sm:px-8"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Browse countries</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {countries.length} countries · {filteredCountries.length} shown
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <span>Region</span>
          <select
            value={continent}
            onChange={(event) => setContinent(event.target.value)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-[var(--text-primary)]"
          >
            <option>All continents</option>
            {continents.map((name) => <option key={name}>{name}</option>)}
          </select>
        </label>
      </div>

      {error ? (
        <p role="status" className="py-8 text-center text-sm text-[var(--text-secondary)]">
          Country list unavailable. Search by name to try the lookup API.
        </p>
      ) : countries.length === 0 ? (
        <p role="status" className="py-8 text-center text-sm text-[var(--text-secondary)]">
          Loading countries...
        </p>
      ) : (
        <ul className="grid max-h-80 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
          {filteredCountries.map((country) => (
            <li key={country.name}>
              <button
                onClick={() => onSelect(country.name)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-white/5 hover:text-[var(--text-primary)]"
              >
                <span>{country.name}</span>
                <span className="ml-3 text-xs text-[var(--text-muted)]">{country.capital}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
