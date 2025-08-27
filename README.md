# MERN Leaderboard

A simple leaderboard built with MongoDB, Express, React, and Node.js.

## Features

- Add, edit, and delete scores with a name
- View top scores sorted by score (highest first)
- Filter and sort, copy top 3 summary, export CSV
- REST API: GET/POST/PATCH/DELETE /api/scores
- CORS + security headers

## Prerequisites

- Node.js 18+ and npm
- MongoDB (local or via Docker)

Optional: If you have Docker installed, you can start MongoDB via Docker Compose.

## Quick Start (Dev)

1) Start MongoDB (choose one):

- Local MongoDB running at mongodb://127.0.0.1:27017
- Or with Docker (from repository root):

```powershell
# Windows PowerShell
docker compose up -d
```

2) Start the API (server on port 5050):

```powershell
cd server
npm install
# copy .env from example only once if needed
if (!(Test-Path .env)) { Copy-Item .env.example .env }
# ensure port matches vite proxy
$env:PORT='5050'
npm run dev
```

3) Start the client (Vite dev server on 5173):

Open another terminal:

```powershell
cd client
npm install
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5050

The Vite dev server proxies /api requests to the API.

## API

Base URL: http://localhost:5050

- GET /api/scores?limit=10
  - Returns an array of top scores.
- POST /api/scores
  - Body: { name: string, score: number }
  - Creates a new score.
- PATCH /api/scores/:id
  - Body: { name?: string, score?: number }
  - Updates name and/or score.
- DELETE /api/scores/:id
  - Deletes a score.
- GET /api/health
  - { ok: true, dbMode: 'mongo' | 'memory' }

## Environment

Server `.env` options (see `server/.env.example`):

```
MONGODB_URI=mongodb://127.0.0.1:27017/leaderboard
PORT=5050
CORS_ORIGIN=http://localhost:5173
```

If MongoDB is unavailable, the API runs in a temporary in-memory mode (data resets on restart).

## Production

- Client: `cd client && npm run build` (output in `client/dist/`)
- Server: `cd server && npm start` with a real `MONGODB_URI`.
- Serve the `client/dist/` directory with any static server or reverse proxy through the API.

## Troubleshooting

- Port in use: change `$env:PORT` for the server or `vite.config.js` port for the client.
- CORS: adjust `CORS_ORIGIN` in `server/.env`.
- Mongo not running: use Docker Compose or start your local MongoDB.

## Project Structure

```
client/         # React + Vite frontend
server/         # Express + Mongoose API
server/src/     # API source
server/.env     # API environment (excluded from git)
docker-compose.yml  # MongoDB service
```

## Scripts

- Server: `npm run dev` (nodemon), `npm start` (node)
- Client: `npm run dev`, `npm run build`, `npm run preview`

---

Built with MERN • Dev: 5173 → 5050
