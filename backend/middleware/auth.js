// backend/middleware/auth.js
//
// ⚠️ STUB — Person B owns this file for real (Checkpoint 2, ~Hour 5).
// This is a working placeholder so you (Person A) can build and test
// POST /api/shelters, PUT /api/shelters/:id, and POST /api/shelters/:id/updates
// WITHOUT waiting on Person B, per the "build in isolation" rule in the
// task-split doc (Section 0, step 5 + Checkpoint 2).
//
// DELETE this file and replace it with Person B's real middleware/auth.js
// at merge time. Do not merge both — same filename, same exports expected:
//   - requireRole('coordinator')
//   - requireRole('shelter_admin')
// req.user must end up as { id, username, role, shelter_id }.
//
// If Person B's real signature differs even slightly (e.g. requireRole takes
// an array instead of a rest param), routes/shelters.js below will break —
// that's the ONE contract you two must agree on explicitly, per the guide.

const jwt = require('jsonwebtoken');

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload; // expected shape: { id, username, role, shelter_id }

      if (!allowedRoles.includes(payload.role)) {
        return res.status(403).json({ error: 'Insufficient role' });
      }
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

module.exports = { requireRole };
