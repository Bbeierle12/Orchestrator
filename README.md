# The Orchestrator v3.0 - Real File System Edition

**Turn your hard drive into a professional workspace in 5 minutes.**

## Overview

The Orchestrator is an automated, context-aware file system management tool designed specifically for developers. It intelligently analyzes your directories and proposes organizational improvements based on the Input-Output Flow strategy.

## Features

### 🎯 Two Modes of Operation

1. **Simulation Mode** - Demo the tool with sample data (safe testing)
2. **Real File System Mode** - Analyze and organize actual directories on your computer

### 🧠 Intelligent Heuristics

- **Project Detection**: Identifies NextJS, Unity, PyTorch projects automatically
- **File Categorization**: Recognizes invoices, legal docs, medical records, books, etc.
- **Staleness Detection**: Flags projects inactive for 180+ days for archival
- **Empty Directory Cleanup**: Identifies and removes empty folders
- **Config File Management**: Detects dotfiles and SDK directories

### 🔍 Advanced File Tree Features

- **Search & Filter**: Quickly find files across deep directory structures
- **Multiple Sort Options**: Sort by name (A-Z, Z-A) or size (largest/smallest)
- **Size Calculation**: Displays file and folder sizes with recursive totals
- **Expandable Tree**: Navigate complex directory hierarchies easily

## Directory Strategy: Input-Output Flow

```
C:\Users\Developer\
├── 00_Inbox/              (Unsorted Downloads & Desktop clutter)
├── 01_Build/              (Active Creation)
│   ├── Web/               (React, NextJS, Vue)
│   ├── Data/              (Python, Notebooks)
│   └── Interactive/       (Unity, Unreal, Mobile)
├── 02_Studio/             (The Environment)
│   ├── Config/            (Dotfiles, Shell scripts)
│   ├── SDKs/              (Runtimes)
│   └── Tools/             (Portable binaries)
├── 03_Library/            (Reference Material)
│   ├── Books/
│   └── Cheatsheets/
├── 04_Private/            (Personal Life)
│   ├── Financial/
│   ├── Legal/
│   ├── Medical/
│   └── Identity/
├── 05_Stage/              (Outputs & Deliverables)
│   ├── Exports/           (PDFs, Final Builds)
│   └── Screenshots/
└── 99_Archives/           (Cold Storage)
    ├── 2023/
    └── 2024/
```

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd Orchestrator

# Install dependencies
npm install
```

## Usage

### Running the Application

#### Option 1: Run Both Frontend and Backend Together

```bash
npm start
```

This starts both the backend API server (port 3001) and the frontend dev server (port 5173).

#### Option 2: Run Separately

**Terminal 1 - Backend Server:**
```bash
npm run server
```

**Terminal 2 - Frontend Dev Server:**
```bash
npm run dev
```

Then open your browser to `http://localhost:5173`

### Using Simulation Mode (Default)

1. The app starts in **Simulation Mode** by default
2. Click "START HEURISTIC SCAN" to analyze the demo file system
3. Review proposed file moves in the middle panel
4. Click "EXECUTE ORCHESTRATION" to simulate the reorganization
5. View terminal output showing all operations

**Note:** Simulation mode is completely safe - no files are touched on your computer.

### Using Real File System Mode

⚠️ **CAUTION**: This mode performs actual file operations. Always test on a backup directory first!

#### Step 1: Enable Real File System Mode

1. In the top configuration bar, click the **"SIMULATION"** button to toggle to **"REAL FILES"** mode
2. The button will turn green and display **"REAL FILES"**

#### Step 2: Configure Target Directory

1. Enter the full path to the directory you want to organize in the "Target" input field
   - **Linux/Mac**: `/home/username/Documents` or `/Users/username/Desktop`
   - **Windows**: `C:\Users\YourName\Desktop` or `C:\Users\YourName\Documents`

2. Example paths:
   ```
   Linux:   /home/john/messy-folder
   Mac:     /Users/john/Downloads
   Windows: C:\Users\John\Desktop\Projects
   ```

#### Step 3: Scan Your Directory

1. Click **"START HEURISTIC SCAN"**
2. The backend will:
   - Scan your directory structure (up to 5 levels deep)
   - Calculate file and folder sizes
   - Determine file ages
   - Apply heuristics to propose moves

3. Review the proposed actions in the middle panel

#### Step 4: Execute (Optional)

⚠️ **WARNING**: This will move and delete actual files!

1. Carefully review all proposed moves
2. Only proceed if you're confident about the changes
3. Click **"EXECUTE ORCHESTRATION"**
4. Watch the terminal output for real-time progress

## Safety Features

### When Using Real Files

- **Collision Handling**: If a file already exists at the destination, it's renamed (e.g., `file (1).txt`)
- **Error Handling**: Errors are logged but don't crash the entire operation
- **Atomic Operations**: Files are moved one at a time
- **Transaction Logging**: All operations are logged with timestamps

### Recommended Workflow

1. **Start with Simulation**: Get familiar with how the tool works
2. **Create a Test Directory**: Make a copy of files you want to organize
3. **Scan the Test Directory**: Use real file mode on the test copy
4. **Review Carefully**: Check all proposed moves before executing
5. **Execute on Test First**: Verify the results are what you expect
6. **Scale to Production**: Once confident, use on your actual directories

## API Endpoints

The backend server exposes these endpoints:

- `GET /api/health` - Health check
- `GET /api/home` - Get user's home directory path
- `POST /api/scan` - Scan a directory
  ```json
  {
    "targetPath": "/path/to/directory",
    "maxDepth": 5
  }
  ```
- `POST /api/execute` - Execute file moves
  ```json
  {
    "moves": [...],
    "basePath": "/path/to/directory"
  }
  ```

## Architecture

### Frontend (React + Vite)
- `App.tsx` - Main application with state management
- `FileTree.tsx` - Recursive file tree components
- `types.ts` - TypeScript type definitions
- `constants.ts` - Simulation data

### Backend (Node.js + Express)
- `server/index.js` - REST API server
- Endpoints for directory scanning and file operations
- Recursive directory traversal with size/age calculation

## Development

### Project Structure

```
Orchestrator/
├── server/
│   └── index.js          # Backend API server
├── components/
│   └── FileTree.tsx      # File tree UI components
├── App.tsx               # Main React application
├── types.ts              # Type definitions
├── constants.ts          # Simulation data
├── config.json           # Configuration file
├── package.json
└── README.md
```

### Scripts

- `npm run dev` - Start frontend only (Vite dev server)
- `npm run server` - Start backend only (Express API)
- `npm start` - Start both frontend and backend
- `npm run build` - Build for production

## Troubleshooting

### Backend Server Won't Start

- Make sure port 3001 is available
- Check that dependencies are installed: `npm install`
- Verify Node.js version is 16+ with: `node --version`

### Frontend Can't Connect to Backend

- Ensure backend is running on `http://localhost:3001`
- Check browser console for CORS errors
- Verify the `apiUrl` in App.tsx matches your backend URL

### Scan Fails on Real Directory

- Check that the directory path is correct and accessible
- Verify you have read permissions for the directory
- Try a shallower directory if it's very deep/large
- Check the terminal output for specific error messages

### Permission Errors During Execution

- Make sure you have write permissions for both source and destination
- On Linux/Mac, you may need to adjust file permissions
- Try running on a directory you own completely

## Future Enhancements

- [ ] Undo/Rollback functionality for real file operations
- [ ] Watch mode for automatic background organization
- [ ] Custom rule configuration
- [ ] HTML report generation
- [ ] Dry-run preview before execution
- [ ] Progress indicators for large operations
- [ ] Multiple directory support

## License

MIT License - Use at your own risk. Always backup important files before using real file system mode.

## Version

**v3.0.0** - Real File System Edition
- Added real directory scanning via Node.js backend
- Toggle between simulation and real file modes
- Live file operations with collision handling
- Enhanced error reporting and logging
