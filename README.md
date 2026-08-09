 # SHAASTRA – Community Response Registry

## 1. Project Overview

SHAASTRA is a full-stack web application designed for family reunification and community emergency response. It allows people to:

- mark a person as safe
- report a missing person
- search for a missing or safe person
- view detailed records and emergency response information
- match possible records by name similarity

The project is built as a stack of:

- Frontend: Next.js + React + TypeScript
- Backend: Node.js + Express.js
- Database: PostgreSQL
- API communication: REST API

---

## 2. Project Goal

The main purpose of this project is to help communities respond quickly during emergency situations by maintaining a registry of:

- safe persons
- missing or looking-for persons
- contact information for reporters
- location/shelter information when available

This supports rapid identification and reunification between families and response teams.

---

## 3. Technologies Used

### Frontend
- Next.js 16
- React 19
- TypeScript
- Tailwind-like custom CSS styling via app folder and component styling
- shadcn/ui inspired component structure

### Backend
- Node.js
- Express.js
- PostgreSQL client (`pg`)
- CORS
- dotenv

### Database
- PostgreSQL
- Querying with SQL and `pg_trgm` similarity search support for name matching

### Dev Tools
- npm
- pnpm (configured in frontend)
- concurrently (for running frontend and backend together)

### Languages
- JavaScript
- TypeScript
- SQL

---

## 4. Project Requirements

Before running the project, ensure your system has:

- Node.js v18+ recommended
- npm (or pnpm for the frontend)
- PostgreSQL database server running
- Internet access for installing dependencies
- A `.env` file with environment variables for the backend and frontend

---

## 5. Project Structure

```text
SHAASTRA/
├── package.json
├── .gitignore
├── README.md
├── database/
│   ├── package.json
│   ├── server.js
│   ├── db.js
│   └── route/
│       └── person.js
├── frontend_C/
│   ├── package.json
│   ├── next.config.mjs
│   ├── tsconfig.json
│   ├── postcss.config.mjs
│   ├── components.json
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/
│   │       └── persons/
│   │           └── route.ts
│   └── components/
│       ├── reconnection/
│       │   ├── FindSomeone.tsx
│       │   ├── PersonDetail.tsx
│       │   └── PersonForm.tsx
│       └── ui/
│           └── button.tsx
└── .env (optional for local setup)
```

---

## 6. Backend Functionality

The backend is located in the `database` folder and uses Express. It exposes a REST API for person records.

### Main API Endpoint
- `/api/persons`

### Supported operations
- `GET /api/persons` → fetch persons with optional filters
- `POST /api/persons` → create a new safe/missing person record

### Query parameters
- `type=safe|looking_for`
- `q=search name`
- `limit=number`

### Data model
The project manages records with fields such as:

- `id`
- `record_type` (`safe` or `looking_for`)
- `full_name`
- `age`
- `photo_url`
- `shelter_id`
- `reporter_contact`
- `created_at`

The backend also includes logic for matching similar names in a PostgreSQL database using trigram similarity.

---

## 7. Frontend Functionality

The frontend in `frontend_C` is a Next.js application that provides a user-friendly interface for:

- searching for someone
- viewing registry details
- submitting a safe person report
- submitting a missing person report
- showing community emergency registry actions

The homepage is designed as a registry dashboard with tabs for:

- Find someone
- Mark as safe
- Report missing

---

## 8. Environment Variables

Create a `.env` file in the `database` folder for the backend.

Example:

```env
DATABASE_URL=postgres://username:password@localhost:5432/shaastra
PORT=5000
```

If the frontend also needs a backend base URL, create an environment file in `frontend_C` as needed:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

> The app is built to support PostgreSQL connection strings and gracefully falls back in some cases if the database is unavailable.

---

## 9. Installation Steps

### Option A: Install all dependencies from the root

```bash
npm install
npm run install:all
```

This will install dependencies for both the backend and frontend.

### Option B: Install individually

#### Backend
```bash
cd database
npm install
```

#### Frontend
```bash
cd frontend_C
npm install
```

Or, if you want to use pnpm as configured in the frontend project:

```bash
cd frontend_C
pnpm install
```

---

## 10. How to Run the Project

### Run the backend

From the project root:

```bash
npm run dev:backend
```

Or direct:

```bash
cd database
npm run dev
```

Backend runs on:

```text
http://localhost:5000
```

### Run the frontend

From the project root:

```bash
npm run dev:frontend
```

Or direct:

```bash
cd frontend_C
npm run dev
```

Frontend runs on:

```text
http://localhost:3000
```

### Run both together

From the root:

```bash
npm run dev
```

This uses `concurrently` to start backend and frontend together.

---

## 11. Useful Root Scripts

From the root `package.json`:

```json
{
  "scripts": {
    "install:backend": "npm --prefix database install",
    "install:frontend": "npm --prefix frontend_C install",
    "install:all": "npm run install:backend && npm run install:frontend",
    "dev:backend": "npm --prefix database run dev",
    "dev:frontend": "npm --prefix frontend_C run dev",
    "dev": "npx concurrently \"npm run dev:backend\" \"npm run dev:frontend\""
  }
}
```

---

## 12. Database Setup Notes

The app expects a PostgreSQL database with a `persons` table and related event logging support. Example record patterns include:

- `record_type` values: `safe`, `looking_for`
- `full_name` text matching for lookup and similarity search
- `reporter_contact` for contact information
- `created_at` timestamp for ordering and recent records

The code also checks for database availability and falls back to in-memory mock data when the DB is unreachable.

---

## 13. App Flow

1. User opens the frontend dashboard.
2. User chooses to find someone, mark someone safe, or report a missing person.
3. The frontend sends requests to the backend API.
4. The backend validates the input and stores it in PostgreSQL.
5. The backend may search for similar names and return possible matches.
6. Results are shown to the user in the UI.

---

## 14. Notes for Developers

- The backend and frontend are separated into different folders for clean project management.
- The frontend uses App Router structure from Next.js.
- The backend is a simple Express server and can be extended with more routes and validations.
- The project is suitable for hackathon or prototype-level deployment and can be expanded for production use.

---

## 15. Recommended Next Improvements

- Add authentication/admin access
- Add real shelter and location management
- Improve validation and error handling
- Add image upload support for profile photos
- Add dashboard analytics for response teams
- Add deployment configuration for production (Vercel, Render, Railway, etc.)

---

## 16. Summary

SHAASTRA is a disaster and community response registry app that combines:

- modern frontend user interface
- robust backend API
- PostgreSQL database storage
- real-time name-matching capabilities

This project is well-suited for emergency response, disaster recovery, and family reunification systems.

---

## 17. Quick Start

```bash
npm install
npm run install:all
npm run dev
```

Then open:

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

If you want, I can also create a more polished version of this README with screenshots, badges, and a deployment section for production. 
