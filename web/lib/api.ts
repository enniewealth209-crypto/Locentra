const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface CountryRecord {
  name: string;
  capital: string;
  continent: string;
  population: string;
  country_code: string;
  area: string;
  currency: string;
  language: string;
  timezone: string;
}

export interface ExtraInfo {
  area: string;
  currency: string;
  language: string;
  timezone: string;
}

export async function fetchCountries(): Promise<CountryRecord[]> {
  const res = await fetch(`${BASE}/api/countries/`, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchSuggestions(q: string): Promise<string[]> {
  if (!q.trim()) return [];
  try {
    const res = await fetch(
      `${BASE}/api/suggestions/?q=${encodeURIComponent(q)}`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function fetchCountry(q: string): Promise<CountryRecord | null> {
  const res = await fetch(
    `${BASE}/api/country/?q=${encodeURIComponent(q)}`,
    { signal: AbortSignal.timeout(6000) }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

export async function fetchExtra(code: string): Promise<ExtraInfo> {
  const res = await fetch(
    `${BASE}/api/extra/?code=${encodeURIComponent(code)}`,
    { signal: AbortSignal.timeout(6000) }
  );
  if (!res.ok) return { area: "N/A", currency: "N/A", language: "N/A", timezone: "N/A" };
  return res.json();
}
