import React, { useState, useCallback, useMemo } from 'react';
import {
  Layout,
  FileCode,
  BookOpen,
  Download,
  Cpu
} from 'lucide-react';

import { INITIAL_FILE_SYSTEM, SOURCE_FILES } from './constants';
import { AppState, FileSystemState, LogEntry, MoveAction, Tab, FileNode, SortOption } from './types';
import { detectFileCategory, type DetectionResult } from './utils/detectionRules';
import { FileTree, OptimizedFileTree } from './components/FileTree';
import { FolderBrowser } from './components/FolderBrowser';
import { Simulator } from './components/Simulator';

// --- Helper Components ---

const TabButton: React.FC<{ 
  active: boolean; 
  label: string; 
  icon: React.ElementType;
  onClick: () => void 
}> = ({ active, label, icon: Icon, onClick }) => (
  <button 
    onClick={onClick}
    className={`
      px-4 py-2 rounded text-xs font-bold transition-all flex items-center gap-2
      ${active 
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}
    `}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('SIMULATOR');
  const [fileSystem, setFileSystem] = useState<FileSystemState>(INITIAL_FILE_SYSTEM);
  const [proposedMoves, setProposedMoves] = useState<MoveAction[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [progress, setProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('name-asc');
  const [scanPath, setScanPath] = useState<string>('');
  const [useRealFS, setUseRealFS] = useState(false);
  const [scanDepth, setScanDepth] = useState(3);
  const [showFolderBrowser, setShowFolderBrowser] = useState(false);

  const addLog = useCallback((msg: string, type: LogEntry['type'] = 'info') => {
    const ts = new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs(prev => [{ msg, type, timestamp: ts }, ...prev]);
  }, []);

  // Get user's home directory on mount
  React.useEffect(() => {
    fetch('/api/user-home')
      .then(res => res.json())
      .then(data => setScanPath(data.path))
      .catch(err => console.error('Failed to get home directory:', err));
  }, []);

  // --- File System Logic (Search & Sort) ---

  // 1. Enrich with Recursive Size Calculation
  const enrichWithSizes = useCallback((node: FileNode): FileNode => {
    const traverse = (currentNode: FileNode): FileNode => {
      const enrichedChildren = currentNode.children?.map(traverse) || [];
      
      // Sum children if folder and no childrenSum provided, otherwise use node.size
      let size = currentNode.size || 0;
      
      if (currentNode.type === 'folder') {
        const childrenSum = enrichedChildren.reduce((acc, child) => acc + (child.size || 0), 0);
        // For this simulation, we prioritize the calculated sum of children to be dynamic
        size = childrenSum;
      }

      return {
        ...currentNode,
        children: enrichedChildren,
        size
      };
    };
    return traverse(node);
  }, []);

  // 2. Sorting Logic
  const sortNodes = useCallback((nodes: FileNode[], option: SortOption): FileNode[] => {
    return [...nodes].sort((a, b) => {
      if (option === 'name-asc') return a.name.localeCompare(b.name);
      if (option === 'name-desc') return b.name.localeCompare(a.name);
      
      const sizeA = a.size || 0;
      const sizeB = b.size || 0;
      
      // Sort by size, then name as tie-breaker
      if (option === 'size-asc') return (sizeA - sizeB) || a.name.localeCompare(b.name);
      if (option === 'size-desc') return (sizeB - sizeA) || a.name.localeCompare(b.name);
      
      return 0;
    });
  }, []);

  // 3. Recursive Tree Sorting
  const sortTreeRecursive = useCallback((node: FileNode, option: SortOption): FileNode => {
    if (!node.children || node.children.length === 0) return node;

    const sortedChildren = sortNodes(node.children, option).map(child => 
      sortTreeRecursive(child, option)
    );

    return { ...node, children: sortedChildren };
  }, [sortNodes]);

  // 4. Search/Filter Logic
  const filterFileNode = useCallback((node: FileNode, query: string): FileNode | null => {
    // If the node name matches, return it (preserve its pre-calculated size)
    if (node.name.toLowerCase().includes(query.toLowerCase())) {
      return node;
    }

    // If node has children, check them
    if (node.children) {
      const filteredChildren = node.children
        .map(child => filterFileNode(child, query))
        .filter((child): child is FileNode => child !== null);

      // If any children matched, return this node with filtered children
      if (filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren
        };
      }
    }

    // No match here or in children
    return null;
  }, []);

  // 5. Combined Memoized Tree
  const processedRoot = useMemo(() => {
    // A. Enrich (Calculate sizes first based on full tree)
    const enriched = enrichWithSizes(fileSystem.root);

    // B. Filter
    let processed = searchQuery.trim() 
      ? filterFileNode(enriched, searchQuery) 
      : enriched;

    // Handle empty result from filter
    if (!processed) {
      processed = { ...fileSystem.root, children: [] };
    }

    // C. Sort
    return sortTreeRecursive(processed, sortOption);
  }, [fileSystem, searchQuery, sortOption, enrichWithSizes, filterFileNode, sortTreeRecursive]);


  // --- Engine Logic ---

  const runMoveDetection = useCallback((root: FileNode) => {
    const moves: MoveAction[] = [];

    // Recursive scan helper using detection rules
    const scanNodes = (nodes: FileNode[], parentName: string = '') => {
      nodes.forEach(item => {
         // Special handling for _UNSORTED_DESKTOP
         if (item.name === '_UNSORTED_DESKTOP') {
           moves.push({
             item,
             target: 'VACUUM',
             reason: 'Cleanup'
           } as MoveAction);
           if (item.children) scanNodes(item.children, item.name);
           return;
         }

         // Use the detection rules system
         const detection: DetectionResult | null = detectFileCategory(item, item.children || null);

         // If detection found a match, create a move action
         if (detection) {
           moves.push({
             item,
             target: detection.target,
             reason: detection.reason
           } as MoveAction);
         } else if (parentName === '_UNSORTED_DESKTOP' && item.type === 'file') {
           // Default to Inbox for unsorted desktop items with no classification
           moves.push({
             item,
             target: '00_Inbox',
             reason: 'Inbox Item'
           } as MoveAction);
         }

         // Recursively scan children if it's a folder (but not for items already marked for VACUUM)
         if (item.type === 'folder' && item.children && item.children.length > 0 &&
             (!detection || detection.target !== 'VACUUM')) {
           scanNodes(item.children, item.name);
         }
      });
    };

    if (root.children) {
      scanNodes(root.children);
    }

    setProposedMoves(moves);
    addLog(`Scan Complete. ${moves.length} optimization actions identified.`, "success");
    setProgress(100);
    setAppState('REVIEW');
  }, [addLog]);

  const runScan = async () => {
    setAppState('SCANNING');
    addLog("Initializing Heuristic Engine v3.0.0...", "system");
    setProgress(10);

    // If using real file system, call API
    if (useRealFS && scanPath) {
      try {
        addLog(`Scanning real directory: ${scanPath}`, "info");
        setProgress(30);

        const response = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: scanPath, maxDepth: scanDepth })
        });

        if (!response.ok) {
          throw new Error('Failed to scan directory');
        }

        const data = await response.json();
        setFileSystem({ root: data.root });
        addLog("Real file system loaded successfully", "success");
        setProgress(60);

        // Continue with move detection
        setTimeout(() => {
          runMoveDetection(data.root);
        }, 500);
      } catch (error) {
        addLog(`Error scanning directory: ${error instanceof Error ? error.message : 'Unknown error'}`, "error");
        setAppState('IDLE');
        setProgress(0);
      }
      return;
    }

    // Original mock scan logic
    setTimeout(() => {
      addLog("Scanning mock directory structure at C:/Users/Developer...", "info");
      setProgress(40);

      setTimeout(() => {
        setProgress(80);
        runMoveDetection(fileSystem.root);
      }, 800);
    }, 800);
  };

  const execute = () => {
    setAppState('PROCESSING');
    let currentStep = 0;
    const totalSteps = proposedMoves.length;
    
    const interval = setInterval(() => {
      if (currentStep >= totalSteps) {
        clearInterval(interval);
        setAppState('EXECUTED');
        addLog("Orchestration Complete. Workspace reorganized to v3 Standard.", "success");
        return;
      }
      const move = proposedMoves[currentStep];
      if (move.target === 'VACUUM') addLog(`Vacuumed: ${move.item.name}`, "archive");
      else addLog(`Moved: ${move.item.name} -> ${move.target}`, "action");
      
      setProgress(((currentStep + 1) / totalSteps) * 100);
      currentStep++;
    }, 300);
  };

  const undo = () => {
    addLog("Reverting transaction log...", "warn");
    setTimeout(() => {
      setAppState('IDLE');
      setProposedMoves([]);
      setLogs([]);
      setProgress(0);
      addLog("Rollback successful. State restored.", "success");
    }, 1000);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/50">
            <Layout className="text-white w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-white text-lg leading-none tracking-tight">THE ORCHESTRATOR</h1>
            <div className="text-[10px] text-blue-400 font-bold tracking-[0.2em] mt-1 uppercase opacity-80">Phase 6 • Production Suite</div>
          </div>
        </div>
        <div className="flex gap-2">
          <TabButton 
            active={activeTab === 'SIMULATOR'} 
            label="SIMULATOR" 
            icon={Cpu}
            onClick={() => setActiveTab('SIMULATOR')} 
          />
          <TabButton 
            active={activeTab === 'SOURCE_CODE'} 
            label="SOURCE" 
            icon={FileCode}
            onClick={() => setActiveTab('SOURCE_CODE')} 
          />
          <TabButton 
            active={activeTab === 'DOCS'} 
            label="DOCS" 
            icon={BookOpen}
            onClick={() => setActiveTab('DOCS')} 
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex relative">
        
        {/* --- SIMULATOR TAB --- */}
        {activeTab === 'SIMULATOR' && (
          <Simulator
            appState={appState}
            progress={progress}
            useRealFS={useRealFS}
            setUseRealFS={setUseRealFS}
            scanPath={scanPath}
            setScanPath={setScanPath}
            scanDepth={scanDepth}
            setScanDepth={setScanDepth}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortOption={sortOption}
            setSortOption={setSortOption}
            processedRoot={processedRoot}
            proposedMoves={proposedMoves}
            logs={logs}
            runScan={runScan}
            execute={execute}
            undo={undo}
            setShowFolderBrowser={setShowFolderBrowser}
          />
        )}

        {/* --- SOURCE CODE TAB --- */}
        {activeTab === 'SOURCE_CODE' && (
          <div className="w-full flex bg-[#0d1117] absolute inset-0">
            <div className="w-64 border-r border-slate-800 bg-slate-950">
              <div className="p-4 font-bold text-slate-400 text-xs tracking-wider border-b border-slate-800">PROJECT FILES</div>
              <div className="p-2">
                {Object.keys(SOURCE_FILES).map((file) => (
                  <div key={file} className="flex items-center gap-2 text-sm text-slate-400 p-2 rounded cursor-pointer hover:bg-slate-900 hover:text-blue-400 transition-colors">
                    <FileCode className="w-4 h-4" /> {file}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
               <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex justify-between items-center shadow-sm">
                 <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-bold text-slate-300">orchestrator.js</span>
                 </div>
                 <button className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors">
                    <Download className="w-3 h-3"/> Download Raw
                 </button>
               </div>
               <div className="flex-1 overflow-auto p-6 bg-[#0d1117]">
                  <pre className="font-mono text-xs leading-relaxed text-emerald-400 tab-4">
                    {SOURCE_FILES["orchestrator.js"]}
                  </pre>
               </div>
            </div>
          </div>
        )}

        {/* --- DOCS TAB --- */}
        {activeTab === 'DOCS' && (
          <div className="w-full absolute inset-0 overflow-y-auto bg-slate-950 p-8 md:p-12">
            <div className="max-w-5xl mx-auto space-y-12">
              
              {/* Header */}
              <div className="text-center border-b border-slate-800 pb-12">
                <div className="inline-block p-3 bg-blue-600/10 rounded-xl mb-4 border border-blue-600/20">
                  <Layout className="w-10 h-10 text-blue-500" />
                </div>
                <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
                  The Orchestrator
                </h1>
                <p className="text-xl md:text-2xl text-slate-400 font-light">
                  "Turn your hard drive into a professional workspace in 5 minutes."
                </p>
                <div className="mt-6 flex justify-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <span>Version 3.0.0</span>
                  <span>•</span>
                  <span>Input-Output Flow</span>
                </div>
              </div>

              {/* Executive Summary */}
              <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                  <span className="text-blue-500">01.</span> Executive Summary
                </h2>
                <p className="text-slate-400 leading-relaxed text-lg">
                  The Orchestrator is an automated, context-aware file system management tool designed specifically for developers. Unlike generic file organizers, it understands code. It distinguishes between a Python script and a Python Environment, detects Unity projects by their asset structure, and automatically archives stale repositories based on inactivity.
                </p>
              </section>

              {/* Directory Strategy */}
              <section>
                 <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="text-blue-500">02.</span> The Input-Output Flow Strategy
                </h2>
                <div className="bg-[#0d1117] p-6 rounded-xl border border-slate-800 font-mono text-xs md:text-sm text-slate-300 leading-relaxed overflow-x-auto">
<pre>{`C:\\Users\\Developer\\
├── 00_Inbox/                (Unsorted Downloads & Desktop clutter)
│
├── 01_Build/                (Active Creation)
│   ├── Web/                 (React, NextJS, Vue)
│   ├── Data/                (Python, Notebooks)
│   └── Interactive/         (Unity, Unreal, Mobile)
│
├── 02_Studio/               (The Environment)
│   ├── Config/              (Dotfiles, Shell scripts)
│   ├── SDKs/                (Runtimes)
│   └── Tools/               (Portable binaries)
│
├── 03_Library/              (Reference Material)
│   ├── Books/
│   └── Cheatsheets/
│
├── 04_Private/              (Personal Life)
│   ├── Financial/
│   ├── Legal/
│   └── Identity/
│
├── 05_Stage/                (Outputs & Deliverables)
│   ├── Exports/             (PDFs, Final Builds)
│   └── Screenshots/
│
└── 99_Archives/             (Cold Storage)
    ├── 2023/
    └── 2024/`}
</pre>
                </div>
              </section>

              {/* Feature Set */}
              <section>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <span className="text-blue-500">03.</span> Feature Set
                </h2>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { title: "Atomic Execution", desc: "Files moved one by one. Logs errors without crashing.", icon: Zap },
                    { title: "Smart Collision", desc: "Never overwrites. Renames to file (1).txt automatically.", icon: Layers },
                    { title: "Undo System", desc: "JSON transaction log allows one-click rollback.", icon: RotateCcw },
                    { title: "Vacuum Mode", desc: "Recursively deletes empty directories after cleanup.", icon: Trash2 },
                    { title: "Watch Mode", desc: "Background daemon scans folder every 60 seconds.", icon: Archive },
                    { title: "Reporting", desc: "Generates HTML report after every run.", icon: FileText },
                  ].map((f) => (
                    <div key={f.title} className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
                      <f.icon className="w-6 h-6 text-blue-400 mb-3" />
                      <h4 className="font-bold text-slate-200 mb-1">{f.title}</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* How to Operate */}
              <section className="bg-blue-900/10 border border-blue-900/30 p-8 rounded-2xl">
                <h2 className="text-2xl font-bold text-white mb-6">How to Operate</h2>
                <div className="grid md:grid-cols-2 gap-12">
                  <div>
                    <h3 className="text-lg font-bold text-blue-400 mb-4">Manual Cleanup</h3>
                    <ol className="space-y-4">
                      {[
                        "Double-click Orchestrator_Launcher.bat",
                        "Press [1] SCAN to generate a plan (preview)",
                        "Press [2] RUN to execute the moves",
                        "Review orchestrator_report.html"
                      ].map((step, i) => (
                        <li key={step} className="flex gap-3 text-sm text-slate-300">
                          <span className="font-bold text-blue-500">{i+1}.</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-emerald-400 mb-4">Automatic Maintenance</h3>
                    <ol className="space-y-4">
                      {[
                        "Double-click Orchestrator_Launcher.bat",
                        "Press [4] WATCH",
                        "Minimize the window",
                        "Files dropped are sorted within 60s"
                      ].map((step, i) => (
                        <li key={step} className="flex gap-3 text-sm text-slate-300">
                          <span className="font-bold text-emerald-500">{i+1}.</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </section>

            </div>
          </div>
        )}
      </div>

      {/* Folder Browser Modal */}
      <FolderBrowser
        isOpen={showFolderBrowser}
        onClose={() => setShowFolderBrowser(false)}
        onSelect={(path) => setScanPath(path)}
        currentPath={scanPath}
      />
    </div>
  );
}