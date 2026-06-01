import { google } from 'googleapis';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let driveClient = null;

async function getDriveClient() {
  if (driveClient) return driveClient;

  const keyPath = path.join(__dirname, '..', 'keys', 'gorilla-drive-bot.json');
  const keyFile = await fs.readFile(keyPath, 'utf8');
  const key = JSON.parse(keyFile);

  const auth = new google.auth.GoogleServiceAccountAuth({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/drive']
  });

  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}

async function findOrCreatePropertyFolder(address) {
  const drive = await getDriveClient();

  // Canonical folder name: "REI-{address}"
  const folderName = `REI-${address}`;

  // Search for existing folder
  try {
    const res = await drive.files.list({
      q: `name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      spaces: 'drive',
      fields: 'files(id, name)',
      pageSize: 1
    });

    if (res.data.files.length > 0) {
      return res.data.files[0].id;
    }
  } catch (err) {
    console.error(`Error searching for folder: ${err.message}`);
  }

  // Create new folder
  try {
    const res = await drive.files.create({
      resource: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      },
      fields: 'id'
    });
    return res.data.id;
  } catch (err) {
    throw new Error(`Failed to create Drive folder for ${address}: ${err.message}`);
  }
}

async function saveAnalysisFile(folderId, analysis) {
  const drive = await getDriveClient();

  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `analysis-${timestamp}-${Date.now()}.json`;
  const fileContent = JSON.stringify(analysis, null, 2);

  try {
    await drive.files.create({
      resource: {
        name: fileName,
        mimeType: 'application/json',
        parents: [folderId]
      },
      media: {
        mimeType: 'application/json',
        body: fileContent
      }
    });
  } catch (err) {
    throw new Error(`Failed to save analysis file: ${err.message}`);
  }
}

async function loadLatestAnalysis(address) {
  try {
    const drive = await getDriveClient();
    const folderName = `REI-${address}`;

    // Find the folder
    const folderRes = await drive.files.list({
      q: `name='${folderName.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      spaces: 'drive',
      fields: 'files(id)',
      pageSize: 1
    });

    if (!folderRes.data.files.length) {
      return null;
    }

    const folderId = folderRes.data.files[0].id;

    // List analysis files sorted by creation time (newest first)
    const filesRes = await drive.files.list({
      q: `'${folderId}' in parents and name contains 'analysis-' and trashed=false`,
      spaces: 'drive',
      fields: 'files(id, name, createdTime)',
      pageSize: 1,
      orderBy: 'createdTime desc'
    });

    if (!filesRes.data.files.length) {
      return null;
    }

    const fileId = filesRes.data.files[0].id;

    // Download the file
    const fileRes = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'text' }
    );

    return JSON.parse(fileRes.data);
  } catch (err) {
    console.error(`Error loading analysis: ${err.message}`);
    return null;
  }
}

export { findOrCreatePropertyFolder, saveAnalysisFile, loadLatestAnalysis };
