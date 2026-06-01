import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import calcHandler from './api/calc.js';
import saveAnalysisHandler from './api/save-analysis.js';
import loadAnalysisHandler from './api/load-analysis.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve static files from dist (Vite build output)
app.use(express.static(join(__dirname, 'dist')));

// API endpoints
app.post('/api/calc', (req, res) => {
  calcHandler(req, res);
});

app.post('/api/save-analysis', (req, res) => {
  saveAnalysisHandler(req, res);
});

app.get('/api/load-analysis', (req, res) => {
  loadAnalysisHandler(req, res);
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Baby Analyzer server running on port ${PORT}`);
});
