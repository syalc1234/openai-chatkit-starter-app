# Repository Guidelines

## Project Structure & Module Organization
This repo is a two-part starter for Managed ChatKit:

- `frontend/`: Vite + React + TypeScript UI.
  - Main app files live in `frontend/src/` (`App.tsx`, `components/`, `lib/`).
  - Static assets are in `frontend/public/`.
- `backend/`: FastAPI service that creates ChatKit sessions.
  - API entrypoint: `backend/app/main.py`
  - Local run script: `backend/scripts/run.sh`
- `docs/`: supporting project docs/media (for example `docs/workflow.jpg`).
- Root `package.json`: orchestrates frontend and backend dev workflows.

## Build, Test, and Development Commands
Run commands from repo root unless noted:

- `npm install`: install root tooling (`concurrently`).
- `npm run dev`: start backend (`127.0.0.1:8000`) and frontend (`:3000`) together.
- `npm run frontend:build`: install frontend deps and create production bundle.
- `npm run frontend:lint`: run ESLint for `frontend/src/**/*.{ts,tsx}`.
- `npm run frontend`: install frontend deps and run Vite only.
- `./backend/scripts/run.sh`: start FastAPI directly (creates/uses `backend/.venv`).

## Coding Style & Naming Conventions
- Frontend: TypeScript + React function components, `PascalCase` for components (for example `ChatKitPanel.tsx`), `camelCase` for helpers (for example `chatkitSession.ts`).
- Backend: Python 3.11+ with type hints and clear, small functions.
- Formatting conventions in current codebase:
  - TS/TSX uses 2-space indentation.
  - Python uses 4-space indentation.
- Linting: ESLint is required for frontend (`npm run frontend:lint`). `ruff` is available for backend dev dependencies.

## Testing Guidelines
There is currently no committed automated test suite. Before opening a PR:

- Run `npm run frontend:lint`.
- Run `npm run dev` and verify:
  - `GET /health` returns `{"status":"ok"}`.
  - Chat session creation works via `/api/create-session`.
- When adding tests, place frontend tests near source files (or under `frontend/src/__tests__/`) and backend tests under `backend/tests/`.

## Commit & Pull Request Guidelines
- Follow the existing Git history style: short imperative subject lines (for example `Simplify ChatKit backend`) and include issue/PR refs when available (`(#104)`).
- Keep commits focused; avoid mixing frontend and backend refactors without a clear reason.
- PRs should include:
  - What changed and why.
  - Any env/config updates (`OPENAI_API_KEY`, `VITE_CHATKIT_WORKFLOW_ID`, API base overrides).
  - UI screenshots or short recordings for frontend changes.
  - Repro/verification steps reviewers can run locally.
