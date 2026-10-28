"""
CountryLogic — data layer for the Global Country Explorer.
Loads countries.csv and exposes search / suggestion / summary helpers.
Extra fields (area, currencies, languages, timezones) are fetched live
from countries.dev (free, no API key) using fetch_extra_info().
"""

from __future__ import annotations

import csv
import os
import sys

import requests

# Valid continent values; entries like "Europe/Asia" are mapped to both.
_CONTINENT_MAP: dict[str, str] = {
    "europe/asia": "Europe / Asia",
    "north america": "North America",
    "south america": "South America",
}


def _normalise_continent(raw: str) -> str:
    """Return a clean continent label."""
    stripped = raw.strip()
    return _CONTINENT_MAP.get(stripped.lower(), stripped)


def _get_data_path(filename: str) -> str:
    """Resolve the data directory whether running from source or frozen."""
    if getattr(sys, "frozen", False):
        base = os.path.dirname(sys.executable)
    else:
        base = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base, "data", filename)


def _clean(row: dict, key: str, default: str = "N/A") -> str:
    """Return a stripped, non-empty value from a CSV row or *default*."""
    val = row.get(key) or ""
    return val.strip() or default


class CountryLogic:
    """All data-access and business logic for the Country Lookup System."""

    def __init__(self) -> None:
        # _countries: normalised-name → record dict
        self._countries: dict[str, dict] = {}
        # country_names: display names in original casing, insertion order
        self.country_names: list[str] = []
        self._load_data()

    # ------------------------------------------------------------------
    # Data loading
    # ------------------------------------------------------------------

    def _load_data(self) -> None:
        path = _get_data_path("countries.csv")
        if not os.path.exists(path):
            raise FileNotFoundError(f"Data file not found: {path}")

        with open(path, newline="", encoding="utf-8") as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                name = _clean(row, "Country", "")
                if not name:
                    continue

                record: dict = {
                    "name":         name,
                    "capital":      _clean(row, "Capital"),
                    "continent":    _normalise_continent(_clean(row, "Continent")),
                    "population":   _clean(row, "Population"),
                    "country_code": _clean(row, "Country Code", "").lower(),
                    # Optional columns — gracefully absent in the current CSV
                    "area":         _clean(row, "Area (km2)"),
                    "currency":     _clean(row, "Currency"),
                    "language":     _clean(row, "Language"),
                    "timezone":     _clean(row, "Timezone"),
                }

                key = name.lower()
                # Avoid duplicates (some CSVs have repeated entries)
                if key not in self._countries:
                    self._countries[key] = record
                    self.country_names.append(name)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_country_info(self, query: str) -> dict | None:
        """
        Case-insensitive lookup. Priority: exact → starts-with → contains.
        Returns None when no match is found.
        """
        q = query.strip().lower()
        if not q:
            return None

        if q in self._countries:
            return self._countries[q]

        for key, data in self._countries.items():
            if key.startswith(q):
                return data

        for key, data in self._countries.items():
            if q in key:
                return data

        return None

    def get_suggestions(self, query: str, limit: int = 8) -> list[str]:
        """
        Return up to *limit* display names matching *query*.
        Starts-with results appear before contains results.
        """
        q = query.strip().lower()
        if not q:
            return []

        starts   = [n for n in self.country_names if n.lower().startswith(q)]
        contains = [n for n in self.country_names
                    if q in n.lower() and not n.lower().startswith(q)]
        return (starts + contains)[:limit]

    def get_all_countries(self) -> list[str]:
        return list(self.country_names)

    def get_continent_summary(self) -> dict[str, int]:
        """Return {continent_label: count} sorted alphabetically."""
        summary: dict[str, int] = {}
        for data in self._countries.values():
            c = data["continent"]
            summary[c] = summary.get(c, 0) + 1
        return dict(sorted(summary.items()))

    def fetch_extra_info(self, country_code: str) -> dict:
        """
        Fetch area, currency, languages and timezones from countries.dev.
        Returns a dict with keys: area, currency, language, timezone.
        All values are human-readable strings.
        Falls back to "N/A" per field on any error.
        """
        result = {
            "area":     "N/A",
            "currency": "N/A",
            "language": "N/A",
            "timezone": "N/A",
        }

        if not country_code:
            return result

        try:
            url = f"https://countries.dev/alpha/{country_code.strip().lower()}"
            resp = requests.get(url, timeout=6)
            resp.raise_for_status()
            data = resp.json()

            # ── Area ──────────────────────────────────────────────────────────
            area = data.get("area")
            if area is not None:
                result["area"] = f"{int(area):,} km²"

            # ── Currencies ────────────────────────────────────────────────────
            currencies = data.get("currencies") or []
            if currencies:
                parts = []
                for c in currencies:
                    name   = c.get("name", "")
                    symbol = c.get("symbol", "")
                    code   = c.get("code", "")
                    if name and symbol:
                        parts.append(f"{name} ({symbol})")
                    elif name:
                        parts.append(name)
                    elif code:
                        parts.append(code)
                if parts:
                    result["currency"] = ", ".join(parts)

            # ── Languages ─────────────────────────────────────────────────────
            languages = data.get("languages") or []
            if languages:
                lang_names = [lg.get("name", "") for lg in languages if lg.get("name")]
                if lang_names:
                    result["language"] = ", ".join(lang_names)

            # ── Timezones ─────────────────────────────────────────────────────
            timezones = data.get("timezones") or []
            if timezones:
                # Show up to 3 timezones; append "& N more" if there are many
                display = timezones[:3]
                extra   = len(timezones) - 3
                tz_str  = ", ".join(display)
                if extra > 0:
                    tz_str += f"  (+{extra} more)"
                result["timezone"] = tz_str

        except Exception:
            pass  # Return the N/A defaults — caller handles gracefully

        return result
