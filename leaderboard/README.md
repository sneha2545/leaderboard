# MERN Leaderboard

A simple leaderboard built with MongoDB, Express, React, and Node.js.

## Features

- Add a score with a name
- View top scores sorted by score (highest first)
- REST API: GET /api/scores, POST /api/scores
- CORS + security headers

## Prerequisites

- Node.js 18+ and npm
- MongoDB (local or Docker)

Optional: If you have Docker installed, you can start MongoDB via Docker Compose. If not, the API will run in a temporary in-memory mode (data resets on restart).

## Quick Start (Dev)

1) Start MongoDB (one of):

- Local MongoDB running at mongodb://127.0.0.1:27017
- Or with Docker:

```powershell
docker compose up -d
```

2) Server setup (API on port 5050)

```powershell
cd "c:\Users\Asus\OneDrive\Desktop\Sneha portfolio\server"; npm install; if (!(Test-Path .env)) { copy .env.example .env }; $env:PORT='5050'; npm run dev
```

3) Client setup

Open a new terminal:

```powershell
cd "c:\Users\Asus\OneDrive\Desktop\Sneha portfolio\client"; npm install; npm run dev
```

Client will run on http://localhost:5173 and proxy API calls to http://localhost:5050.

## API

- GET /api/scores?limit=10
  - Returns an array of top scores.
- POST /api/scores
  - Body: { name: string, score: number }
  - Creates a new score.

## Environment

Server `.env` options (see `.env.example`):

- MONGODB_URI=mongodb://127.0.0.1:27017/leaderboard
- PORT=5050
- CORS_ORIGIN=http://localhost:5173

## Production build

- Client: `npm run build` in `client/` then serve `dist/` with a static server.
- Server: `npm start` in `server/` with proper `MONGODB_URI`.
