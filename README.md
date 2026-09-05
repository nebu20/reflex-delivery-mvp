# Reflex — Delivery Management MVP

> Fast, trackable, accountable delivery management built for Kenyan small retailers.

## Problem

Small Kenyan retailers coordinate deliveries through WhatsApp and phone calls.  
They have no reliable record of delivery assignments, no real-time status visibility, and no proof of delivery.

## Solution

Reflex is a lightweight delivery management prototype with three role-based views:

| Role | Responsibility |
|------|---------------|
| **Retailer Staff** | Creates delivery requests (customer info, address, item) |
| **Dispatcher** | Views open requests and assigns riders |
| **Rider** | Tracks assigned deliveries and updates status |

## Delivery Status Flow

```
OPEN → ASSIGNED → PICKED_UP → DELIVERED
```

---

## Architecture

```
React Frontend (Vite + TypeScript)
        |
        | REST API  (JSON over HTTP)
        v
Node.js + Express (TypeScript)
        |
        v
SQLite Database (better-sqlite3)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| Backend | Node.js, Express, TypeScript |
| Database | SQLite via `better-sqlite3` |
| API Style | REST |

---

## Project Structure

```
reflex/
├── frontend/          # React + Vite app
│   ├── src/
│   │   ├── App.tsx    # Root component
│   │   └── App.css    # Global styles
│   ├── index.html
│   └── package.json
├── backend/           # Express API
│   ├── src/
│   │   ├── index.ts       # Server entry point
│   │   ├── db.ts          # SQLite setup
│   │   └── routes/
│   │       └── health.ts  # Health check route
│   ├── tsconfig.json
│   └── package.json
├── .gitignore
└── README.md
```

---

## Local Setup

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/reflex-delivery-mvp.git
cd reflex-delivery-mvp
```

### 2. Start the backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on: **http://localhost:3001**

### 3. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: **http://localhost:5173**

---

## API Reference

### Health Check

```
GET /api/health
```

**Response:**

```json
{
  "status": "ok",
  "service": "reflex-api"
}
```

---

## Sprint Progress

- [x] **Sprint 1** — Project foundation (frontend, backend, SQLite, health endpoint, README)
- [ ] **Sprint 2** — Delivery CRUD (retailer creates request)
- [ ] **Sprint 3** — Dispatcher assigns rider
- [ ] **Sprint 4** — Rider status updates + proof of delivery

---

## License

MIT
