# Health Claims Backend

Backend service (Node.js + TypeScript + Express) for claim data quality monitoring.

Run:

1. Copy `.env.example` to `.env` and set `MONGO_URI` if needed.
2. Install deps: `npm install` in `Backend/`.
3. Start: `npm run start` (runs on port 3000 by default).

API:
- POST `/api/upload` form-data with field `file` containing CSV.
