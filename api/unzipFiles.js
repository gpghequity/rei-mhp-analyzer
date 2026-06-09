// api/unzipFiles.js
//
// When a user uploads a .zip file, extract its contents and return individual files.
// Preserves original MIME types where possible. Deeply nested archives are flattened.
//
// Usage: const expanded = await expandZips(req.files?.docs || []);

import { Readable } from 'stream';
import unzipper from 'unzipper';

export async function expandZips(files) {
  if (!files || !Array.isArray(files)) return [];

  const result = [];

  for (const file of files) {
    // Not a ZIP → pass through as-is
    if (!file.mimetype?.includes('zip') && !file.originalname?.endsWith('.zip')) {
      result.push(file);
      continue;
    }

    // Is a ZIP → extract contents
    try {
      const directory = await unzipper.Open.buffer(file.buffer);
      for (const entry of directory.files) {
        // Skip directories and hidden files
        if (entry.type === 'Directory' || entry.path.startsWith('.') || entry.path.startsWith('__MACOSX')) {
          continue;
        }

        // Read file contents from ZIP
        const fileData = await entry.buffer();

        // Guess MIME type from filename
        const ext = (entry.path.split('.').pop() || '').toLowerCase();
        const mimeMap = {
          pdf: 'application/pdf',
          docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          doc: 'application/msword',
          xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          xls: 'application/vnd.ms-excel',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          gif: 'image/gif',
          webp: 'image/webp',
          tif: 'image/tiff',
          tiff: 'image/tiff'
        };
        const mimetype = mimeMap[ext] || 'application/octet-stream';

        // Add to results as if it were a direct upload
        result.push({
          buffer: fileData,
          originalname: entry.path.split('/').pop(), // use final component of path
          mimetype,
          size: fileData.length,
          fieldname: 'docs' // or 'photos' if needed — caller can refine
        });
      }
    } catch (e) {
      // If ZIP extraction fails, keep the original file and flag it
      console.error(`Failed to unzip ${file.originalname}: ${e.message}`);
      result.push({
        ...file,
        unzipError: e.message
      });
    }
  }

  return result;
}
