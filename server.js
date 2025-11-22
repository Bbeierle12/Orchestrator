import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Helper function to get file stats
async function getFileStats(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: stats.size,
      modified: stats.mtime,
      age: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)) // days
    };
  } catch (error) {
    return { size: 0, modified: null, age: 0 };
  }
}

// Recursive function to scan directory
async function scanDirectory(dirPath, maxDepth = 5, currentDepth = 0) {
  if (currentDepth >= maxDepth) {
    return null;
  }

  try {
    const stats = await fs.stat(dirPath);
    const fileStats = await getFileStats(dirPath);

    if (!stats.isDirectory()) {
      return {
        name: path.basename(dirPath),
        type: 'file',
        size: fileStats.size,
        age: fileStats.age
      };
    }

    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const children = [];

    for (const entry of entries) {
      // Skip system/hidden files on Windows
      if (entry.name.startsWith('$') || entry.name === 'System Volume Information') {
        continue;
      }

      const fullPath = path.join(dirPath, entry.name);

      try {
        if (entry.isDirectory()) {
          const subDir = await scanDirectory(fullPath, maxDepth, currentDepth + 1);
          if (subDir) {
            children.push(subDir);
          }
        } else {
          const fileInfo = await getFileStats(fullPath);
          children.push({
            name: entry.name,
            type: 'file',
            size: fileInfo.size,
            age: fileInfo.age
          });
        }
      } catch (error) {
        // Skip files/folders we can't access
        console.log(`Skipping ${fullPath}: ${error.message}`);
      }
    }

    return {
      name: path.basename(dirPath),
      type: 'folder',
      children: children,
      size: children.reduce((acc, child) => acc + (child.size || 0), 0),
      age: fileStats.age
    };
  } catch (error) {
    console.error(`Error scanning ${dirPath}:`, error.message);
    return null;
  }
}

// API endpoint to scan a directory
app.post('/api/scan', async (req, res) => {
  try {
    const { path: scanPath, maxDepth = 3 } = req.body;

    if (!scanPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    console.log(`Scanning directory: ${scanPath}`);
    const result = await scanDirectory(scanPath, maxDepth);

    if (!result) {
      return res.status(404).json({ error: 'Directory not found or inaccessible' });
    }

    res.json({
      root: result,
      scannedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to move files
app.post('/api/move', async (req, res) => {
  try {
    const { moves } = req.body;

    if (!moves || !Array.isArray(moves)) {
      return res.status(400).json({ error: 'Moves array is required' });
    }

    const results = [];

    for (const move of moves) {
      try {
        const { sourcePath, targetPath, action } = move;

        if (action === 'delete') {
          await fs.rm(sourcePath, { recursive: true, force: true });
          results.push({ success: true, path: sourcePath, action: 'deleted' });
        } else if (action === 'move') {
          // Ensure target directory exists
          await fs.mkdir(path.dirname(targetPath), { recursive: true });
          await fs.rename(sourcePath, targetPath);
          results.push({ success: true, from: sourcePath, to: targetPath, action: 'moved' });
        }
      } catch (error) {
        results.push({ success: false, error: error.message, move });
      }
    }

    res.json({ results });
  } catch (error) {
    console.error('Move error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's home directory
app.get('/api/user-home', (req, res) => {
  const homeDir = process.env.USERPROFILE || process.env.HOME;
  res.json({ path: homeDir });
});

// List folders in a directory (for folder browser)
app.post('/api/list-folders', async (req, res) => {
  try {
    const { path: dirPath } = req.body;

    if (!dirPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const folders = entries
      .filter(entry => entry.isDirectory())
      .map(entry => ({
        name: entry.name,
        path: path.join(dirPath, entry.name)
      }));

    res.json({ folders });
  } catch (error) {
    console.error('List folders error:', error);

    // Provide specific error messages
    let errorMessage = error.message;
    if (error.code === 'ENOENT') {
      errorMessage = 'Directory not found';
    } else if (error.code === 'EACCES' || error.code === 'EPERM') {
      errorMessage = 'Access denied';
    }

    res.status(500).json({ error: errorMessage, code: error.code });
  }
});

// Get available drives (Windows) or root (Unix)
app.get('/api/drives', async (req, res) => {
  try {
    const drives = [];

    if (process.platform === 'win32') {
      // Windows: check common drive letters
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

      for (const letter of letters) {
        const drivePath = `${letter}:\\`;
        try {
          await fs.access(drivePath);
          const stats = await fs.stat(drivePath);
          drives.push({
            name: `${letter}:`,
            path: drivePath,
            type: 'drive'
          });
        } catch (error) {
          // Drive doesn't exist or not accessible
        }
      }
    } else {
      // Unix-like systems
      drives.push({ name: '/', path: '/', type: 'root' });
    }

    res.json({ drives });
  } catch (error) {
    console.error('Get drives error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get common/quick access folders
app.get('/api/quick-folders', (req, res) => {
  try {
    const homeDir = process.env.USERPROFILE || process.env.HOME;
    const quickFolders = [];

    if (process.platform === 'win32') {
      quickFolders.push(
        { name: 'Desktop', path: path.join(homeDir, 'Desktop'), icon: '🖥️' },
        { name: 'Documents', path: path.join(homeDir, 'Documents'), icon: '📄' },
        { name: 'Downloads', path: path.join(homeDir, 'Downloads'), icon: '⬇️' },
        { name: 'Pictures', path: path.join(homeDir, 'Pictures'), icon: '🖼️' },
        { name: 'Videos', path: path.join(homeDir, 'Videos'), icon: '🎬' },
        { name: 'Music', path: path.join(homeDir, 'Music'), icon: '🎵' }
      );
    } else {
      quickFolders.push(
        { name: 'Home', path: homeDir, icon: '🏠' },
        { name: 'Desktop', path: path.join(homeDir, 'Desktop'), icon: '🖥️' },
        { name: 'Documents', path: path.join(homeDir, 'Documents'), icon: '📄' },
        { name: 'Downloads', path: path.join(homeDir, 'Downloads'), icon: '⬇️' }
      );
    }

    res.json({ folders: quickFolders });
  } catch (error) {
    console.error('Get quick folders error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
