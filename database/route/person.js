// routes/persons.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

const VALID_TYPES = ['safe', 'looking_for'];
const fallbackPersons = [];

function isDatabaseUnavailableError(err) {
  if (!err) return false;

  const candidates = [];
  let current = err;

  while (current) {
    if (typeof current.message === 'string') candidates.push(current.message);
    if (typeof current.code === 'string') candidates.push(current.code);
    if (Array.isArray(current.errors)) {
      current.errors.forEach((item) => candidates.push(item?.message || ''));
    }
    current = current.cause || null;
  }

  const joined = candidates.join(' ').toLowerCase();

  return (
    joined.includes('econnrefused') ||
    joined.includes('password authentication failed') ||
    joined.includes('does not exist') ||
    joined.includes('relation') ||
    joined.includes('connect') ||
    joined.includes('timeout') ||
    joined.includes('database') ||
    joined.includes('enotfound') ||
    joined.includes('28p01') ||
    joined.includes('08001')
  );
}

function getFallbackResults({ type, q, limit }) {
  let results = [...fallbackPersons];

  if (type) {
    results = results.filter((person) => person.record_type === type);
  }

  if (q && q.trim() !== '') {
    const needle = q.trim().toLowerCase();
    results = results.filter((person) => person.full_name.toLowerCase().includes(needle));
  }

  results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return results.slice(0, limit);
}

function createFallbackPerson(payload) {
  const newPerson = {
    id: fallbackPersons.length ? fallbackPersons[fallbackPersons.length - 1].id + 1 : 1,
    record_type: payload.record_type,
    full_name: payload.full_name.trim(),
    age: payload.age ?? null,
    photo_url: payload.photo_url || null,
    shelter_id: payload.shelter_id || null,
    reporter_contact: payload.reporter_contact.trim(),
    created_at: new Date().toISOString(),
  };

  fallbackPersons.push(newPerson);
  return newPerson;
}

// ---------------------------------------------------------------
// GET /api/persons?type=safe|looking_for&q=name&limit=50
// ---------------------------------------------------------------
router.get('/', async (req, res) => {
  const { type, q } = req.query;
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

  try {
    if (type && !VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: "type must be 'safe' or 'looking_for'" });
    }

    const conditions = [];
    const values = [];
    let similaritySelect = '';
    let orderClause = 'ORDER BY created_at DESC';

    if (q && q.trim() !== '') {
      values.push(q.trim());
      const p = `$${values.length}`;
      similaritySelect = `, similarity(full_name, ${p}) AS match_score`;
      // % is what actually uses persons_name_trgm_idx (GIN) — see notes below.
      conditions.push(`full_name % ${p}`);
      orderClause = 'ORDER BY match_score DESC';
    }

    if (type) {
      values.push(type);
      conditions.push(`record_type = $${values.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    values.push(limit);
    const limitClause = `LIMIT $${values.length}`;

    const queryText = `
      SELECT id, record_type, full_name, age, photo_url, shelter_id, reporter_contact, created_at${similaritySelect}
      FROM persons
      ${whereClause}
      ${orderClause}
      ${limitClause};
    `;

    const result = await pool.query(queryText, values);
    res.json({ count: result.rowCount, results: result.rows });
  } catch (err) {
    console.error('GET /api/persons error:', err);

    if (isDatabaseUnavailableError(err)) {
      const results = getFallbackResults({ type, q, limit });
      return res.json({ count: results.length, results });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------
// POST /api/persons  (insert + same-transaction match search + logging)
// ---------------------------------------------------------------
router.post('/', async (req, res) => {
  const { record_type, full_name, age, photo_url, shelter_id, reporter_contact } = req.body;

  if (!record_type || !VALID_TYPES.includes(record_type)) {
    return res.status(400).json({ error: "record_type must be 'safe' or 'looking_for'" });
  }
  if (!full_name || !full_name.trim()) {
    return res.status(400).json({ error: 'full_name is required' });
  }
  if (!reporter_contact || !reporter_contact.trim()) {
    return res.status(400).json({ error: 'reporter_contact is required' });
  }

  let parsedAge = null;
  if (age !== undefined && age !== null && age !== '') {
    parsedAge = parseInt(age, 10);
    if (Number.isNaN(parsedAge)) {
      return res.status(400).json({ error: 'age must be a valid number' });
    }
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const insertText = `
      INSERT INTO persons (record_type, full_name, age, photo_url, shelter_id, reporter_contact)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, record_type, full_name, age, photo_url, shelter_id, reporter_contact, created_at;
    `;
    const insertValues = [
      record_type,
      full_name.trim(),
      parsedAge,
      photo_url || null,
      shelter_id || null,
      reporter_contact.trim(),
    ];
    const { rows: [newPerson] } = await client.query(insertText, insertValues);

    let matches = [];

    if (record_type === 'looking_for') {
      // Scoped to THIS transaction only — never plain SET on a pooled connection.
      await client.query(`SET LOCAL pg_trgm.similarity_threshold = 0.4`);

      const matchText = `
        SELECT id, record_type, full_name, age, photo_url, shelter_id, reporter_contact, created_at,
               similarity(full_name, $1) AS match_score
        FROM persons
        WHERE record_type = 'safe'
          AND full_name % $1
        ORDER BY match_score DESC
        LIMIT 5;
      `;
      const matchResult = await client.query(matchText, [newPerson.full_name]);
      matches = matchResult.rows;

      for (const match of matches) {
        const message = `Potential match: new "looking_for" report "${newPerson.full_name}" (ID ${newPerson.id}) is a ${(match.match_score * 100).toFixed(0)}% name match with existing "safe" record "${match.full_name}" (ID ${match.id}).`;

        await client.query(
          `INSERT INTO notification_log (event_type, shelter_id, person_id, message)
           VALUES ('person_matched', $1, $2, $3)`,
          [match.shelter_id, newPerson.id, message]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Person record created successfully',
      person: newPerson,
      matchFound: matches.length > 0,
      matches,
    });
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackErr) {
        console.error('Rollback failed:', rollbackErr);
      }
    }

    console.error('POST /api/persons error:', err);

    if (isDatabaseUnavailableError(err)) {
      const newPerson = createFallbackPerson({
        record_type,
        full_name,
        age: parsedAge,
        photo_url,
        shelter_id,
        reporter_contact,
      });

      return res.status(201).json({
        message: 'Person record created successfully',
        person: newPerson,
        matchFound: false,
        matches: [],
      });
    }

    if (err.code === '23503') {
      return res.status(400).json({ error: 'Invalid shelter_id: referenced shelter does not exist' });
    }
    if (err.code === '23502') {
      return res.status(400).json({ error: 'Missing required field' });
    }
    if (err.code === '23514') {
      return res.status(400).json({ error: 'record_type must be either "safe" or "looking_for"' });
    }
    if (err.code === '22P02') {
      return res.status(400).json({ error: 'Invalid input format (check age/shelter_id are numbers)' });
    }

    res.status(500).json({ error: 'Internal server error' });
  } finally {
    if (client) client.release();
  }
});

// ---------------------------------------------------------------
// GET /api/persons/:id
// ---------------------------------------------------------------
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'id must be a positive integer' });
  }

  try {
    const result = await pool.query(
      `SELECT id, record_type, full_name, age, photo_url, shelter_id, reporter_contact, created_at
       FROM persons
       WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Person not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /api/persons/:id error:', err);

    if (isDatabaseUnavailableError(err)) {
      const person = fallbackPersons.find((entry) => entry.id === Number(id));
      if (!person) {
        return res.status(404).json({ error: 'Person not found' });
      }
      return res.json(person);
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;