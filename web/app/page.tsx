"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Compass, MapPinned, Search, SlidersHorizontal, X } from "lucide-react";

import CountryCard from "../components/CountryCard";
import SearchBar from "../components/SearchBar";
import WorldMapPanel from "../components/WorldMapPanel";
import { fetchCountries, fetchCountry, fetchExtra, fetchSuggestions } from "../lib/api";
import type { CountryRecord, ExtraInfo } from "../lib/api";

const ALL_REGIONS = "All regions";

export default function HomePage() {
  const [countries, setCountries] = useState<CountryRecord[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<CountryRecord | null>(null);
  const [extra, setExtra] = useState<ExtraInfo | null>(null);
  const [extraLoading, setExtraLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [regionFilter, setRegionFilter] = useState<string>(ALL_REGIONS);
  const [error, setError] = useState<string | null>(null);
  const [countriesError, setCountriesError] = useState(false);

  useEffect(() => {
    fetchCountries()
      .then((items) => setCountries(items))
      .catch(() => setCountriesError(true));
  }, []);

  const regions = useMemo(
    () => [...new Set(countries.map((country) => country.continent))].sort(),
    [countries]
  );

  const filteredResults = useMemo(() => {
    const term = query.trim().toLowerCase();

    return countries.filter((country) => {
      const matchesRegion = regionFilter === ALL_REGIONS || country.continent === regionFilter;
      if (!matchesRegion) return false;
      if (!term) return true;

      const haystack = `${country.name} ${country.capital}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [countries, query, regionFilter]);

  const loadExtraData = useCallback(async (countryRecord: CountryRecord) => {
    setExtraLoading(true);
    try {
      const enriched = await fetchExtra(countryRecord.country_code);
      setExtra(enriched);
    } catch {
      setExtra({ area: "N/A", currency: "N/A", language: "N/A", timezone: "N/A" });
    } finally {
      setExtraLoading(false);
    }
  }, []);

  const selectCountryRecord = useCallback(
    async (countryRecord: CountryRecord) => {
      setSelectedCountry(countryRecord);
      setQuery(countryRecord.name);
      setError(null);
      setSuggestions([]);
      await loadExtraData(countryRecord);
    },
    [loadExtraData]
  );

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const matches = await fetchSuggestions(value);
        setSuggestions(matches);
      } catch {
        setSuggestions([]);
      }
    }, 120);

    return () => window.clearTimeout(timer);
  }, []);

  const handleSearch = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      setQuery(trimmed);
      setSuggestions([]);

      if (!trimmed) {
        setError(null);
        setSelectedCountry(null);
        setExtra(null);
        return;
      }

      setSearching(true);
      setError(null);

      const candidates = countries.filter(
        (country) =>
          (regionFilter === ALL_REGIONS || country.continent === regionFilter) &&
          (`${country.name} ${country.capital}`.toLowerCase().includes(trimmed.toLowerCase()))
      );

      const exact =
        candidates.find((country) => country.name.toLowerCase() === trimmed.toLowerCase()) ??
        candidates[0] ??
        countries.find((country) => country.name.toLowerCase() === trimmed.toLowerCase()) ??
        countries.find((country) => country.capital.toLowerCase() === trimmed.toLowerCase());

      try {
        const result = exact ?? (await fetchCountry(trimmed));
        if (!result) {
          setError(`No country match for “${trimmed}”. Try a different spelling.`);
          setSearching(false);
          return;
        }

        await selectCountryRecord(result);
      } catch {
        setError("Could not reach the API. Please ensure the backend is running on port 8000.");
      } finally {
        setSearching(false);
      }
    },
    [countries, regionFilter, selectCountryRecord]
  );

  const clearFilters = useCallback(() => {
    setQuery("");
    setSuggestions([]);
    setRegionFilter(ALL_REGIONS);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('input[type="text"]')?.focus();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="atlas-shell">
      <header className="topbar">
        <div className="brand-mark">
          <div className="brand-icon">
            <Compass size={16} />
          </div>
          <span>Locentra</span>
        </div>
        <div className="topbar-meta">
          <span className="meta-chip">{countries.length || "..."} countries</span>
          <span className="meta-chip subtle">Atlas</span>
        </div>
      </header>

      <main className="workspace-panel">
        <aside className="search-rail panel">
          <div className="section-label-row">
            <span className="section-label">Explore</span>
            <span className="section-count">{filteredResults.length} results</span>
          </div>

          <SearchBar
            onSearch={handleSearch}
            suggestions={suggestions}
            onQueryChange={handleQueryChange}
            loading={searching}
            initialValue={query}
          />

          <div className="toolbar">
            <label className="filter-wrap">
              <SlidersHorizontal size={14} />
              <select
                aria-label="Filter by continent"
                value={regionFilter}
                onChange={(event) => setRegionFilter(event.target.value)}
              >
                <option value={ALL_REGIONS}>{ALL_REGIONS}</option>
                {regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </label>

            {(query || regionFilter !== ALL_REGIONS) && (
              <button type="button" className="clear-button" onClick={clearFilters}>
                <X size={14} />
                Clear
              </button>
            )}
          </div>

          <div className="list-header">
            <span>Countries</span>
            <span>{filteredResults.length}</span>
          </div>

          {error && <div className="status-banner error">{error}</div>}

          {countriesError ? (
            <div className="empty-panel">
              Country data is unavailable. Please check the backend connection.
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="empty-panel">
              <Search size={18} />
              <p>No matches in this region.</p>
              <button type="button" className="ghost-button" onClick={clearFilters}>
                Reset search
              </button>
            </div>
          ) : (
            <ul className="country-list">
              {filteredResults.map((country) => (
                <li key={country.name}>
                  <button
                    type="button"
                    className={selectedCountry?.name === country.name ? "country-item active" : "country-item"}
                    onClick={() => void selectCountryRecord(country)}
                  >
                    <span className="flag-pill">{country.country_code.toUpperCase() || "•"}</span>
                    <span className="country-meta">
                      <strong>{country.name}</strong>
                      <small>{country.capital}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="map-column">
          <WorldMapPanel countries={countries} selectedCountry={selectedCountry} onSelect={selectCountryRecord} />

          <AnimatePresence mode="wait">
            {selectedCountry ? (
              <motion.div
                key={selectedCountry.name}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 14 }}
                transition={{ duration: 0.25 }}
              >
                <CountryCard country={selectedCountry} extra={extra} extraLoading={extraLoading} />
              </motion.div>
            ) : (
              <motion.div
                key="prompt"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 14 }}
                transition={{ duration: 0.25 }}
                className="panel empty-country-panel"
              >
                <MapPinned size={18} />
                <div>
                  <h3>Select a country</h3>
                  <p>Choose a country on the map or use the search panel to inspect its capital, population, currency and regional context.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
