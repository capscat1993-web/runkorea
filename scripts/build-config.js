'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env') });

const key = process.env.GOOGLE_MAPS_API_KEY || '';
const out =
  '/* Generated from .env — run: npm run config */\n' +
  `window.GOOGLE_MAPS_API_KEY = ${JSON.stringify(key)};\n`;

fs.writeFileSync(path.join(root, 'js', 'config.js'), out, 'utf8');
