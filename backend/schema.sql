-- RakshaSetu — Full DB Schema (Dev Guide Section 4)
-- This is a SHARED file — one person runs this once against Supabase/local Postgres.
-- Included here so Person A can stand up a local DB and test independently.
-- Order matters: users before resource_updates (resource_updates.updated_by references users).

CREATE TABLE shelters (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    total_capacity INTEGER NOT NULL,
    contact_name TEXT,
    contact_phone TEXT,
    district TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK (role IN ('shelter_admin','coordinator')) NOT NULL,
    shelter_id INTEGER REFERENCES shelters(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE resource_updates (
    id SERIAL PRIMARY KEY,
    shelter_id INTEGER REFERENCES shelters(id),
    current_occupancy INTEGER NOT NULL,
    beds_available INTEGER NOT NULL,
    -- NOTE: the source PDF's code block was clipped at the page edge for the two
    -- lines below (horizontal-scroll code box that didn't survive print-to-PDF).
    -- DEFAULT 'adequate' is the only sane default given the CHECK list and the
    -- rest of the doc ("stats start out fine, admin marks them down over time").
    -- Confirm this with your team at Checkpoint 1 rather than trusting it blindly.
    food_status TEXT CHECK (food_status IN ('adequate','low','critical')) DEFAULT 'adequate',
    medicine_status TEXT CHECK (medicine_status IN ('adequate','low','critical')) DEFAULT 'adequate',
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE persons (
    id SERIAL PRIMARY KEY,
    record_type TEXT CHECK (record_type IN ('safe','looking_for')) NOT NULL,
    full_name TEXT NOT NULL,
    age_approx INTEGER,
    photo_url TEXT,
    last_known_location TEXT,
    current_shelter_id INTEGER REFERENCES shelters(id),
    reporter_contact TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notification_log (
    id SERIAL PRIMARY KEY,
    -- Third CHECK value was also clipped in the source PDF. 'person_matched' is
    -- confirmed elsewhere in the task-split doc (Person C's trigger writes a
    -- person_matched row), so this one is a near-certainty, not a guess.
    event_type TEXT CHECK (event_type IN ('shelter_full','resource_critical','person_matched')) NOT NULL,
    reference_id INTEGER,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Fuzzy name search support (no ML — built into Postgres)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX persons_name_trgm_idx ON persons USING gin (full_name gin_trgm_ops);
