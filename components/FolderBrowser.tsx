import React, { useState, useEffect } from 'react';
import { Folder, FolderOpen, X, Home, ChevronRight, HardDrive, AlertCircle } from 'lucide-react';

interface FolderItem {
  name: string;
  path: string;
  icon?: string;
  type?: string;
}

interface FolderBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  currentPath: string;
}

export function FolderBrowser({ isOpen, onClose, onSelect, currentPath }: FolderBrowserProps) {
  const [quickFolders, setQuickFolders] = useState<FolderItem[]>([]);
  const [drives, setDrives] = useState<FolderItem[]>([]);
  const [currentDir, setCurrentDir] = useState<string>(currentPath);
  const [pathInput, setPathInput] = useState<string>(currentPath);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [pathParts, setPathParts] = useState<string[]>([]);

  // Load quick access folders and drives on mount
  useEffect(() => {
    if (isOpen) {
      // Load quick folders
      fetch('http://localhost:3001/api/quick-folders')
        .then(res => res.json())
        .then(data => setQuickFolders(data.folders))
        .catch(err => console.error('Failed to load quick folders:', err));

      // Load drives
      fetch('http://localhost:3001/api/drives')
        .then(res => res.json())
        .then(data => setDrives(data.drives))
        .catch(err => console.error('Failed to load drives:', err));
    }
  }, [isOpen]);

  // Update path input when directory changes
  useEffect(() => {
    setPathInput(currentDir);
  }, [currentDir]);

  // Update path parts when current directory changes
  useEffect(() => {
    if (currentDir) {
      const parts = currentDir.split(/[\/\\]/).filter(Boolean);
      setPathParts(parts);
    }
  }, [currentDir]);

  // Load folders when directory changes
  useEffect(() => {
    if (currentDir && isOpen) {
      loadFolders(currentDir);
    }
  }, [currentDir, isOpen]);

  const loadFolders = async (path: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('http://localhost:3001/api/list-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load folders');
      }

      setFolders(data.folders);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error loading folders:', err);
      setError(errorMessage);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderClick = (folder: FolderItem) => {
    setCurrentDir(folder.path);
  };

  const handleSelect = () => {
    onSelect(currentDir);
    onClose();
  };

  const navigateUp = () => {
    const parentPath = currentDir.split(/[\/\\]/).slice(0, -1).join('\\');
    if (parentPath) {
      setCurrentDir(parentPath);
    }
  };

  const navigateTo = (index: number) => {
    const newPath = pathParts.slice(0, index + 1).join('\\');
    setCurrentDir(newPath);
  };

  const handlePathInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setCurrentDir(pathInput);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-5xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-500" />
            Browse Folders
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Path Input */}
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-950">
          <div className="text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-wider">Path</div>
          <input
            type="text"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            onKeyDown={handlePathInputKeyDown}
            placeholder="Enter path and press Enter..."
            className="w-full bg-slate-900 border border-slate-700 rounded text-sm py-2 px-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono"
          />
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-64 border-r border-slate-800 flex flex-col bg-slate-900/30">
            {/* Quick Access */}
            <div className="p-3 border-b border-slate-800">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                Quick Access
              </div>
              <div className="space-y-1">
                {quickFolders.map((folder) => (
                  <button
                    key={folder.path}
                    onClick={() => setCurrentDir(folder.path)}
                    className="flex items-center gap-2 px-2 py-1.5 w-full bg-slate-800/30 hover:bg-slate-800 rounded text-left transition-colors text-sm group"
                  >
                    <span className="text-base">{folder.icon}</span>
                    <span className="text-slate-300 group-hover:text-white text-xs">{folder.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* This PC (Drives) */}
            <div className="p-3 flex-1">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                This PC
              </div>
              <div className="space-y-1">
                {drives.map((drive) => (
                  <button
                    key={drive.path}
                    onClick={() => setCurrentDir(drive.path)}
                    className="flex items-center gap-2 px-2 py-1.5 w-full bg-slate-800/30 hover:bg-slate-800 rounded text-left transition-colors text-sm group"
                  >
                    <HardDrive className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400" />
                    <span className="text-slate-300 group-hover:text-white text-xs">{drive.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Content */}
          <div className="flex-1 flex flex-col">
            {/* Breadcrumb */}
            <div className="p-3 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-1 text-xs overflow-x-auto">
                {pathParts.length > 0 && (
                  <>
                    <button
                      onClick={() => setCurrentDir(currentDir.split(':')[0] + ':\\')}
                      className="flex items-center gap-1 px-2 py-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-200"
                    >
                      <HardDrive className="w-3 h-3" />
                      <span>{currentDir.split(':')[0]}:</span>
                    </button>
                    {pathParts.slice(1).map((part, index) => (
                      <React.Fragment key={index}>
                        <ChevronRight className="w-3 h-3 text-slate-600" />
                        <button
                          onClick={() => navigateTo(index + 1)}
                          className="px-2 py-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-200 whitespace-nowrap"
                        >
                          {part}
                        </button>
                      </React.Fragment>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Folder List */}
            <div className="flex-1 overflow-y-auto p-4 min-h-[200px]">
              {loading ? (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full text-red-400 text-sm">
                  <AlertCircle className="w-8 h-8 mb-2" />
                  <p>{error}</p>
                  <p className="text-xs text-slate-500 mt-1">Try selecting a different folder</p>
                </div>
              ) : folders.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                  No folders in this directory
                </div>
              ) : (
                <div className="grid gap-1">
                  {pathParts.length > 1 && (
                    <button
                      onClick={navigateUp}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-slate-800 rounded transition-colors text-left"
                    >
                      <Folder className="w-4 h-4 text-slate-500" />
                      <span className="text-slate-400">..</span>
                    </button>
                  )}
                  {folders.map((folder) => (
                    <button
                      key={folder.path}
                      onClick={() => handleFolderClick(folder)}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-slate-800 rounded transition-colors text-left group"
                    >
                      <Folder className="w-4 h-4 text-blue-400 group-hover:text-blue-300" />
                      <span className="text-slate-300 group-hover:text-white truncate">
                        {folder.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 flex gap-2 justify-end bg-slate-900/30">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSelect}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors text-sm font-medium"
          >
            Select Folder
          </button>
        </div>
      </div>
    </div>
  );
}
