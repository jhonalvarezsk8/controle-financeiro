# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal cash flow web app. Transactions are entered per day, aggregate to month, aggregate to year. The core feature is projecting future balance based on known future transactions.

## Commands

### Backend (run from `backend/`)
```bash
pip install -r requirements.txt
python -m uvicorn main:app --reload       # dev server at http://localhost:8000
python -m uvicorn main:app --host 0.0.0.0 --port $PORT  # production
```

### Frontend (run from `frontend/`)
```bash
npm install
npm run dev      # dev server at http://localhost:5173 (hot reload)
npm run build    # TypeScript check + production build
npm run lint     # ESLint
```

### Database reset (SQLite only)
```bash
rm backend/financeiro.db
cd backend && python -c "import models; from database import engine; models.Base.metadata.create_all(bind=engine)"
```

If the DB file is locked (uvicorn running), add a column without dropping:
```bash
python -c "import sqlite3; conn = sqlite3.connect('financeiro.db'); conn.execute('ALTER TABLE transacao ADD COLUMN new_col TYPE DEFAULT val'); conn.commit()"
```

## Architecture

### Data flow
```
Transacao (individual) → /dias/{ano}/{mes} aggregate → /resumo/{ano} monthly totals
```

**Balance is never stored** — it's computed on every request in `calcular_saldo_ate()` (`main.py`):
`saldo = saldo_inicial (from config table) + Σ entradas − Σ saidas` up to a given date.

### Backend (`backend/`)
- **`models.py`** — Two SQLAlchemy tables: `Transacao` (individual transactions) and `Config` (key-value store, used for `saldo_inicial`).
- **`main.py`** — All route logic. Key endpoints:
  - `GET /dias/{ano}/{mes}` — returns all days of the month with aggregated entradas/saidas and computed running saldo. `is_future=True` for days after today.
  - `POST /transacoes` — if `recorrente=True`, creates independent copies for every remaining month of the year on the same day (skips months where the day doesn't exist).
  - `GET /resumo/{ano}` — iterates all 12 months, accumulates saldo from `saldo_inicial`.
- **`database.py`** — SQLite locally, PostgreSQL in production via `DATABASE_URL` env var. `postgres://` URLs are rewritten to `postgresql://` for SQLAlchemy compatibility.
- CORS uses `allow_origins=["*"]` (no credentials mode — auth is handled via JWT bearer token, not cookies).

### Frontend (`frontend/src/`)
- **`api.ts`** — All fetch calls. `VITE_API_URL` env var overrides `http://localhost:8000`.
- **Pages**: `Dashboard` (year) → `Mes` (month, all 30/31 days) → `Dia` (individual transactions for one day).
- **`components/TabelaMes.tsx`** — renders all days of a month; highlights today, grays out future days, shows `(proj.)` label on projected balances.
- **`components/FormTransacao.tsx`** — shared form for creating/editing transactions. "Repetir todo mês" checkbox only appears on creation (not edit); sets `recorrente: true` in the payload.

### Recurring transactions
When `recorrente=true`, the backend creates N independent copies (one per remaining month of the year). Copies have `recorrente=false`. There is no link between the original and copies — editing one never affects others. The `↻` icon in `Dia.tsx` marks the original transaction.

## Authentication

All routes are protected by JWT bearer token. Single-user app — no registration.

- `POST /login` — accepts `{"senha": string}`, validates against `APP_PASSWORD` env var, returns a JWT valid for 30 days.
- `verify_token` dependency is added to every route via `_=Depends(verify_token)`.
- Frontend stores the token in `localStorage` and injects it via `Authorization: Bearer <token>` header in every request (`apiFetch` wrapper in `api.ts`).
- On 401, `apiFetch` clears the token and redirects to `/login`.
- `Login.tsx` page at `/login`; all other routes wrapped in `PrivateRoute` in `App.tsx`.

To run locally with auth: set `APP_PASSWORD=anyvalue` and `JWT_SECRET=anyvalue` as env vars before starting uvicorn.

## Environment variables

| Var | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./financeiro.db` | PostgreSQL URL in production |
| `APP_PASSWORD` | `""` | Login password (required in production) |
| `JWT_SECRET` | `"changeme"` | JWT signing secret (required in production) |
| `VITE_API_URL` | `http://localhost:8000` | Backend URL for frontend |

## Deployment targets
- **Backend**: Render.com (`backend/render.yaml` present) — pinned to Python 3.11.9 via `pythonVersion` in `render.yaml` and `backend/.python-version`
- **Frontend**: Vercel (`frontend/vercel.json` with SPA rewrite rule)
- **Database**: Neon.tech (free PostgreSQL) in production

### Data migration (SQLite → PostgreSQL)
Use `backend/migrate.py` to copy local data to Neon:
```bash
cd backend
python migrate.py "postgresql://..."
```

## GitHub Repository

- **URL**: https://github.com/jhonalvarezsk8/controle-financeiro
- **Branch**: master
- **Auto-sync**: enabled — every time Claude Code finishes a response that changes files, `.claude/auto-push.sh` runs automatically (Stop hook), stages all changes, creates a timestamped commit, and pushes to origin.
