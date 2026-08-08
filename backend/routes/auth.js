// backend/routes/auth.js

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required',
      });
    }

    // Find user
    const result = await pool.query(
      `
      SELECT id, username, password_hash, role, shelter_id
      FROM users
      WHERE username = $1
      `,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid username or password',
      });
    }

    const user = result.rows[0];

    // Compare password with stored bcrypt hash
    const passwordValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordValid) {
      return res.status(401).json({
        error: 'Invalid username or password',
      });
    }

    // Create JWT
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
        shelter_id: user.shelter_id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '2h',
      }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        shelter_id: user.shelter_id,
      },
    });
  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      error: 'Internal server error',
    });
  }
});

module.exports = router;