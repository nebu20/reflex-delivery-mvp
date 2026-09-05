# Reflex — Project Design Document

> **Version:** 1.0 — MVP  
> **Status:** Code-complete and frozen  
> **Repository:** https://github.com/nebu20/reflex-delivery-mvp  
> **Document scope:** This document describes the system exactly as implemented. It does not describe planned, future, or aspirational features unless explicitly labelled **[FUTURE]**.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [User Roles and Responsibilities](#3-user-roles-and-responsibilities)
4. [End-to-End User Workflow](#4-end-to-end-user-workflow)
5. [System Architecture](#5-system-architecture)
6. [Database Design](#6-database-design)
7. [Delivery State Machine](#7-delivery-state-machine)
8. [API Design](#8-api-design)
9. [UI / Screen Design](#9-ui--screen-design)
10. [Validation and Business Rules](#10-validation-and-business-rules)
11. [Testing Evidence](#11-testing-evidence)
12. [MVP Trade-offs](#12-mvp-trade-offs)
13. [Future Production Evolution](#13-future-production-evolution)

---

## 1. Project Overview

**Reflex** is a lightweight, role-based delivery management web application built for small Kenyan retailers. It digitises the end-to-end delivery coordination process — from the moment a retailer creates a delivery request, through dispatcher assignment and rider status updates, to a final digital confirmation that a customer received their order.

The system is built as a full-stack MVP consisting of:
- A **React + TypeScript + Vite** single-page application (frontend)
- A **Node.js + Express + TypeScript** REST API (backend)
- A **SQLite** database managed via `better-sqlite3`

The application is structured around three distinct role-based views, each accessed via a separate route in the frontend: `/retailer`, `/dispatcher`, and `/rider`.

---

## 2. Problem Statement

Small Kenyan retailers currently coordinate deliveries through **WhatsApp messages and phone calls**. This creates three critical operational gaps:

| Gap | Impact |
|-----|--------|
| No delivery assignment record | Riders can receive the same delivery from multiple sources, or miss it entirely |
| No real-time status visibility | Retailers and dispatchers cannot tell if a delivery is in transit, completed, or lost |
| No proof of delivery | There is no verifiable record that a customer received their order |

Reflex solves all three gaps in a single, lightweight prototype that can run in a browser on any device.

---

## 3. User Roles and Responsibilities

The system has three roles. There is **no authentication** in this MVP — each role is accessed by navigating to its dedicated page.

### 🏪 Retailer Staff
- Accesses the system at `/retailer`
- Fills in a delivery request form with customer details and item information
- Submits the request, which is immediately stored with status `REQUESTED`
- Receives a confirmation showing the generated Delivery ID and initial status

### 📋 Dispatcher
- Accesses the system at `/dispatcher`
- Views all delivery requests across all statuses
- For each `REQUESTED` delivery, selects a rider from the dropdown and clicks **Assign Rider**
- Can see proof-of-delivery confirmation status (`Confirmed` / `Pending`) on `DELIVERED` orders
- Uses the **Refresh** button to reload the delivery list manually

### 🏍️ Rider
- Accesses the system at `/rider`
- Selects their rider identity from a dropdown (no login)
- Sees only the deliveries assigned to them
- Clicks **Mark as Picked Up** to transition `ASSIGNED → PICKED_UP`
- Clicks **Mark as Delivered** to transition `PICKED_UP → DELIVERED`
- After marking as delivered, enters a **Recipient Name** (required) and an optional **Confirmation Note**, then clicks **Confirm Delivery** to record proof of delivery
- Once proof is confirmed, sees a summary card: recipient name, note, and confirmed timestamp

---

## 4. End-to-End User Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     REFLEX DELIVERY WORKFLOW                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  RETAILER                  DISPATCHER              RIDER            │
│  /retailer                 /dispatcher             /rider           │
│                                                                     │
│  1. Fill form:             3. View all             6. Select rider  │
│     - Customer Name           deliveries              identity      │
│     - Customer Phone                                                │
│     - Delivery Address     4. Select rider         7. See assigned  │
│     - Item Description        from dropdown           deliveries    │
│                                                                     │
│  2. Click "Create          5. Click                8. Click         │
│     Delivery Request"         "Assign Rider"          "Mark as      │
│                                                        Picked Up"   │
│  ↓ status: REQUESTED       ↓ status: ASSIGNED                       │
│                                                    9. Click         │
│                                                       "Mark as      │
│                                                        Delivered"   │
│                                                                     │
│                                                    ↓ status:        │
│                                                      PICKED_UP →    │
│                                                      DELIVERED      │
│                                                                     │
│                                                    10. Enter:       │
│                                                        Recipient    │
│                                                        Name +       │
│                                                        Note         │
│                                                                     │
│                                                    11. Click        │
│                                                        "Confirm     │
│                            12. See "✓ Confirmed"       Delivery"    │
│                                badge on order                       │
└─────────────────────────────────────────────────────────────────────┘
```

### Step-by-step narrative

| Step | Actor | Action | System response |
|------|-------|--------|-----------------|
| 1 | Retailer | Fills the delivery form | — |
| 2 | Retailer | Clicks **Create Delivery Request** | `POST /api/deliveries` → 201 Created, status = `REQUESTED` |
| 3 | Dispatcher | Opens `/dispatcher` (or clicks Refresh) | `GET /api/deliveries` + `GET /api/riders` loaded in parallel |
| 4 | Dispatcher | Selects a rider from the per-delivery dropdown | — |
| 5 | Dispatcher | Clicks **Assign Rider** | `PATCH /api/deliveries/:id/assignment` → status = `ASSIGNED` |
| 6 | Rider | Opens `/rider`, selects their rider identity | `GET /api/riders/:riderId/deliveries` |
| 7 | Rider | Clicks **Mark as Picked Up** | `PATCH /api/deliveries/:id/status { status: "PICKED_UP" }` → 200 OK |
| 8 | Rider | Clicks **Mark as Delivered** | `PATCH /api/deliveries/:id/status { status: "DELIVERED" }` → 200 OK |
| 9 | Rider | Enters recipient name + optional note, clicks **Confirm Delivery** | `PATCH /api/deliveries/:id/proof` → proof stored with timestamp |
| 10 | Dispatcher | Refreshes dispatcher view | Sees **✓ Confirmed** badge on the delivered order |

---

## 5. System Architecture

### Overview

```
┌──────────────────────────────────────────────────┐
│               BROWSER (Client)                   │
│                                                  │
│   React 19 + TypeScript + Vite                   │
│   React Router DOM (SPA, client-side routing)    │
│                                                  │
│   Pages:  /        (Home — role selector)        │
│           /retailer                              │
│           /dispatcher                            │
│           /rider                                 │
│                                                  │
│   API Client:  src/api/client.ts                 │
│   Uses: fetch() with Content-Type: application/json
└───────────────────┬──────────────────────────────┘
                    │  HTTP / REST JSON
                    │  (VITE_API_URL env var)
                    │
┌───────────────────▼──────────────────────────────┐
│               BACKEND (Server)                   │
│                                                  │
│   Node.js + Express 5 + TypeScript               │
│   Listens: 0.0.0.0 : process.env.PORT            │
│   CORS:    process.env.CORS_ORIGIN               │
│                                                  │
│   Entry:   src/index.ts                          │
│   Factory: src/createApp.ts                      │
│                                                  │
│   Routes                                         │
│     GET  /api/health                             │
│     POST /api/deliveries                         │
│     GET  /api/deliveries                         │
│     GET  /api/deliveries/:id                     │
│     PATCH /api/deliveries/:id/assignment         │
│     PATCH /api/deliveries/:id/status             │
│     PATCH /api/deliveries/:id/proof              │
│     GET  /api/riders                             │
│     GET  /api/riders/:riderId/deliveries         │
│                                                  │
│   Layers (per feature module):                   │
│     Routes → Controller → Service → Repository  │
└───────────────────┬──────────────────────────────┘
                    │  better-sqlite3 (synchronous)
                    │
┌───────────────────▼──────────────────────────────┐
│               DATABASE                           │
│                                                  │
│   SQLite file: backend/data/reflex.db            │
│   (path overridable via DB_PATH env var)         │
│   WAL journal mode enabled                       │
│                                                  │
│   Table: deliveries                              │
└──────────────────────────────────────────────────┘
```

### Layer responsibilities

| Layer | File | Responsibility |
|-------|------|----------------|
| **Routes** | `delivery.routes.ts` | Maps HTTP verbs + paths to controller methods |
| **Controller** | `delivery.controller.ts` | Reads `req`, calls service, writes `res`. Maps service errors to HTTP status codes |
| **Service** | `delivery.service.ts` | All business logic: validation, state-machine enforcement, error types |
| **Repository** | `delivery.repository.ts` | All SQL queries via `better-sqlite3`. Zero business logic |
| **DB** | `db.ts` | Initialises the SQLite file, applies schema, exposes `createTestDb()` for tests |
| **App factory** | `createApp.ts` | Creates Express app, configures CORS, wires dependencies. Used by both server and tests |

### Dependency injection

`createApp(db)` accepts a `Database` instance. This allows tests to inject an in-memory SQLite database (`createTestDb()` returns `:memory:`) without touching the filesystem, ensuring test isolation.

### Technology versions (from `package.json`)

| Component | Technology | Version |
|-----------|-----------|---------|
| Frontend framework | React | 19 |
| Frontend build tool | Vite | 8 |
| Frontend language | TypeScript | — |
| Frontend routing | React Router DOM | 7 |
| Backend runtime | Node.js | ≥ 18 |
| Backend framework | Express | 5 |
| Backend language | TypeScript | 7 |
| Database driver | better-sqlite3 | 13 |
| Test runner | Vitest | 4 |
| HTTP test client | Supertest | 7 |

---

## 6. Database Design

### Table: `deliveries`

All delivery data is stored in a single table. There are no foreign key constraints in the MVP.

```sql
CREATE TABLE IF NOT EXISTS deliveries (
  id                   TEXT PRIMARY KEY,
  customer_name        TEXT NOT NULL,
  customer_phone       TEXT NOT NULL,
  delivery_address     TEXT NOT NULL,
  item_description     TEXT NOT NULL,
  status               TEXT NOT NULL DEFAULT 'REQUESTED',
  assigned_rider       TEXT,
  proof_recipient_name TEXT,
  proof_note           TEXT,
  proof_confirmed_at   DATETIME,
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Field descriptions

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | TEXT | No | Primary key. Format: `DEL-{8-char UUID fragment}` e.g. `DEL-a1b2c3d4` |
| `customer_name` | TEXT | No | Full name of the delivery recipient |
| `customer_phone` | TEXT | No | Phone number of the delivery recipient |
| `delivery_address` | TEXT | No | Free-text delivery address |
| `item_description` | TEXT | No | Description of the item(s) being delivered |
| `status` | TEXT | No | Current lifecycle status. One of: `REQUESTED`, `ASSIGNED`, `PICKED_UP`, `DELIVERED` |
| `assigned_rider` | TEXT | Yes | Rider ID string (e.g. `RIDER-001`). `NULL` until assigned |
| `proof_recipient_name` | TEXT | Yes | Name of person who received delivery. Set when proof is recorded |
| `proof_note` | TEXT | Yes | Optional confirmation note from rider. May be `NULL` |
| `proof_confirmed_at` | DATETIME | Yes | ISO timestamp of when proof was recorded. `NULL` until proof submitted |
| `created_at` | DATETIME | No | Record creation timestamp (ISO string) |
| `updated_at` | DATETIME | No | Last modification timestamp (ISO string), updated on every PATCH |

### Proof-of-delivery fields

The three `proof_*` columns together form the digital proof record. They are all `NULL` until the rider submits proof after a delivery reaches `DELIVERED` status. Once set, they **cannot be overwritten** (the service enforces this with a `409 Conflict`).

### ER Diagram

```
┌────────────────────────────────────────────┐
│                 deliveries                 │
├────────────────────────────────────────────┤
│ PK  id                    TEXT NOT NULL    │
│     customer_name         TEXT NOT NULL    │
│     customer_phone        TEXT NOT NULL    │
│     delivery_address      TEXT NOT NULL    │
│     item_description      TEXT NOT NULL    │
│     status                TEXT NOT NULL    │
│     assigned_rider        TEXT             │  ← references RIDERS constant (not a DB table)
│     proof_recipient_name  TEXT             │
│     proof_note            TEXT             │
│     proof_confirmed_at    DATETIME         │
│     created_at            DATETIME         │
│     updated_at            DATETIME         │
└────────────────────────────────────────────┘
```

> **Note:** Riders are not stored in the database. They are a hardcoded constant (`RIDERS`) in `delivery.types.ts`:
> ```
> RIDER-001  Brian Otieno
> RIDER-002  Grace Wanjiku
> RIDER-003  David Kamau
> ```

---

## 7. Delivery State Machine

### States

| Status | Meaning |
|--------|---------|
| `REQUESTED` | Delivery created by retailer. Awaiting dispatcher assignment |
| `ASSIGNED` | Dispatcher has assigned a rider. Rider has not yet picked up |
| `PICKED_UP` | Rider has collected the package and is en route |
| `DELIVERED` | Rider has delivered the package to the customer |

### Valid transitions

```
                  ┌─────────────┐
                  │  REQUESTED  │  ← created by retailer
                  └──────┬──────┘
                         │  PATCH /assignment { riderId }
                         │  (only valid from REQUESTED)
                  ┌──────▼──────┐
                  │  ASSIGNED   │  ← rider assigned by dispatcher
                  └──────┬──────┘
                         │  PATCH /status { status: "PICKED_UP" }
                         │  (only ASSIGNED → PICKED_UP allowed)
                  ┌──────▼──────┐
                  │  PICKED_UP  │  ← rider has collected package
                  └──────┬──────┘
                         │  PATCH /status { status: "DELIVERED" }
                         │  (only PICKED_UP → DELIVERED allowed)
                  ┌──────▼──────┐
                  │  DELIVERED  │  ← rider has delivered package
                  └──────┬──────┘
                         │  PATCH /proof { recipientName, note? }
                         │  (only valid from DELIVERED, only once)
                  ┌──────▼──────┐
                  │ PROOF       │  ← proof_confirmed_at is set
                  │ CONFIRMED   │     (not a status, but a sub-state
                  └─────────────┘      visible in proofOfDelivery field)
```

### Enforced transition rules (from `delivery.service.ts`)

| Attempted transition | Allowed? | HTTP response |
|---------------------|----------|---------------|
| `REQUESTED → ASSIGNED` | ✅ Yes (via `/assignment`) | `200 OK` |
| `ASSIGNED → ASSIGNED` | ❌ No | `409 Conflict` — "already been assigned" |
| `ASSIGNED → PICKED_UP` | ✅ Yes (via `/status`) | `200 OK` |
| `ASSIGNED → DELIVERED` | ❌ No | `409 Conflict` — "Invalid status transition" |
| `REQUESTED → PICKED_UP` | ❌ No | `409 Conflict` — "Invalid status transition" |
| `REQUESTED → DELIVERED` | ❌ No | `409 Conflict` — "Invalid status transition" |
| `PICKED_UP → DELIVERED` | ✅ Yes (via `/status`) | `200 OK` |
| `DELIVERED → PICKED_UP` | ❌ No | `409 Conflict` — "Invalid status transition" |
| Recording proof on non-DELIVERED | ❌ No | `409 Conflict` — "only be recorded for delivered orders" |
| Recording proof twice | ❌ No | `409 Conflict` — "already been recorded" |

---

## 8. API Design

**Base URL:** `/api`  
**Content-Type:** `application/json` on all requests and responses

### Endpoint index

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Service health check |
| `POST` | `/deliveries` | Create a delivery request |
| `GET` | `/deliveries` | List all deliveries (optional status filter) |
| `GET` | `/deliveries/:id` | Get a single delivery by ID |
| `PATCH` | `/deliveries/:id/assignment` | Assign a rider to a delivery |
| `PATCH` | `/deliveries/:id/status` | Update delivery status (rider workflow) |
| `PATCH` | `/deliveries/:id/proof` | Record proof of delivery |
| `GET` | `/riders` | List all available riders |
| `GET` | `/riders/:riderId/deliveries` | List deliveries assigned to a specific rider |

---

### `GET /api/health`

Returns API liveness status.

**Response `200 OK`:**
```json
{
  "status": "ok",
  "service": "reflex-api"
}
```

---

### `POST /api/deliveries`

Creates a new delivery request with status `REQUESTED`.

**Request body:**
```json
{
  "customerName": "John Kamau",
  "customerPhone": "+254700000000",
  "deliveryAddress": "Nairobi CBD, Kimathi Street",
  "itemDescription": "Samsung phone"
}
```

**All four fields are required.** Empty strings and missing keys return `400`.

**Response `201 Created`:**
```json
{
  "id": "DEL-a1b2c3d4",
  "customerName": "John Kamau",
  "customerPhone": "+254700000000",
  "deliveryAddress": "Nairobi CBD, Kimathi Street",
  "address": "Nairobi CBD, Kimathi Street",
  "itemDescription": "Samsung phone",
  "status": "REQUESTED",
  "assignedRider": null,
  "proofOfDelivery": null,
  "createdAt": "2026-09-05T17:00:00.000Z",
  "updatedAt": "2026-09-05T17:00:00.000Z"
}
```

**Error responses:**
| Code | Condition |
|------|-----------|
| `400` | Any required field missing or blank |

---

### `GET /api/deliveries`

Returns all deliveries ordered by `created_at DESC`.

**Optional query parameter:**
- `?status=REQUESTED` — filters by status value

**Response `200 OK`:** Array of delivery objects (same shape as POST response).

---

### `GET /api/deliveries/:id`

Returns a single delivery by its ID.

**Response `200 OK`:** Single delivery object.

**Error responses:**
| Code | Condition |
|------|-----------|
| `404` | Delivery ID not found |

---

### `PATCH /api/deliveries/:id/assignment`

Assigns a rider to a delivery. Only valid when current status is `REQUESTED`.

**Request body:**
```json
{
  "riderId": "RIDER-001"
}
```

**Response `200 OK`:** Updated delivery object with `status: "ASSIGNED"` and `assignedRider: "RIDER-001"`.

**Error responses:**
| Code | Condition |
|------|-----------|
| `400` | `riderId` missing or blank |
| `404` | Delivery not found |
| `409` | Delivery status is not `REQUESTED` (already assigned or further along) |

---

### `PATCH /api/deliveries/:id/status`

Updates the delivery status. Only two transitions are permitted by the service:
- `ASSIGNED → PICKED_UP`
- `PICKED_UP → DELIVERED`

**Request body:**
```json
{
  "status": "PICKED_UP"
}
```

**Response `200 OK`:** Updated delivery object.

**Error responses:**
| Code | Condition |
|------|-----------|
| `400` | `status` missing, blank, or not a recognised status value |
| `404` | Delivery not found |
| `409` | Transition not allowed from the current status |

---

### `PATCH /api/deliveries/:id/proof`

Records proof of delivery. Only valid when status is `DELIVERED` and no proof has been previously recorded.

**Request body:**
```json
{
  "recipientName": "John Kamau",
  "note": "Package received in good condition"
}
```

- `recipientName` is **required**
- `note` is **optional**

**Response `200 OK`:** Updated delivery object. The `proofOfDelivery` field is now populated:
```json
{
  "proofOfDelivery": {
    "recipientName": "John Kamau",
    "note": "Package received in good condition",
    "confirmedAt": "2026-09-05T17:30:00.000Z"
  }
}
```

**Error responses:**
| Code | Condition |
|------|-----------|
| `400` | `recipientName` missing or blank |
| `404` | Delivery not found |
| `409` | Delivery not in `DELIVERED` status, or proof already recorded |

---

### `GET /api/riders`

Returns the list of available riders (hardcoded constant).

**Response `200 OK`:**
```json
[
  { "id": "RIDER-001", "name": "Brian Otieno" },
  { "id": "RIDER-002", "name": "Grace Wanjiku" },
  { "id": "RIDER-003", "name": "David Kamau" }
]
```

---

### `GET /api/riders/:riderId/deliveries`

Returns all deliveries assigned to a specific rider, ordered by `created_at DESC`.

**Response `200 OK`:** Array of delivery objects.

**Error responses:**
| Code | Condition |
|------|-----------|
| `404` | Rider ID not found in the hardcoded RIDERS list |

---

## 9. UI / Screen Design

The frontend is a React SPA with client-side routing via React Router DOM. Navigation between pages uses `<Link>` / `useNavigate`. All pages share a common CSS design system (`App.css`, `index.css`, `styles/pages.css`).

---

### Home Page (`/`)

The landing page displays the API health status and three role-selector cards:

- **Retailer Staff** → navigates to `/retailer`
- **Dispatcher** → navigates to `/dispatcher`
- **Rider** → navigates to `/rider`

On load, it calls `GET /api/health` to confirm the backend is reachable. If unreachable, it shows an error banner.

---

### Retailer Page (`/retailer`)

**Purpose:** Create a new delivery request.

**UI elements:**
- Back button (returns to `/`)
- Page header with title and subtitle
- Form with four fields:
  - **Customer Name** (text input, required)
  - **Customer Phone** (tel input, required)
  - **Delivery Address** (text input, required, full-width)
  - **Item Description** (textarea, required, full-width)
- **Create Delivery Request** button (disabled while submitting, shows spinner text)
- Error alert banner (shown on API error)
- Success confirmation panel (shown after successful submission):
  - Delivery ID (`DEL-xxxxxxxx`)
  - Customer name
  - Status badge showing `REQUESTED`
- Form resets to empty after successful submission

**API calls made:**
- `POST /api/deliveries` on form submission

---

### Dispatcher Page (`/dispatcher`)

**Purpose:** View all delivery requests and assign riders.

**UI elements:**
- Back button (returns to `/`)
- Page header with title and subtitle
- **Refresh** button (re-fetches data; disabled while loading)
- Loading spinner while fetching
- Empty state message if no deliveries exist
- Delivery count summary (e.g. "3 delivery requests")
- One **delivery card** per delivery, showing:
  - Delivery ID
  - Status badge (colour-coded by status)
  - Customer name, phone, address, item description
  - **Assignment section:**
    - If status is `REQUESTED`: dropdown of available riders + **Assign Rider** button
    - If status is `ASSIGNED` or beyond: reads "Assigned to: [Rider Name] (RIDER-00X)"
  - **Proof status** (only shown when status is `DELIVERED`):
    - **✓ Confirmed** badge (green) if `proofOfDelivery` is present
    - **Pending** badge (yellow) if `proofOfDelivery` is null
  - Created timestamp (formatted to Kenyan locale)
  - Inline error message per card if assignment fails

**API calls made:**
- `GET /api/deliveries` and `GET /api/riders` in parallel on load and refresh
- `PATCH /api/deliveries/:id/assignment` on rider assignment

---

### Rider Page (`/rider`)

**Purpose:** View assigned deliveries and update their status, including recording proof of delivery.

**UI elements:**
- Back button (returns to `/`)
- Page header with title and subtitle
- **Refresh** button
- **Rider identity selector** — dropdown allowing selection between the three riders (Brian Otieno, Grace Wanjiku, David Kamau); defaults to `RIDER-001`. Changing selection re-fetches deliveries for that rider.
- Loading spinner while fetching
- Empty state message if no deliveries are assigned to the selected rider
- Delivery count summary
- One **delivery card** per delivery, showing:
  - Delivery ID, status badge
  - Customer name, phone, address, item description
  - **Action section (conditional on status):**
    - If `ASSIGNED`: **Mark as Picked Up** button → calls `PATCH /status { "PICKED_UP" }`
    - If `PICKED_UP`: **Mark as Delivered** button → calls `PATCH /status { "DELIVERED" }`
    - If `DELIVERED` and no proof yet: **Proof form** with:
      - Recipient Name field (required, labelled with `*`)
      - Confirmation Note field (optional)
      - **Confirm Delivery** button → calls `PATCH /proof`
    - If `DELIVERED` and proof recorded: **Confirmed summary card** showing:
      - "✓ Delivery Confirmed" badge
      - Recipient name
      - Note (if present)
      - Confirmed timestamp (formatted to Kenyan locale)
  - Inline error per card if any action fails
  - Created timestamp

**API calls made:**
- `GET /api/riders` on mount
- `GET /api/riders/:riderId/deliveries` on mount and when selected rider changes
- `PATCH /api/deliveries/:id/status` on status buttons
- `PATCH /api/deliveries/:id/proof` on proof submission

---

## 10. Validation and Business Rules

### Input validation (enforced in `delivery.service.ts`)

| Field | Rule |
|-------|------|
| `customerName` | Required. Must not be blank after trim |
| `customerPhone` | Required. Must not be blank after trim |
| `deliveryAddress` | Required. Accepts either `deliveryAddress` or `address` key (backward compatibility) |
| `itemDescription` | Required. Must not be blank after trim |
| `riderId` | Required for assignment. Must not be blank after trim |
| `status` | Must be one of the recognised status values. Must follow valid transition rules |
| `recipientName` | Required for proof submission. Must not be blank after trim |
| `note` | Optional for proof. Null if empty |

### Business rules

| Rule | Implementation |
|------|---------------|
| A delivery can only be assigned once | Assignment rejected with `409` if status ≠ `REQUESTED` |
| Status transitions are strictly ordered | Only `ASSIGNED→PICKED_UP` and `PICKED_UP→DELIVERED` are valid |
| Proof can only be recorded once | Second proof submission returns `409` |
| Proof requires delivery to be complete | Rejected with `409` if status ≠ `DELIVERED` |
| Proof timestamp is server-generated | `proof_confirmed_at` is set by the backend at submission time; client cannot supply it |
| Rider must exist | `/riders/:riderId/deliveries` returns `404` for unknown rider IDs |
| Delivery ID format | Auto-generated as `DEL-{8-char UUID fragment}` using Node.js `crypto.randomUUID()` |

---

## 11. Testing Evidence

The backend has **38 automated integration tests** implemented with **Vitest** and **Supertest**, all passing against an **in-memory SQLite database** (`Database(':memory:')`).

**Test command:** `npm test` (in `backend/`)  
**Test framework:** Vitest v4  
**HTTP test client:** Supertest v7  
**Test result:** ✅ 38/38 passed

### Test coverage by feature

| Test group | Tests | Coverage |
|------------|-------|---------|
| `POST /api/deliveries` — create delivery | 5 | Happy path + 4 missing-field rejections |
| `GET /api/deliveries` — list all | 1 | Returns all deliveries |
| `GET /api/deliveries/:id` — get one | 2 | Found + 404 not found |
| `PATCH /api/deliveries/:id/assignment` | 7 | Assign, status/field stored, missing riderId, not found, already assigned, mid-flow rejections |
| `GET /api/riders` | 1 | Returns rider list with correct shape |
| `PATCH /api/deliveries/:id/status` | 9 | Both valid transitions, 6 invalid transition rejections, missing/invalid status, not found |
| `GET /api/riders/:riderId/deliveries` | 3 | Found with deliveries, unknown rider 404, valid rider with empty list |
| `PATCH /api/deliveries/:id/proof` | 10 | Record proof, recipient stored, timestamp stored, note stored, missing recipient, not found, non-DELIVERED rejected, overwrite rejected, GET returns proof, GET returns null when no proof |

---

## 12. MVP Trade-offs

These are known, deliberate simplifications made to deliver a working prototype quickly. They are **not bugs**.

### SQLite instead of a production database

**What it means:** SQLite stores all data in a single file (`backend/data/reflex.db`). On Render's free tier, this file is on an ephemeral filesystem and **will be lost** on every service restart or redeployment.

**Why it was chosen:** SQLite requires zero configuration, runs in-process, and is fully sufficient for demo and prototype purposes with low concurrent usage.

**Production path:** Migrate to PostgreSQL with a managed cloud service (e.g. Supabase, Neon, Railway, or Render PostgreSQL add-on). The Repository layer is already abstracted; only `db.ts` and the SQL queries in `delivery.repository.ts` need updating.

### Static rider list instead of user management

**What it means:** There are exactly three riders (`RIDER-001`, `RIDER-002`, `RIDER-003`), hardcoded as a constant in `delivery.types.ts`. Riders cannot be added, removed, or edited without a code change.

**Why it was chosen:** Eliminates the need for an authentication system, a users table, a rider registration flow, and session management — all of which are out of scope for an MVP.

**Production path:** Introduce a `riders` database table, a rider registration API, and role-based authentication (JWT or session-based).

### No authentication or authorisation

**What it means:** Any user can access `/retailer`, `/dispatcher`, or `/rider` without logging in. Any user can assign riders or record proof on behalf of any rider.

**Why it was chosen:** Authentication adds significant scope (registration, login, token management, protected routes, password reset). For an internal team demo, it is not necessary.

**Production path:** Add JWT-based authentication with role-based access control (RBAC). Protect API endpoints with middleware.

### Lightweight digital proof of delivery

**What it means:** Proof of delivery consists only of: a recipient name (text), an optional confirmation note (text), and a server timestamp. There are no photos, signatures, GPS coordinates, or OTP confirmations.

**Why it was chosen:** Photo uploads require file storage (S3/Cloudinary), signatures require a canvas-based UI component, GPS requires browser geolocation permission flows. All of these are significant scope additions.

**Production path:** Integrate photo upload (pre-signed S3 URLs), optional digital signature capture (canvas), and GPS coordinates from the browser's Geolocation API.

### No real-time synchronisation

**What it means:** The dispatcher and rider views do not update automatically when another user makes a change. Each user must click the **Refresh** button manually to reload data.

**Why it was chosen:** Real-time updates require WebSockets (Socket.io) or Server-Sent Events, adding significant backend and frontend complexity.

**Production path:** Add a WebSocket layer (e.g. Socket.io) to push delivery status change events to all connected clients.

### Current status only — no delivery history

**What it means:** The database stores only the current `status`, `assigned_rider`, and `updated_at`. There is no audit log or history of past status transitions.

**Why it was chosen:** An audit log requires a separate `delivery_events` table and associated API endpoints/UI.

**Production path:** Add a `delivery_events` table recording each `(delivery_id, old_status, new_status, actor, timestamp)` transition.

---

## 13. Future Production Evolution

The following table maps each MVP limitation to a concrete production upgrade path, ordered roughly by implementation priority.

| Priority | Feature | Current MVP | Production Approach |
|----------|---------|-------------|---------------------|
| 1 | **Persistent database** | SQLite on ephemeral disk | PostgreSQL on a managed cloud service |
| 2 | **Authentication** | None — open pages | JWT-based auth with RBAC; protected API routes |
| 3 | **Dynamic rider management** | 3 hardcoded riders | `riders` DB table; rider registration API; admin panel |
| 4 | **Real-time updates** | Manual refresh | WebSocket (Socket.io) push events on status change |
| 5 | **Delivery history / audit log** | Only current status stored | `delivery_events` table recording every transition |
| 6 | **Photo proof of delivery** | Text only | File upload to S3/Cloudinary; stored URL in DB |
| 7 | **GPS coordinates** | None | Browser Geolocation API; stored with proof record |
| 8 | **SMS/WhatsApp notifications** | None | Africa's Talking or Twilio SMS on assignment + delivery |
| 9 | **Retailer delivery history** | Not implemented | Retailer-specific filtered view with pagination |
| 10 | **Multi-company support** | Single tenant | Organisations table; data scoped per org |

---

## Appendix: Project File Structure

```
reflex/
├── PROJECT_DESIGN.md               ← this document
├── README.md                       ← developer quick-start guide
├── render.yaml                     ← Render deployment blueprint
├── .gitignore
│
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── data/
│   │   └── reflex.db               ← SQLite database file (runtime)
│   ├── src/
│   │   ├── index.ts                ← server entry point
│   │   ├── createApp.ts            ← Express app factory
│   │   ├── db.ts                   ← SQLite init, schema, test helper
│   │   ├── routes/
│   │   │   └── health.ts           ← GET /api/health
│   │   └── modules/
│   │       └── deliveries/
│   │           ├── delivery.routes.ts
│   │           ├── delivery.controller.ts
│   │           ├── delivery.service.ts
│   │           ├── delivery.repository.ts
│   │           └── delivery.types.ts
│   └── tests/
│       └── deliveries.test.ts      ← 38 integration tests
│
└── frontend/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── vercel.json                  ← Vercel deployment config
    ├── index.html
    └── src/
        ├── main.tsx                 ← React entry point
        ├── App.tsx                  ← Router + role selector home page
        ├── App.css                  ← Global design system
        ├── index.css                ← Base reset + typography
        ├── api/
        │   └── client.ts            ← apiFetch() wrapper (uses VITE_API_URL)
        ├── types/
        │   └── delivery.ts          ← Frontend TypeScript types
        ├── styles/
        │   └── pages.css            ← Shared page + component styles
        └── pages/
            ├── RetailerPage.tsx     ← /retailer
            ├── DispatcherPage.tsx   ← /dispatcher
            └── RiderPage.tsx        ← /rider
```

---

*Document generated from source code inspection of commit `802c061` on the `main` branch of [https://github.com/nebu20/reflex-delivery-mvp](https://github.com/nebu20/reflex-delivery-mvp).*
