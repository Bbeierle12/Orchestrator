import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Helper function to get file size in KB
async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return Math.round(stats.size / 1024); // Convert bytes to KB
  } catch (error) {
    return 0;
  }
}

// Helper function to get file age in days
async function getFileAge(filePath) {
  try {
    const stats = await fs.stat(filePath);
    const now = new Date();
    const mtime = new Date(stats.mtime);
    const diffTime = Math.abs(now - mtime);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch (error) {
    return 0;
  }
}

// Recursive function to scan directory and build file tree
async function scanDirectory(dirPath, maxDepth = 10, currentDepth = 0) {
  if (currentDepth >= maxDepth) {
    return null;
  }

  try {
    const stats = await fs.stat(dirPath);
    const name = path.basename(dirPath);

    if (!stats.isDirectory()) {
      return {
        name,
        type: 'file',
        size: await getFileSize(dirPath),
        age: await getFileAge(dirPath)
      };
    }

    // It's a directory
    const entries = await fs.readdir(dirPath);
    const children = [];

    for (const entry of entries) {
      // Skip hidden files/folders (except specific ones we want to see)
      if (entry.startsWith('.') && !entry.match(/^\.(git|zsh|bash|dotnet|config)/)) {
        continue;
      }

      const fullPath = path.join(dirPath, entry);
      try {
        const childNode = await scanDirectory(fullPath, maxDepth, currentDepth + 1);
        if (childNode) {
          children.push(childNode);
        }
      } catch (error) {
        // Skip files/folders we can't access
        console.warn(`Skipping ${fullPath}: ${error.message}`);
      }
    }

    // Calculate folder size as sum of children
    const folderSize = children.reduce((acc, child) => acc + (child.size || 0), 0);

    return {
      name,
      type: 'folder',
      children,
      size: folderSize,
      age: await getFileAge(dirPath)
    };
  } catch (error) {
    console.error(`Error scanning ${dirPath}:`, error.message);
    return null;
  }
}

// API Endpoints

// Get file system structure
app.post('/api/scan', async (req, res) => {
  try {
    const { targetPath, maxDepth = 5 } = req.body;

    if (!targetPath) {
      return res.status(400).json({ error: 'targetPath is required' });
    }

    // Verify path exists
    try {
      await fs.access(targetPath);
    } catch (error) {
      return res.status(404).json({ error: 'Path not found or not accessible' });
    }

    const root = await scanDirectory(targetPath, maxDepth);

    if (!root) {
      return res.status(500).json({ error: 'Failed to scan directory' });
    }

    res.json({
      root: {
        name: targetPath,
        type: 'folder',
        children: root.type === 'folder' ? root.children : [root],
        size: root.size
      }
    });
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Execute file moves
app.post('/api/execute', async (req, res) => {
  try {
    const { moves, basePath } = req.body;

    if (!moves || !Array.isArray(moves)) {
      return res.status(400).json({ error: 'moves array is required' });
    }

    if (!basePath) {
      return res.status(400).json({ error: 'basePath is required' });
    }

    const results = [];
    const errors = [];

    for (const move of moves) {
      try {
        const { sourcePath, targetPath, operation } = move;

        if (operation === 'VACUUM') {
          // Delete file/folder
          try {
            const stats = await fs.stat(sourcePath);
            if (stats.isDirectory()) {
              await fs.rm(sourcePath, { recursive: true });
            } else {
              await fs.unlink(sourcePath);
            }
            results.push({ sourcePath, operation: 'deleted', success: true });
          } catch (error) {
            errors.push({ sourcePath, error: error.message });
          }
        } else {
          // Move file/folder
          const fullTargetPath = path.join(basePath, targetPath);

          // Create target directory if it doesn't exist
          const targetDir = path.dirname(fullTargetPath);
          await fs.mkdir(targetDir, { recursive: true });

          // Handle collision - rename if file exists
          let finalPath = fullTargetPath;
          let counter = 1;
          while (true) {
            try {
              await fs.access(finalPath);
              // File exists, try next number
              const ext = path.extname(fullTargetPath);
              const base = path.basename(fullTargetPath, ext);
              const dir = path.dirname(fullTargetPath);
              finalPath = path.join(dir, `${base} (${counter})${ext}`);
              counter++;
            } catch {
              // File doesn't exist, we can use this path
              break;
            }
          }

          // Move the file
          await fs.rename(sourcePath, finalPath);
          results.push({
            sourcePath,
            targetPath: finalPath,
            operation: 'moved',
            success: true
          });
        }
      } catch (error) {
        errors.push({
          move,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      results,
      errors,
      summary: {
        total: moves.length,
        succeeded: results.length,
        failed: errors.length
      }
    });
  } catch (error) {
    console.error('Execute error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get home directory path
app.get('/api/home', async (req, res) => {
  try {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    res.json({ path: homeDir });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '3.0.0' });
});

app.listen(PORT, () => {
  console.log(`🚀 Orchestrator Server running on http://localhost:${PORT}`);
  console.log(`📁 Ready to scan directories`);
});
