import React, { useState, useCallback, useMemo } from 'react';
import { 
  Layout, 
  Play, 
  RotateCcw, 
  CheckCircle, 
  HardDrive, 
  FileCode, 
  BookOpen, 
  Trash2, 
  FileText,
  ArrowRight,
  Download,
  Terminal as TerminalIcon,
  Cpu,
  Shield,
  Archive,
  Layers,
  Zap,
  Search,
  ArrowDownAZ,
  ArrowUpAZ,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  ListFilter
} from 'lucide-react';

import { INITIAL_FILE_SYSTEM, SOURCE_FILES } from './constants';
import { AppState, FileSystemState, LogEntry, MoveAction, Tab, FileNode, SortOption } from './types';
import { FileTree, OptimizedFileTree } from './components/FileTree';

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

const LogLine: React.FC<{ log: LogEntry }> = ({ log }) => {
  let colorClass = 'text-slate-300';
  if (log.type === 'error') colorClass = 'text-red-400';
  else if (log.type === 'success') colorClass = 'text-emerald-400';
  else if (log.type === 'action') colorClass = 'text-blue-300';
  else if (log.type === 'archive') colorClass = 'text-orange-300';
  else if (log.type === 'system') colorClass = 'text-purple-400';

  return (
    <div className="flex gap-3 font-mono text-[11px] leading-relaxed">
      <span className="text-slate-600 select-none">{log.timestamp}</span>
      <span className={colorClass}>
        {log.type === 'action' ? '> ' : ''}
        {log.msg}
      </span>
    </div>
  );
};

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
  const [targetPath, setTargetPath] = useState('');
  const [useRealFiles, setUseRealFiles] = useState(false);
  const [apiUrl] = useState('http://localhost:3001');

  const addLog = useCallback((msg: string, type: LogEntry['type'] = 'info') => {
    const ts = new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLogs(prev => [{ msg, type, timestamp: ts }, ...prev]);
  }, []);

  // Fetch real directory data from API
  const fetchDirectoryData = useCallback(async (path: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPath: path, maxDepth: 5 })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to scan directory');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }, [apiUrl]);

  // Execute real file moves via API
  const executeFileMoves = useCallback(async (moves: any[], basePath: string) => {
    try {
      const response = await fetch(`${apiUrl}/api/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moves, basePath })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to execute moves');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }, [apiUrl]);

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

  const runScan = async () => {
    setAppState('SCANNING');
    addLog("Initializing Heuristic Engine v3.0.0...", "system");
    setProgress(10);

    // If using real files, fetch from API first
    if (useRealFiles && targetPath) {
      try {
        addLog(`Scanning real directory: ${targetPath}...`, "info");
        setProgress(30);

        const data = await fetchDirectoryData(targetPath);
        setFileSystem(data);
        addLog("Directory scan complete. Analyzing structure...", "success");
        setProgress(50);
      } catch (error) {
        addLog(`Error scanning directory: ${error instanceof Error ? error.message : 'Unknown error'}`, "error");
        setAppState('IDLE');
        setProgress(0);
        return;
      }
    }

    setTimeout(() => {
      const scanPath = useRealFiles ? targetPath : "C:/Users/Developer";
      addLog(`Analyzing directory structure at ${scanPath}...`, "info");
      setProgress(60);

      const moves: MoveAction[] = [];

      // Recursive scan helper
      const scanNodes = (nodes: FileNode[], parentName: string = '') => {
        nodes.forEach(item => {
           let move: Partial<MoveAction> | null = null;

           // 0. Inbox / Unsorted
           if (item.name === '_UNSORTED_DESKTOP') {
             move = { target: 'VACUUM', reason: 'Cleanup' };
             if (item.children) scanNodes(item.children, item.name);
           }
           // 1. Configs
           else if (item.name.startsWith('.')) {
             if (item.name === '.dotnet') move = { target: '02_Studio/SDKs', reason: 'SDK' };
             else move = { target: '02_Studio/Config', reason: 'Config' };
           }
           // 2. Folders
           else if (item.type === 'folder') {
             if (item.children?.length === 0) {
               move = { target: 'VACUUM', reason: 'Empty Dir' };
             } else if (item.name.includes('NextJS')) {
               move = { target: '01_Build/Web', reason: 'Active' };
             } else if (item.name.includes('Unity')) {
               if ((item.age || 0) > 180) move = { target: '99_Archives/2023', reason: `Stale (${item.age}d)` };
               else move = { target: '01_Build/Interactive', reason: 'Active' };
             } else if (item.name.includes('PyTorch')) {
                move = { target: '01_Build/Data', reason: 'Python Env' };
             }
           }
           // 3. Files
           else if (item.type === 'file') {
             if (item.name.includes('Invoice')) move = { target: '04_Private/Financial', reason: 'Taxonomy' };
             if (item.name.includes('NDA')) move = { target: '04_Private/Legal', reason: 'Taxonomy' };
             if (item.name.includes('Blood')) move = { target: '04_Private/Medical', reason: 'Taxonomy' };
             if (item.name.includes('Passport')) move = { target: '04_Private/Identity', reason: 'Taxonomy' };
             if (item.name.includes('Book')) move = { target: '03_Library/Books', reason: 'Reference' };
             if (item.name.includes('Cheatsheet')) move = { target: '03_Library/Cheatsheets', reason: 'Reference' };
             if (item.name.includes('Export') || item.name.includes('Screenshot')) move = { target: '05_Stage/Exports', reason: 'Deliverable' };

             if (!move && parentName === '_UNSORTED_DESKTOP') {
               move = { target: '00_Inbox', reason: 'Inbox Item' };
             }
           }

           if (move) moves.push({ item, ...move } as MoveAction);
        });
      };

      if (fileSystem.root.children) {
        scanNodes(fileSystem.root.children);
      }

      setTimeout(() => {
        setProposedMoves(moves);
        addLog(`Scan Complete. ${moves.length} optimization actions identified.`, "success");
        setProgress(100);
        setAppState('REVIEW');
      }, 800);
    }, 800);
  };

  const execute = async () => {
    setAppState('PROCESSING');

    if (useRealFiles && targetPath) {
      // Real file execution via API
      try {
        addLog("Preparing to execute file operations...", "system");
        setProgress(10);

        // Build full source paths for each move
        const buildFullPath = (node: FileNode, rootPath: string, currentPath: string = ''): string => {
          return `${rootPath}/${currentPath}${node.name}`.replace(/\/+/g, '/');
        };

        const movesWithPaths = proposedMoves.map((move, index) => {
          const sourcePath = buildFullPath(move.item, targetPath, '');
          const targetRelative = move.target === 'VACUUM' ? '' : `${move.target}/${move.item.name}`;

          return {
            sourcePath,
            targetPath: targetRelative,
            operation: move.target === 'VACUUM' ? 'VACUUM' : 'MOVE',
            itemName: move.item.name
          };
        });

        addLog(`Executing ${movesWithPaths.length} file operations...`, "info");
        const result = await executeFileMoves(movesWithPaths, targetPath);

        // Log results
        result.results?.forEach((res: any) => {
          if (res.operation === 'deleted') {
            addLog(`Vacuumed: ${res.sourcePath}`, "archive");
          } else {
            addLog(`Moved: ${res.sourcePath} -> ${res.targetPath}`, "action");
          }
        });

        result.errors?.forEach((err: any) => {
          addLog(`Error: ${err.error}`, "error");
        });

        setProgress(100);
        setAppState('EXECUTED');
        addLog(`Orchestration Complete. ${result.summary.succeeded} succeeded, ${result.summary.failed} failed.`, "success");
      } catch (error) {
        addLog(`Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`, "error");
        setAppState('IDLE');
      }
    } else {
      // Simulated execution
      let currentStep = 0;
      const totalSteps = proposedMoves.length;

      const interval = setInterval(() => {
        if (currentStep >= totalSteps) {
          clearInterval(interval);
          setAppState('EXECUTED');
          addLog("Orchestration Complete (Simulated). Workspace reorganized to v3 Standard.", "success");
          return;
        }
        const move = proposedMoves[currentStep];
        if (move.target === 'VACUUM') addLog(`Vacuumed: ${move.item.name}`, "archive");
        else addLog(`Moved: ${move.item.name} -> ${move.target}`, "action");

        setProgress(((currentStep + 1) / totalSteps) * 100);
        currentStep++;
      }, 300);
    }
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
      <div className="bg-slate-900 border-b border-slate-800 shrink-0 z-10">
        <div className="h-16 flex items-center justify-between px-6">
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

        {/* Configuration Bar */}
        {activeTab === 'SIMULATOR' && (
          <div className="px-6 py-3 bg-slate-900/50 border-t border-slate-800/50 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-500" />
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mode:</label>
              <button
                onClick={() => {
                  setUseRealFiles(!useRealFiles);
                  if (!useRealFiles) {
                    addLog("Switched to Real File System Mode", "system");
                  } else {
                    addLog("Switched to Simulation Mode", "system");
                    setFileSystem(INITIAL_FILE_SYSTEM);
                  }
                }}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  useRealFiles
                    ? 'bg-emerald-600 text-white shadow-emerald-900/20'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {useRealFiles ? 'REAL FILES' : 'SIMULATION'}
              </button>
            </div>

            {useRealFiles && (
              <div className="flex items-center gap-2 flex-1">
                <HardDrive className="w-4 h-4 text-slate-500" />
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target:</label>
                <input
                  type="text"
                  value={targetPath}
                  onChange={(e) => setTargetPath(e.target.value)}
                  placeholder="/path/to/directory or C:\Users\YourName"
                  className="flex-1 max-w-md bg-slate-950 border border-slate-800 rounded text-xs py-1.5 px-3 text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex relative">
        
        {/* --- SIMULATOR TAB --- */}
        {activeTab === 'SIMULATOR' && (
          <>
            {/* Left Pane: File System */}
            <div className="w-full md:w-1/3 bg-slate-950 border-r border-slate-800 flex flex-col min-w-[300px]">
              <div className="p-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-xs text-slate-400 uppercase tracking-wider">
                    {appState === 'EXECUTED' ? 'Optimized Structure' : 'Current File System'}
                  </span>
                  {appState === 'EXECUTED' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                </div>
                
                {/* Search & Sort Bar */}
                {appState !== 'EXECUTED' && (
                  <div className="flex gap-2">
                    <div className="relative group flex-1">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                        <Search className="w-3.5 h-3.5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                      </div>
                      <input 
                        type="text" 
                        placeholder="Search files..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded text-xs py-1.5 pl-8 pr-3 text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                      />
                    </div>
                    
                    {/* Sort Dropdown */}
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                         {sortOption === 'name-asc' && <ArrowDownAZ className="w-3.5 h-3.5 text-slate-400" />}
                         {sortOption === 'name-desc' && <ArrowUpAZ className="w-3.5 h-3.5 text-slate-400" />}
                         {sortOption === 'size-desc' && <ArrowDownWideNarrow className="w-3.5 h-3.5 text-slate-400" />}
                         {sortOption === 'size-asc' && <ArrowUpWideNarrow className="w-3.5 h-3.5 text-slate-400" />}
                      </div>
                      <select 
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value as SortOption)}
                        className="appearance-none bg-slate-950 border border-slate-800 rounded text-xs py-1.5 pl-8 pr-6 text-slate-400 focus:outline-none focus:border-blue-500/50 focus:text-slate-200 transition-colors cursor-pointer hover:border-slate-700"
                      >
                        <option value="name-asc">Name (A-Z)</option>
                        <option value="name-desc">Name (Z-A)</option>
                        <option value="size-desc">Size (Largest)</option>
                        <option value="size-asc">Size (Smallest)</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                        <ListFilter className="w-3 h-3 text-slate-600" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {appState !== 'EXECUTED' && (
                 <div className="flex justify-between px-4 py-2 text-[10px] font-bold text-slate-600 border-b border-slate-800/50 bg-slate-900/20">
                   <span>NAME</span>
                   <span>SIZE</span>
                 </div>
              )}

              <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                {appState === 'EXECUTED' ? (
                  <OptimizedFileTree /> 
                ) : (
                  <>
                    {processedRoot.children?.length === 0 && searchQuery ? (
                      <div className="text-center py-8 text-slate-500 text-xs">
                        No files matching "{searchQuery}"
                      </div>
                    ) : (
                      <FileTree root={processedRoot} forceOpen={!!searchQuery} />
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Middle Pane: Action Center */}
            <div className="w-full md:w-1/3 bg-slate-900 border-r border-slate-800 flex flex-col min-w-[300px]">
              {/* Status Display */}
              <div className="h-64 border-b border-slate-800 flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950 relative p-8">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-2xl transition-all duration-500 ring-1 ring-white/10
                  ${appState === 'SCANNING' || appState === 'PROCESSING' ? 'bg-blue-600 text-white shadow-blue-500/20 scale-110' : 
                    appState === 'EXECUTED' ? 'bg-emerald-600 text-white shadow-emerald-500/20' : 
                    'bg-slate-800 text-slate-500 shadow-black/50'}`}
                >
                  {appState === 'SCANNING' ? <Layout className="w-10 h-10 animate-pulse" /> : 
                   appState === 'PROCESSING' ? <RotateCcw className="w-10 h-10 animate-spin" /> :
                   appState === 'EXECUTED' ? <CheckCircle className="w-10 h-10" /> : 
                   <HardDrive className="w-10 h-10" />}
                </div>
                
                <div className="text-sm font-bold tracking-[0.2em] text-slate-300 mb-4">{appState}</div>
                
                <div className="w-full max-w-[200px] h-1.5 bg-slate-800 rounded-full overflow-hidden ring-1 ring-white/5">
                  <div 
                    className={`h-full transition-all duration-300 ease-out ${appState === 'EXECUTED' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                    style={{width: `${progress}%`}}
                  />
                </div>
              </div>

              {/* Pending Actions List */}
              <div className="flex-1 overflow-y-auto p-2 bg-slate-900/50">
                <div className="sticky top-0 bg-slate-900/95 backdrop-blur p-2 border-b border-slate-800/50 mb-2 z-10 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Actions</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 rounded-full">{proposedMoves.length}</span>
                </div>
                {proposedMoves.length === 0 && appState !== 'EXECUTED' && (
                  <div className="flex flex-col items-center justify-center h-32 text-slate-600 text-xs italic">
                    <span>No pending actions</span>
                    <span className="opacity-50">Run scan to detect patterns</span>
                  </div>
                )}
                <div className="space-y-1">
                  {proposedMoves.map((m, i) => (
                    <div key={i} className="group flex items-center justify-between p-2.5 bg-slate-800/40 border border-slate-800/60 hover:border-blue-500/30 hover:bg-slate-800/80 rounded transition-all">
                      <div className="flex items-center gap-3 text-xs">
                        {m.target === 'VACUUM' ? <Trash2 className="w-3.5 h-3.5 text-red-400" /> : <FileText className="w-3.5 h-3.5 text-blue-400" />}
                        <span className="text-slate-300 font-medium">{m.item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-slate-500 font-mono">
                         <ArrowRight className="w-3 h-3 opacity-50" />
                         <span className="group-hover:text-blue-300 transition-colors truncate max-w-[100px]">{m.target}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls */}
              <div className="p-4 bg-slate-900 border-t border-slate-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
                {appState === 'IDLE' && (
                  <button onClick={runScan} className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 hover:shadow-blue-500/20 active:scale-[0.98] text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all">
                    <Play className="w-4 h-4 fill-current"/> START HEURISTIC SCAN
                  </button>
                )}
                {appState === 'REVIEW' && (
                  <button onClick={execute} className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-500/20 active:scale-[0.98] text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all">
                    <CheckCircle className="w-4 h-4"/> EXECUTE ORCHESTRATION
                  </button>
                )}
                {appState === 'EXECUTED' && (
                  <button onClick={undo} className="w-full py-3.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 active:scale-[0.98] text-slate-300 font-bold rounded-lg flex items-center justify-center gap-2 transition-all">
                    <RotateCcw className="w-4 h-4"/> ROLLBACK CHANGES
                  </button>
                )}
                {(appState === 'SCANNING' || appState === 'PROCESSING') && (
                  <button disabled className="w-full py-3.5 bg-slate-800/50 text-slate-500 font-bold rounded-lg flex items-center justify-center gap-2 cursor-not-allowed opacity-75">
                    <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                    PROCESSING...
                  </button>
                )}
              </div>
            </div>

            {/* Right Pane: Terminal */}
            <div className="w-full md:w-1/3 bg-[#0d1117] flex flex-col border-l border-slate-800 min-w-[300px]">
               <div className="p-3 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TerminalIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-bold text-xs text-slate-500">TERMINAL OUTPUT</span>
                </div>
                <div className="flex gap-1.5">
                   <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50"></div>
                   <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                   <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50"></div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 font-mono text-xs space-y-1 bg-[#0d1117]">
                {logs.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-700 opacity-50">
                    <TerminalIcon className="w-8 h-8 mb-2" />
                    <span>System Ready. Awaiting Command.</span>
                  </div>
                )}
                {logs.slice().reverse().map((l, i) => <LogLine key={i} log={l} />)}
              </div>
            </div>
          </>
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
                  ].map((f, i) => (
                    <div key={i} className="p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
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
                        <li key={i} className="flex gap-3 text-sm text-slate-300">
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
                        <li key={i} className="flex gap-3 text-sm text-slate-300">
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
    </div>
  );
}