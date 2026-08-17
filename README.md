# SHAASTRA — Person A deliverable (Shelter & Map Module)

This is everything checked off for **Person A** in the task-split doc: endpoints
#1–5, the seed script, and the `/`, `/shelters`, `/shelters/:id` pages, plus
the shared base files (`db.js`, `index.js`, `App.jsx`) that the doc says
Person A establishes since A merges first.

---
## What's actually been verified, and what hasn't

Be clear-eyed about this before a live demo:

**Tested against a real local Postgres, not just eyeballed:**
- Full schema (`backend/schema.sql`) applies cleanly
- All 5 endpoints, including role checks, shelter-ownership checks, and the
  `shelter_full` / `resource_critical` trigger logic on the updates endpoint
  (confirmed rows actually land in `notification_log`)
- CORS headers correctly allow the frontend origin

**Verified by build + lint only, not by looking at it render in a browser:**
- The entire frontend (`Home`, `ShelterList`, `ShelterDetail`, `FilterBar`,
  `Navbar`, etc.) — `npm run build` and `npx oxlint` both come back clean,
  and I traced the data shapes from the real API responses through every
  component by hand. But I could not get a headless browser running in this
  sandbox (Playwright/Puppeteer need to download a browser binary from a
  domain my network policy blocks; the apt `chromium-browser` package here
  is a snap stub with no working snapd). **Actually open `npm run dev` and
  click through the map, filters, and detail page yourself before you trust
  it on stage.** Pay particular attention to the Leaflet map rendering and
  the geolocation permission prompt — those are the two things a headless
  build check can't catch.

## Gaps I found in the guide itself (not things I skipped — things that genuinely aren't specified)

1. **`max_distance` has no reference point in the spec.** Section 5's sample
   query (`?beds_available=true&max_distance=&district=`) never says what
   the distance is measured *from*. I added `lat`/`lng` params fed by the
   browser's geolocation, falling back to a fixed Vadodara center point if
   permission is denied. Confirm with your team this is what they expect —
   it's a reasonable interpretation, not something confirmed by the doc.
2. **The "resource dropdown (food/medicine)" filter in the Section 3 filter
   bar has no backing query param on `GET /api/shelters`** (Section 5 only
   documents `beds_available`, `max_distance`, `district`). I implemented it
   as a client-side filter on already-fetched results. If B or C's pages
   need server-side resource filtering later, that's a backend change, not
   just a frontend one.
3. **The DB schema code block in the Dev Guide PDF was clipped** — it was
   rendered as a horizontally-scrolling code box that didn't survive
   print-to-PDF, so `food_status`/`medicine_status` DEFAULT values and one
   `notification_log.event_type` CHECK value were cut off in the source.
   I reconstructed them (documented inline in `schema.sql`):
   `DEFAULT 'adequate'` for both status columns, and `'person_matched'` as
   the third event type (confirmed independently — Person C's trigger logic
   in the task-split doc explicitly writes a `person_matched` row). Flag
   this at Checkpoint 1 so nobody's local schema silently drifts.

## Setup

```bash
# Backend
cd backend
cp .env.example .env        # point DATABASE_URL at your local/Supabase Postgres
npm install
psql "$DATABASE_URL" -f schema.sql
psql "$DATABASE_URL" -f seed/shelters.sql
npm start                    # http://localhost:4000

# Frontend
cd frontend
cp .env.example .env
npm install
npm run dev                  # http://localhost:5173
```

Health check: `curl http://localhost:4000/api/health` should return `{"status":"ok"}`.

## Testing the protected endpoints before Person B's auth exists

`middleware/auth.js` in this repo is a **working stub**, not Person B's real
file — see the comment at the top of that file. To test `POST /api/shelters`,
`PUT /api/shelters/:id`, or `POST /api/shelters/:id/updates` locally, mint a
token yourself:

```bash
node -e "
require('dotenv').config();
const jwt = require('jsonwebtoken');
console.log(jwt.sign({id:1, username:'test', role:'coordinator', shelter_id:null}, process.env.JWT_SECRET));
"
```

Use `role:'shelter_admin', shelter_id:<some shelter id>` for testing the
update endpoint — and remember `updated_by` is a foreign key into `users`,
so insert a matching row into `users` first or the update will fail with a
foreign-key violation (that's correct behavior, not a bug — see the note in
`schema.sql`).

## What to tell Person B and Person C at Checkpoint 1

- The three schema gaps above — confirm before anyone builds against a
  schema that might not match.
- The `max_distance` reference-point interpretation, since the coordinator
  dashboard (Person B) and find-someone search (Person C) may also want
  location-aware filtering later.
- `middleware/auth.js` is a placeholder. When Person B's real file lands,
  swap it in and re-run the tests in this README — the interface
  (`requireRole('coordinator')`, `requireRole('shelter_admin')`, and
  `req.user = { id, username, role, shelter_id }`) is the one contract that
  can't drift, per the task-split doc.

## Known things NOT built here (by design — not Person A's scope)

Login, JWT issuance, admin dashboards, persons/reconnection module,
notifications feed — all Person B / Person C, per the task-split doc. The
nav bar links to their routes (`/login`, `/find-someone`, etc.) already, so
those will 404 until the team merges.
