import { findOrCreatePropertyFolder, saveAnalysisFile } from './drive.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  try {
    const { address, propertyName, analysisType, inputs, results, extractedData } = req.body;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    // Create/get folder for this address
    const folderId = await findOrCreatePropertyFolder(address);

    // Build analysis object with all data preserved
    const analysis = {
      savedAt: new Date().toISOString(),
      address,
      propertyName,
      analysisType,
      inputs,
      results,
      extractedData: extractedData || {},
      metadata: {
        version: '0.5.0',
        buildDate: '2026-06-01'
      }
    };

    // Save to Drive folder
    await saveAnalysisFile(folderId, analysis);

    res.json({
      ok: true,
      message: `Analysis saved to ${address}`,
      folderId,
      savedAt: analysis.savedAt
    });
  } catch (err) {
    console.error('Save analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
