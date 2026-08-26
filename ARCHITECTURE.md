# SHAASTRA Architecture

## Proposed technology stack

For a fast, maintainable SIH prototype:

- Web client: Next.js, React, TypeScript, Tailwind CSS.
- Mobile/PWA behaviour: Next.js PWA capabilities with a service worker and local queue; React Native is a post-MVP option.
- Backend and data: Supabase (PostgreSQL, Auth, Realtime, Storage, Row Level Security) with Next.js route handlers for privileged workflows.
- Maps: OpenStreetMap tiles with a lightweight map library; preserve list mode as a full alternative.
- AI: server-side LLM integration with approved context, structured outputs, logging, rate limits, and human review routes.
- Notifications: Twilio or equivalent for future SMS/WhatsApp integration.
- Deployment: Vercel for the web app and Supabase managed services.

No dependency should be installed until the team explicitly starts implementation.

## High-level architecture

```text
Citizen / Shelter Admin / Authority Browser
                |
          Next.js web app + PWA cache
                |
     Route handlers / server-side service layer
       |                 |                 |
  Supabase Auth     PostgreSQL + RLS    Realtime channels
       |                 |                 |
       +-------- AI orchestration --------+
                         |
               Approved data + LLM provider
```

Clients query only the data permitted to their role. Privileged writes, prediction runs, notification requests, and AI calls go through the server-side service layer. Realtime changes are emitted only after validation and stored in PostgreSQL.

## Future folder structure

```text
shaastra/
  app/                    # Next.js routes, layouts, API route handlers
  components/              # Reusable UI components
  features/                # Shelter, family, reports, dashboard, assistant
  lib/                     # Database, auth, validation, maps, AI clients
  types/                   # Shared TypeScript types
  public/                  # Static and offline assets
  supabase/                # Migrations, seed data, policies
  tests/                   # Unit, integration, and end-to-end tests
  docs/                    # Later supporting documentation if needed
```

This is a future target only; do not create these folders before implementation begins.

## Database entities

- `profiles`: authenticated user identity, role, district, verification state.
- `shelters`: verified facility, address/coordinates, capacity, status, update time.
- `shelter_inventory`: food, medicine, water, and other resource measurements by time.
- `shelter_updates`: audit-friendly occupancy and status updates submitted by administrators.
- `safe_records`: private safe-status records, shelter/location reference, message, verification state.
- `reconnection_requests`: controlled family lookup requests and match/consent state.
- `disaster_reports`: submitted hazards/needs, location, evidence reference, lifecycle status.
- `alerts`: generated capacity/resource/report alerts, severity, assignee, resolution state.
- `districts` and `zones`: geographic and operational partitioning.
- `resource_predictions`: time-stamped, explainable shortage forecasts and confidence metadata.
- `audit_logs`: privileged actions and record access events.

## API structure

Use versioned JSON endpoints or equivalent route handlers with schema validation:

```text
/api/v1/shelters                 GET discovery, POST authority create
/api/v1/shelters/:id             GET, PATCH authorised updates
/api/v1/shelters/:id/inventory   POST inventory update
/api/v1/safe-records             POST safe registration
/api/v1/reconnection/search      POST controlled family lookup
/api/v1/reports                  GET/POST disaster reports
/api/v1/reports/:id/review       POST authority verification action
/api/v1/dashboard/summary        GET authority metrics
/api/v1/alerts                   GET and PATCH resolution state
/api/v1/assistant                POST grounded assistant request
/api/v1/predictions              GET authority predictions
```

All mutation endpoints must validate input, require an authenticated session, enforce a role/district scope, write an audit record where sensitive, and return a minimal safe response.

## User roles and permissions

| Role | Primary permissions |
|---|---|
| Citizen | Discover public shelters; submit own safe record/report; submit controlled reconnection lookup. |
| Shelter administrator | Read and update only assigned shelter data and inventory; view aggregate safe counts, not private registry contents. |
| District authority | View district operations; verify reports/records; manage alerts and approved data. |
| System administrator | Manage roles, districts, verified shelters, and audit access. |

## AI service architecture

The AI layer is server-only. It receives a tightly scoped request plus retrieved, timestamped, approved facts from SHAASTRA. It returns a structured response containing answer text, data sources/identifiers, uncertainty, and escalation recommendation. It must not receive more personal data than necessary. Predictions begin as documented deterministic thresholds, with a later model trained/evaluated against historical operational data.

## Realtime architecture

Shelter updates and alert-state changes write to PostgreSQL first. A realtime subscription refreshes subscribed citizen and authority views, filtered by district and role. The client shows data freshness and falls back to the latest cached verified result if the channel disconnects. Optimistic UI must never claim that a critical update is confirmed until the backend acknowledges it.

## Security architecture

- Supabase Auth with session handling and role claims.
- Row Level Security for every user-facing data table.
- Server-side authorization checks for privileged operations.
- Input validation, rate limits, anti-abuse controls, and parameterised database access.
- Encryption in transit; platform encryption at rest; minimise stored personal data.
- Audit logs for authority access, identity-sensitive lookup, verification, and status changes.
- No service keys or AI provider keys in the browser.

## Development order

1. Preserve the existing prototype as the visual/flow reference.
2. Establish the Next.js and TypeScript foundation only after approval.
3. Implement authentication, roles, database migrations, RLS, and seed data.
4. Build shelter discovery and administrator updates.
5. Build safe registration and privacy-preserving reconnection search.
6. Build authority metrics, review queues, and alerts with realtime refresh.
7. Add offline queue/cache and the SMS-ready service boundary.
8. Add grounded assistant and transparent resource-alert/prediction logic.
9. Test, secure, deploy, and rehearse the core demo flows.
