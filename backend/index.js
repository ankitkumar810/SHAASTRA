// backend/index.js
// SHARED FILE — Person A establishes this base (merges first per the
// task-split doc's merge order). Person B and Person C: add ONE mount line
// each in the marked spot below, don't restructure this file.

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Allow the frontend to connect from either Vite port
// (5173 normally, or 5174 if 5173 is already occupied).
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      // (for example, PowerShell/API testing).
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Also allow the configured frontend origin from .env if present.
      if (
        process.env.FRONTEND_ORIGIN &&
        origin === process.env.FRONTEND_ORIGIN
      ) {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
  })
);

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// --- Route mounts ---
app.use('/api/shelters', require('./routes/shelters')); // Person A
app.use('/api/auth', require('./routes/auth'));

// app.use('/api/admin', require('./routes/admin'));           // Person B — add this line
// app.use('/api/persons', require('./routes/persons'));       // Person C — add this line
// app.use('/api/notifications', require('./routes/admin'));   // Person B (endpoint #11 lives in admin.js per folder structure)

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Shaastra backend listening on port ${PORT}`);
});