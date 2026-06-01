import { loadLatestAnalysis } from './drive.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'GET only' });
  }

  try {
    const { address } = req.query;

    if (!address) {
      return res.status(400).json({ error: 'Address query parameter is required' });
    }

    const analysis = await loadLatestAnalysis(address);

    if (!analysis) {
      return res.json({ ok: true, analysis: null, message: 'No previous analysis found' });
    }

    res.json({ ok: true, analysis });
  } catch (err) {
    console.error('Load analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
