"use client";

import { useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { LocateFixed, Minus, Plus } from "lucide-react";

import type { CountryRecord } from "../lib/api";

interface Props {
  countries: CountryRecord[];
  selectedCountry: CountryRecord | null;
  onSelect: (country: CountryRecord) => void;
}

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function buildMatchSet(countryName: string) {
  const values = new Set<string>();
  const raw = countryName.trim();
  if (!raw) return values;

  values.add(raw);
  values.add(raw.replace(/\s*\(.*?\)\s*/g, "").trim());

  const aliases: Record<string, string[]> = {
    "Congo (Republic)": ["Republic of the Congo"],
    "Congo (Democratic Republic)": ["Democratic Republic of the Congo"],
    "Côte d'Ivoire": ["Ivory Coast"],
    "Czechia": ["Czech Republic"],
    "Eswatini": ["Swaziland"],
    "Ivory Coast": ["Côte d'Ivoire"],
    "North Macedonia": ["Macedonia"],
    "Republic of the Congo": ["Congo (Republic)"],
    "Democratic Republic of the Congo": ["Congo (Democratic Republic)"],
    "United States": ["United States of America"],
    "United States of America": ["United States"],
    "Türkiye": ["Turkey"],
    "Turkey": ["Türkiye"],
    "Micronesia": ["Federated States of Micronesia"],
    "Federated States of Micronesia": ["Micronesia"],
    "The Bahamas": ["Bahamas"],
    "Bahamas": ["The Bahamas"],
    "Timor-Leste": ["East Timor"],
    "East Timor": ["Timor-Leste"],
    "Cape Verde": ["Cabo Verde"],
    "Cabo Verde": ["Cape Verde"],
  };

  const altList = aliases[raw] ?? [];
  altList.forEach((value) => values.add(value));

  return values;
}

export default function WorldMapPanel({ countries, selectedCountry, onSelect }: Props) {
  const [zoom, setZoom] = useState(1);

  const countryLookup = useMemo(() => {
    const lookup = new Map<string, CountryRecord>();
    countries.forEach((country) => {
      const names = buildMatchSet(country.name);
      names.forEach((value) => lookup.set(normalizeName(value), country));
    });
    return lookup;
  }, [countries]);

  const selectedKey = selectedCountry ? normalizeName(selectedCountry.name) : "";

  const findMatch = (geoName: string) => {
    const geoKey = normalizeName(geoName);
    if (!geoKey) return null;

    if (countryLookup.has(geoKey)) {
      return countryLookup.get(geoKey) ?? null;
    }

    for (const [key, country] of countryLookup.entries()) {
      if (key.includes(geoKey) || geoKey.includes(key)) {
        return country;
      }
    }

    return null;
  };

  return (
    <div className="atlas-map panel">
      <div className="flex items-center justify-between px-5 pb-4 pt-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--secondary-text)]">
            World map
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
            Geographic atlas
          </h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--secondary-text)]">
          <LocateFixed size={12} />
          {selectedCountry ? selectedCountry.name : "No country selected"}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--map-water)]">
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setZoom((value) => Math.min(2.5, Number((value + 0.2).toFixed(2))))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[rgba(255,255,255,0.75)] text-[var(--text-primary)] shadow-sm transition hover:bg-white"
            aria-label="Zoom in"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            onClick={() => setZoom((value) => Math.max(1, Number((value - 0.2).toFixed(2))))}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[rgba(255,255,255,0.75)] text-[var(--text-primary)] shadow-sm transition hover:bg-white"
            aria-label="Zoom out"
          >
            <Minus size={16} />
          </button>
        </div>

        <ComposableMap projection="geoEqualEarth" className="h-[540px] w-full">
          <ZoomableGroup center={[0, 12]} zoom={zoom}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const geoName = String((geo.properties as { name?: string }).name ?? "");
                  const countryMatch = findMatch(geoName);
                  const isSelected = !!countryMatch && normalizeName(countryMatch.name) === selectedKey;

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onClick={() => {
                        if (countryMatch) onSelect(countryMatch);
                      }}
                      style={{
                        default: {
                          fill: isSelected ? "#315C46" : "#E5E8DC",
                          stroke: "#F7F6F2",
                          strokeWidth: isSelected ? 0.8 : 0.42,
                          outline: "none",
                          cursor: countryMatch ? "pointer" : "default",
                        },
                        hover: {
                          fill: isSelected ? "#264A37" : "#DDE3D5",
                          stroke: "#F7F6F2",
                          strokeWidth: 0.8,
                          outline: "none",
                        },
                        pressed: {
                          fill: "#264A37",
                          stroke: "#F7F6F2",
                          strokeWidth: 0.8,
                          outline: "none",
                        },
                      } as any}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
      </div>
    </div>
  );
}
