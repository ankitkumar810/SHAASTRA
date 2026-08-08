// backend/routes/shelters.js
// Person A owns this file. Endpoints #1-5 from Dev Guide Section 5.

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { requireRole } = require('../middleware/auth');

// Shared subquery: latest resource_updates row per shelter (DISTINCT ON).
// shelters itself doesn't store beds/food/medicine — that's resource_updates.
const LATEST_UPDATE_JOIN = `
  LEFT JOIN LATERAL (
    SELECT ru.current_occupancy, ru.beds_available, ru.food_status,
           ru.medicine_status, ru.updated_at
    FROM resource_updates ru
    WHERE ru.shelter_id = s.id
    ORDER BY ru.updated_at DESC
    LIMIT 1
  ) latest ON TRUE
`;

// ---------------------------------------------------------------------------
// #1 GET /api/shelters — list active shelters
// Query params: beds_available=true, max_distance (km), lat, lng, district
//
// NOTE ON max_distance: the Dev Guide's sample query string
// (?beds_available=true&max_distance=&district=) doesn't include a lat/lng
// pair, but you can't filter "within N km" without a reference point. I've
// added optional lat/lng params (fed by the browser's geolocation on the
// filter bar's distance slider) and the endpoint simply ignores max_distance
// if they're not supplied. Flag this gap to Person B/C at Checkpoint 1 —
// it's a real spec gap, not something I glossed over.
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const { beds_available, max_distance, lat, lng, district } = req.query;

    const conditions = ['s.is_active = TRUE'];
    const params = [];

    if (district) {
      params.push(district);
      conditions.push(`s.district ILIKE $${params.length}`);
    }

    if (beds_available === 'true') {
      conditions.push(`COALESCE(latest.beds_available, 0) > 0`);
    }

    let distanceSelect = '';
    let distanceOrder = '';
    if (lat && lng) {
      params.push(parseFloat(lat), parseFloat(lng));
      const latIdx = params.length - 1;
      const lngIdx = params.length;
      // Haversine formula in km
      distanceSelect = `,
        (6371 * acos(
          cos(radians($${latIdx})) * cos(radians(s.latitude)) *
          cos(radians(s.longitude) - radians($${lngIdx})) +
          sin(radians($${latIdx})) * sin(radians(s.latitude))
        )) AS distance_km`;
      distanceOrder = 'ORDER BY distance_km ASC';

      if (max_distance) {
        params.push(parseFloat(max_distance));
        conditions.push(`(6371 * acos(
          cos(radians($${latIdx})) * cos(radians(s.latitude)) *
          cos(radians(s.longitude) - radians($${lngIdx})) +
          sin(radians($${latIdx})) * sin(radians(s.latitude))
        )) <= $${params.length}`);
      }
    } else {
      distanceOrder = 'ORDER BY s.name ASC';
    }

    const query = `
      SELECT s.id, s.name, s.address, s.latitude, s.longitude, s.total_capacity,
             s.contact_name, s.contact_phone, s.district,
             latest.current_occupancy, latest.beds_available,
             latest.food_status, latest.medicine_status, latest.updated_at
             ${distanceSelect}
      FROM shelters s
      ${LATEST_UPDATE_JOIN}
      WHERE ${conditions.join(' AND ')}
      ${distanceOrder}
    `;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/shelters failed:', err);
    res.status(500).json({ error: 'Failed to fetch shelters' });
  }
});

// ---------------------------------------------------------------------------
// #2 GET /api/shelters/:id — one shelter's detail + latest resource status
// Also includes "people marked safe here" (reads Person C's persons table —
// read-only, no write, so no conflict with their module).
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const shelterResult = await pool.query(
      `SELECT s.*, latest.current_occupancy, latest.beds_available,
              latest.food_status, latest.medicine_status, latest.updated_at
       FROM shelters s
       ${LATEST_UPDATE_JOIN}
       WHERE s.id = $1`,
      [id]
    );

    if (shelterResult.rows.length === 0) {
      return res.status(404).json({ error: 'Shelter not found' });
    }

    let safePersons = [];
    try {
      const personsResult = await pool.query(
        `SELECT id, full_name, age_approx, photo_url, created_at
         FROM persons
         WHERE current_shelter_id = $1 AND record_type = 'safe'
         ORDER BY created_at DESC`,
        [id]
      );
      safePersons = personsResult.rows;
    } catch (personsErr) {
      // If Person C's persons table isn't migrated yet in your local dev DB,
      // don't let that break the shelter detail page — degrade gracefully.
      console.warn('persons table not available yet, returning empty list:', personsErr.message);
    }

    res.json({ ...shelterResult.rows[0], safe_persons: safePersons });
  } catch (err) {
    console.error('GET /api/shelters/:id failed:', err);
    res.status(500).json({ error: 'Failed to fetch shelter' });
  }
});

// ---------------------------------------------------------------------------
// #3 POST /api/shelters — create shelter (coordinator-only)
// ---------------------------------------------------------------------------
router.post('/', requireRole('coordinator'), async (req, res) => {
  try {
    const { name, address, latitude, longitude, total_capacity, contact_name, contact_phone, district } = req.body;

    if (!name || !address || latitude == null || longitude == null || total_capacity == null) {
      return res.status(400).json({ error: 'name, address, latitude, longitude, total_capacity are required' });
    }

    const result = await pool.query(
      `INSERT INTO shelters (name, address, latitude, longitude, total_capacity, contact_name, contact_phone, district)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, address, latitude, longitude, total_capacity, contact_name || null, contact_phone || null, district || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/shelters failed:', err);
    res.status(500).json({ error: 'Failed to create shelter' });
  }
});

// ---------------------------------------------------------------------------
// #4 PUT /api/shelters/:id — edit shelter (coordinator-only)
// ---------------------------------------------------------------------------
router.put('/:id', requireRole('coordinator'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, latitude, longitude, total_capacity, contact_name, contact_phone, district, is_active } = req.body;

    const result = await pool.query(
      `UPDATE shelters SET
         name = COALESCE($1, name),
         address = COALESCE($2, address),
         latitude = COALESCE($3, latitude),
         longitude = COALESCE($4, longitude),
         total_capacity = COALESCE($5, total_capacity),
         contact_name = COALESCE($6, contact_name),
         contact_phone = COALESCE($7, contact_phone),
         district = COALESCE($8, district),
         is_active = COALESCE($9, is_active)
       WHERE id = $10
       RETURNING *`,
      [name, address, latitude, longitude, total_capacity, contact_name, contact_phone, district, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shelter not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/shelters/:id failed:', err);
    res.status(500).json({ error: 'Failed to update shelter' });
  }
});

// ---------------------------------------------------------------------------
// #5 POST /api/shelters/:id/updates — post occupancy/resource update
// (shelter_admin, own shelter only — enforced twice: role AND shelter_id match)
// Includes the trigger logic from Dev Guide Section 5:
//   - beds_available == 0            -> insert 'shelter_full' notification
//   - food_status/medicine_status == 'critical' -> insert 'resource_critical'
// ---------------------------------------------------------------------------
router.post('/:id/updates', requireRole('shelter_admin'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { current_occupancy, beds_available, food_status, medicine_status } = req.body;

    // Server-side ownership check — never trust the UI for this.
    if (String(req.user.shelter_id) !== String(id)) {
      return res.status(403).json({ error: 'You can only update your own shelter' });
    }

    if (current_occupancy == null || beds_available == null) {
      return res.status(400).json({ error: 'current_occupancy and beds_available are required' });
    }

    await client.query('BEGIN');

    const updateResult = await client.query(
      `INSERT INTO resource_updates (shelter_id, current_occupancy, beds_available, food_status, medicine_status, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, current_occupancy, beds_available, food_status || 'adequate', medicine_status || 'adequate', req.user.id]
    );

    const shelterRow = await client.query(`SELECT name FROM shelters WHERE id = $1`, [id]);
    const shelterName = shelterRow.rows[0]?.name || `Shelter #${id}`;

    if (Number(beds_available) === 0) {
      await client.query(
        `INSERT INTO notification_log (event_type, reference_id, message) VALUES ($1, $2, $3)`,
        ['shelter_full', id, `${shelterName} is now FULL (0 beds available)`]
      );
    }

    if (food_status === 'critical' || medicine_status === 'critical') {
      const which = [
        food_status === 'critical' ? 'food' : null,
        medicine_status === 'critical' ? 'medicine' : null,
      ].filter(Boolean).join(' and ');
      await client.query(
        `INSERT INTO notification_log (event_type, reference_id, message) VALUES ($1, $2, $3)`,
        ['resource_critical', id, `${shelterName} reports CRITICAL ${which} status`]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(updateResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /api/shelters/:id/updates failed:', err);
    res.status(500).json({ error: 'Failed to post update' });
  } finally {
    client.release();
  }
});

module.exports = router;
