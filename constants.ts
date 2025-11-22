import { FileSystemState } from './types';

export const INITIAL_FILE_SYSTEM: FileSystemState = {
  root: {
    name: "C:/Users/Developer",
    type: "folder",
    children: [
      { name: "_UNSORTED_DESKTOP", type: "folder", children: [
          { name: "random_note.txt", type: "file", size: 2 },
          { name: "downloaded_setup.exe", type: "file", size: 54000 },
          { name: "Final_Presentation_Export.pdf", type: "file", size: 4500 }
      ], size: 58502 },
      { name: ".gitconfig", type: "file", category: "config", age: 5, size: 2 },
      { name: ".zshrc", type: "file", category: "config", age: 5, size: 4 },
      { 
        name: "NextJS-Dashboard", 
        type: "folder", 
        age: 2, 
        children: [
          { name: "package.json", type: "file", size: 4 }, 
          { name: "src", type: "folder", children: [], size: 120 }
        ] 
      },
      {
        name: "Clean_Architecture_Book.pdf",
        type: "file",
        age: 4,
        size: 15000
      },
      {
        name: "React_Patterns_Cheatsheet.md",
        type: "file",
        age: 20,
        size: 12
      },
      {
        name: "PyTorch_Model_Training",
        type: "folder",
        age: 15,
        children: [
            { name: "venv", type: "folder", children: [], size: 450000 },
            { name: "requirements.txt", type: "file", size: 1 }
        ]
      },
      { 
        name: "Old_Unity_Prototype_v1", 
        type: "folder", 
        age: 400, 
        children: [
          { name: "Assets", type: "folder", children: [], size: 2500000 }
        ] 
      },
      { name: "Invoice_Design_Services.pdf", type: "file", age: 10, size: 450 },
      { name: "NDA_Client_X.docx", type: "file", age: 12, size: 24 },
      { name: "Blood_Work_Results.pdf", type: "file", age: 3, size: 1200 },
      { name: "Passport_Scan_2024.jpg", type: "file", age: 45, size: 3500 },
      { 
        name: ".dotnet", 
        type: "folder", 
        age: 300, 
        children: [
          { name: "sdk", type: "folder", children: [], size: 800000 }
        ] 
      },
      { name: "Empty_Project", type: "folder", children: [], age: 100, size: 0 },
      { name: "App_Screenshot_v1.png", type: "file", age: 1, size: 2500 }
    ]
  }
};

export const SOURCE_FILES = {
  "orchestrator.js": `/**
 * THE ORCHESTRATOR - Production Build v3.0.0
 * 
 * Strategy: "Input-Output Flow"
 * Inbox -> Build -> Studio -> Library -> Stage -> Private -> Archives
 */
const fs = require('fs');
const path = require('path');

const CONFIG = require('./orchestrator_config.json');

// --- HEURISTIC ENGINE ---

function scanDirectory(dir) {
  // 1. Build Detection (01_Build)
  if (detectWebProject(dir)) return '01_Build/Web';
  if (detectDataScience(dir)) return '01_Build/Data';
  if (detectGameDev(dir)) return '01_Build/Interactive';
  
  // 2. Library Detection (03_Library)
  if (isBookOrReference(dir)) return '03_Library/Books';

  // 3. Stage Detection (05_Stage)
  if (isDeliverable(dir)) return '05_Stage/Exports';

  // 4. Staleness Detection (99_Archives)
  if (isStale(dir, CONFIG.settings.archive_threshold_days)) {
    return \`99_Archives/\${new Date().getFullYear()}\`;
  }
  
  return null;
}
`,
  "orchestrator_config.json": `{
  "settings": {
    "archive_threshold_days": 180,
    "cleanup_empty_dirs": true,
    "collision_strategy": "rename"
  },
  "taxonomy": {
    "Financial": ["invoice", "receipt", "tax", "bill"],
    "Legal": ["contract", "nda", "license"],
    "Medical": ["doctor", "lab", "prescription"],
    "Identity": ["resume", "cv", "passport"],
    "Library": ["handbook", "manual", "guide", "cheatsheet", "book"],
    "Stage": ["export", "build", "release", "final", "screenshot"]
  }
}`,
  "package.json": `{
  "name": "the-orchestrator",
  "version": "3.0.0",
  "description": "Automated file system organizer",
  "main": "orchestrator.js",
  "scripts": {
    "scan": "node orchestrator.js scan",
    "run": "node orchestrator.js run",
    "watch": "node orchestrator.js watch"
  }
}`,
  "Orchestrator_Launcher.bat": `@echo off
:MENU
cls
echo THE ORCHESTRATOR v3.0
echo ---------------------
echo [1] SCAN (Preview)
echo [2] RUN (Execute)
echo [3] UNDO (Rollback)
echo [4] WATCH (Auto-Mode)
set /p choice="Select: "
if "%choice%"=="1" node orchestrator.js scan
if "%choice%"=="2" node orchestrator.js run
if "%choice%"=="3" node orchestrator.js undo
if "%choice%"=="4" node orchestrator.js watch
goto MENU`,
  "README.md": `# The Orchestrator v3.0

**Strategy:** Input-Output Flow

1. **00_Inbox**: Unsorted files.
2. **01_Build**: Active Code (Web, Data, Interactive).
3. **02_Studio**: Tools & Assets (Config, SDKs).
4. **03_Library**: Reference Materials.
5. **04_Private**: Personal Documents.
6. **05_Stage**: Deliverables & Screenshots.
7. **99_Archives**: Cold Storage.`
};