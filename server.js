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

// Helper function to validate and sanitize paths
function validatePath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Invalid path');
  }

  // Normalize the path to prevent directory traversal
  const normalizedPath = path.normalize(inputPath);
  const resolvedPath = path.resolve(normalizedPath);

  // Check for directory traversal attempts
  if (inputPath.includes('..') || inputPath.includes('./')) {
    throw new Error('Directory traversal detected');
  }

  // Additional checks for Windows
  if (process.platform === 'win32') {
    // Check for UNC paths or network shares
    if (normalizedPath.startsWith('\\\\')) {
      throw new Error('Network paths are not allowed');
    }
  }

  return resolvedPath;
}

// Helper function to validate depth parameter
function validateDepth(depth) {
  const parsedDepth = parseInt(depth);
  if (isNaN(parsedDepth) || parsedDepth < 1 || parsedDepth > 10) {
    return 3; // Default safe value
  }
  return parsedDepth;
}

// Helper function to get file stats
// Returns size in KB (kilobytes) to match frontend expectations
async function getFileStats(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return {
      size: Math.round(stats.size / 1024), // Convert bytes to KB
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

    // Validate and sanitize inputs
    const validatedPath = validatePath(scanPath);
    const validatedDepth = validateDepth(maxDepth);

    console.log(`Scanning directory: ${validatedPath} with depth: ${validatedDepth}`);
    const result = await scanDirectory(validatedPath, validatedDepth);

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

        // Validate paths
        const validatedSource = sourcePath ? validatePath(sourcePath) : null;
        const validatedTarget = targetPath ? validatePath(targetPath) : null;

        if (action === 'delete') {
          if (!validatedSource) throw new Error('Source path is required for delete action');
          await fs.rm(validatedSource, { recursive: true, force: true });
          results.push({ success: true, path: validatedSource, action: 'deleted' });
        } else if (action === 'move') {
          if (!validatedSource || !validatedTarget) throw new Error('Source and target paths are required for move action');
          // Ensure target directory exists
          await fs.mkdir(path.dirname(validatedTarget), { recursive: true });
          await fs.rename(validatedSource, validatedTarget);
          results.push({ success: true, from: validatedSource, to: validatedTarget, action: 'moved' });
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

    // Validate and sanitize the path
    const validatedPath = validatePath(dirPath);

    const entries = await fs.readdir(validatedPath, { withFileTypes: true });
    const folders = entries
      .filter(entry => entry.isDirectory())
      .map(entry => ({
        name: entry.name,
        path: path.join(validatedPath, entry.name)
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
