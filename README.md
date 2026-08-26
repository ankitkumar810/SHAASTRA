# SHAASTRA

A hackathon-ready disaster management platform prototype for shelter discovery, family reconnection, and district coordination.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The original static `index.html` remains in the root as a preserved reference/fallback.

Copy `.env.example` to `.env.local` before adding any future environment-specific values. Do not commit `.env.local`.

## Scripts

- `npm run dev` - start the development server.
- `npm run build` - create a production build.
- `npm run start` - run the production build locally.
- `npm run lint` - check project lint rules.
- `npm run typecheck` - run strict TypeScript checks.

## Included flows

- Find and filter nearby shelters with live capacity and resource status
- Register an “I'm Safe” record and look it up in the family reconnection registry
- Authority dashboard with operational metrics, resource alerts, activity stream, and simulated live updates
- Responsive, low-bandwidth-friendly front end suitable for a 7-day MVP demo

## Phase 1 status

The current Next.js shell preserves the existing prototype's UI and local demo interactions. It intentionally does not yet include a database, authentication, maps, AI, prediction, offline/SMS support, or external APIs. Those capabilities are staged in `ARCHITECTURE.md` and must follow `RULES.md`.
