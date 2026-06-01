import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import handler from './api/calc.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve static files from dist (Vite build output)
app.use(express.static(join(__dirname, 'dist')));

// API endpoint for calc
app.post('/api/calc', (req, res) => {
  handler(req, res);
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Baby Analyzer server running on port ${PORT}`);
});
