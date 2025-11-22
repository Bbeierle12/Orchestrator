import React from 'react';
import {
  Layout,
  Play,
  RotateCcw,
  CheckCircle,
  HardDrive,
  FileText,
  ArrowRight,
  Terminal as TerminalIcon,
  Trash2,
  Search,
  ArrowDownAZ,
  ArrowUpAZ,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  ListFilter,
  FolderOpen
} from 'lucide-react';
import { FileNode, AppState, MoveAction, LogEntry, SortOption } from '../types';
import { FileTree, OptimizedFileTree } from './FileTree';
import { FolderBrowser } from './FolderBrowser';

interface SimulatorProps {
  appState: AppState;
  progress: number;
  useRealFS: boolean;
  setUseRealFS: (value: boolean) => void;
  scanPath: string;
  setScanPath: (value: string) => void;
  scanDepth: number;
  setScanDepth: (value: number) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  sortOption: SortOption;
  setSortOption: (value: SortOption) => void;
  processedRoot: FileNode;
  proposedMoves: MoveAction[];
  logs: LogEntry[];
  runScan: () => void;
  execute: () => void;
  undo: () => void;
  setShowFolderBrowser: (value: boolean) => void;
}

// Log line component
const LogLine: React.FC<{ log: LogEntry }> = ({ log }) => {
  const colors = {
    system: 'text-blue-400',
    success: 'text-emerald-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
    info: 'text-slate-400'
  };

  return (
    <div className={`${colors[log.type]} leading-relaxed`}>
      <span className="opacity-50">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
    </div>
  );
};

export const Simulator: React.FC<SimulatorProps> = ({
  appState,
  progress,
  useRealFS,
  setUseRealFS,
  scanPath,
  setScanPath,
  scanDepth,
  setScanDepth,
  searchQuery,
  setSearchQuery,
  sortOption,
  setSortOption,
  processedRoot,
  proposedMoves,
  logs,
  runScan,
  execute,
  undo,
  setShowFolderBrowser
}) => {
  return (
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

          {/* Real FS Toggle & Path Input */}
          {appState !== 'EXECUTED' && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useRealFS}
                    onChange={(e) => setUseRealFS(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-700 text-blue-600 focus:ring-blue-500/20 focus:ring-offset-0"
                  />
                  <span className="text-xs text-slate-400 font-medium">
                    {useRealFS ? 'Real File System' : 'Mock Data'}
                  </span>
                </label>
              </div>
              {useRealFS && (
                <>
                  <div className="mb-2 flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter directory path..."
                      value={scanPath}
                      onChange={(e) => setScanPath(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded text-xs py-1.5 px-3 text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono"
                    />
                    <button
                      onClick={() => setShowFolderBrowser(true)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300 transition-colors flex items-center gap-1.5"
                      title="Browse folders"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span className="text-xs">Browse</span>
                    </button>
                  </div>
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        Scan Depth: {scanDepth} {scanDepth > 5 && <span className="text-yellow-500">⚠</span>}
                      </label>
                      <span className="text-[9px] text-slate-600">
                        {scanDepth <= 3 ? 'Fast' : scanDepth <= 5 ? 'Medium' : 'Slow'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={scanDepth}
                      onChange={(e) => setScanDepth(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    {scanDepth > 5 && (
                      <div className="mt-1 text-[9px] text-yellow-500/80">
                        Deep scans may take longer
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

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
              <div key={`${m.item.name}-${i}`} className="group flex items-center justify-between p-2.5 bg-slate-800/40 border border-slate-800/60 hover:border-blue-500/30 hover:bg-slate-800/80 rounded transition-all">
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
          {logs.slice().reverse().map((l, i) => <LogLine key={`${l.timestamp}-${i}`} log={l} />)}
        </div>
      </div>
    </>
  );
};