// server.js
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const personsRouter = require('./route/person');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/persons', personsRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));