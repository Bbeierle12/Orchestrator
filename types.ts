export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  age?: number; // days
  category?: string;
  size?: number; // KB
}

export interface FileSystemState {
  root: FileNode;
}

export interface MoveAction {
  item: FileNode;
  target: string;
  reason: string;
}

export interface LogEntry {
  msg: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'action' | 'system' | 'archive';
  timestamp: string;
}

export type AppState = 'IDLE' | 'SCANNING' | 'REVIEW' | 'PROCESSING' | 'EXECUTED';

export type Tab = 'SIMULATOR' | 'SOURCE_CODE' | 'DOCS';

export type SortOption = 'name-asc' | 'name-desc' | 'size-asc' | 'size-desc';