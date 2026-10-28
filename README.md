# Locentra 🌍

**Global country lookup — capitals, populations, currencies, languages, timezones.**

Locentra is a full-stack country lookup application. The Django backend serves a JSON API backed by the local CSV dataset, with optional area, currency, language, and timezone details fetched from [countries.dev](https://countries.dev). The React frontend supports autocomplete, country browsing, continent filtering, and country details.

---

## Tech stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Backend   | Python · Django · django-cors-headers |
| Data      | Local CSV (`data/countries.csv`) + live enrichment from countries.dev |
| Frontend  | React 19 · Vite · Tailwind CSS 4 · Motion |

---

## Project structure

```
CountryLookUpSystem/
├── data/
│   └── countries.csv          # 194-country dataset (name, capital, continent, population, code)
├── locentra/
│   └── backend/
│       ├── manage.py
│       ├── config/            # Django project settings and root URLs
│       └── countries/         # API views, URLs, logic wrapper
├── web/                       # Vite + React frontend
│   ├── app/
│   ├── components/
│   └── lib/
├── logic.py                   # CountryLogic — shared data layer (CSV + countries.dev)
├── requirements.txt           # Python dependencies
└── README.md
```

---

## Prerequisites

- Python 3.11+
- Node.js 20.19+

---

## Backend setup

```bash
# 1. Install Python dependencies (from the project root)
pip install -r requirements.txt

# 2. Start the Django development server
cd locentra/backend
python manage.py runserver
```

The API will be available at **<http://localhost:8000>**.

For deployment, set `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=false`, and `DJANGO_ALLOWED_HOSTS` in the environment. The local defaults are for development only.

### API endpoints

| Method | Path                         | Description                                      |
|--------|------------------------------|--------------------------------------------------|
| GET    | `/api/countries/`             | All country records for browsing and filtering   |
| GET    | `/api/suggestions/?q=<name>` | Up to 8 autocomplete suggestions                 |
| GET    | `/api/country/?q=<name>`     | Full country record (CSV fields)                 |
| GET    | `/api/extra/?code=<iso2>`    | Live-fetched area, currency, language, timezone  |
| GET    | `/api/health/`               | Server health check and loaded country count     |

---

## Frontend setup

```bash
# From the web/ directory
cd web
npm install
npm run dev
```

The app will be available at **<http://localhost:5173>**.

The frontend expects the Django backend to be running on **<http://localhost:8000>**. To override this (e.g. for a different port or deployed backend), set the environment variable:

```bash
# web/.env.local
VITE_API_URL=http://localhost:8000
```

---

## Running both together

Open two terminals:

```bash
# Terminal 1 — backend
cd locentra/backend
python manage.py runserver

# Terminal 2 — frontend
cd web
npm run dev
```

Then open **<http://localhost:5173>** in your browser.

---

## Data sources

- **Country dataset** — `data/countries.csv` (name, capital, continent, population, ISO alpha-2 code)
- **Enrichment** — area, currencies, languages, and timezones fetched live from [countries.dev](https://countries.dev) (free, no API key required)
- **Flags** — served by [flagcdn.com](https://flagcdn.com) (free, no API key required)
