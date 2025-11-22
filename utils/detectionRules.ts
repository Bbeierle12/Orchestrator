// Enhanced file detection rules system with TypeScript types
import { FileNode } from '../types';

// Type definitions for the detection system
interface CategoryConfig {
  target: string;
  priority: number;
}

interface DetectionResult extends CategoryConfig {
  category: string;
  reason: string;
}

interface ProjectDetector {
  name: string;
  check: (item: FileNode, children?: FileNode[]) => boolean;
  category: keyof typeof FILE_CATEGORIES;
  reason: string;
}

interface ExtensionRule {
  category: keyof typeof FILE_CATEGORIES;
  reason: string;
}

interface NamePattern {
  pattern: RegExp;
  category: keyof typeof FILE_CATEGORIES;
  reason: string;
}

interface FolderRule {
  check: (item: FileNode) => boolean;
  category: keyof typeof FILE_CATEGORIES;
  reason: string;
}

// File category configurations with targets and priorities
export const FILE_CATEGORIES = {
  // Project Types
  PROJECT_GIT: { target: '01_Build/Projects', priority: 10 },
  PROJECT_NODE: { target: '01_Build/Web', priority: 10 },
  PROJECT_PYTHON: { target: '01_Build/Data', priority: 10 },
  PROJECT_UNITY: { target: '01_Build/Interactive', priority: 10 },
  PROJECT_RUST: { target: '01_Build/Systems', priority: 10 },
  PROJECT_GO: { target: '01_Build/Systems', priority: 10 },
  PROJECT_JAVA: { target: '01_Build/Enterprise', priority: 10 },

  // Documents
  DOC_PDF: { target: '03_Library/Documents', priority: 5 },
  DOC_OFFICE: { target: '03_Library/Documents', priority: 5 },
  DOC_TEXT: { target: '03_Library/Notes', priority: 5 },

  // Media
  MEDIA_VIDEO: { target: '05_Stage/Media/Videos', priority: 5 },
  MEDIA_AUDIO: { target: '05_Stage/Media/Audio', priority: 5 },
  MEDIA_IMAGE: { target: '05_Stage/Media/Images', priority: 5 },

  // Archives
  ARCHIVE_COMPRESSED: { target: '00_Inbox/Archives', priority: 5 },

  // Development
  SDK_DOTNET: { target: '02_Studio/SDKs', priority: 8 },
  CONFIG_DOTFILE: { target: '02_Studio/Config', priority: 8 },
  TOOL_EXECUTABLE: { target: '02_Studio/Tools', priority: 7 },

  // Private/Sensitive
  PRIVATE_FINANCIAL: { target: '04_Private/Financial', priority: 9 },
  PRIVATE_LEGAL: { target: '04_Private/Legal', priority: 9 },
  PRIVATE_MEDICAL: { target: '04_Private/Medical', priority: 9 },
  PRIVATE_IDENTITY: { target: '04_Private/Identity', priority: 9 },

  // Cleanup
  VACUUM_EMPTY: { target: 'VACUUM', priority: 3 },
  VACUUM_TEMP: { target: 'VACUUM', priority: 6 },
  ARCHIVE_STALE: { target: '99_Archives/2024', priority: 4 },
} as const;

// Project detection rules
export const PROJECT_DETECTORS: ProjectDetector[] = [
  {
    name: 'Git Repository',
    check: (item: FileNode, children?: FileNode[]): boolean => {
      if (item.type !== 'folder') return false;
      return children?.some(child => child.name === '.git') ?? false;
    },
    category: 'PROJECT_GIT',
    reason: 'Git Repository'
  },
  {
    name: 'Node.js Project',
    check: (item: FileNode, children?: FileNode[]): boolean => {
      if (item.type !== 'folder') return false;
      return children?.some(child => child.name === 'package.json') ?? false;
    },
    category: 'PROJECT_NODE',
    reason: 'Node.js Project'
  },
  {
    name: 'Python Project',
    check: (item: FileNode, children?: FileNode[]): boolean => {
      if (item.type !== 'folder') return false;
      const indicators = ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile'];
      return children?.some(child => indicators.includes(child.name)) ?? false;
    },
    category: 'PROJECT_PYTHON',
    reason: 'Python Project'
  },
  {
    name: 'Unity Project',
    check: (item: FileNode, children?: FileNode[]): boolean => {
      if (item.type !== 'folder') return false;
      const hasAssets = children?.some(child => child.name === 'Assets' && child.type === 'folder') ?? false;
      const hasProjectSettings = children?.some(child => child.name === 'ProjectSettings') ?? false;
      return hasAssets && hasProjectSettings;
    },
    category: 'PROJECT_UNITY',
    reason: 'Unity Project'
  },
  {
    name: 'Rust Project',
    check: (item: FileNode, children?: FileNode[]): boolean => {
      if (item.type !== 'folder') return false;
      return children?.some(child => child.name === 'Cargo.toml') ?? false;
    },
    category: 'PROJECT_RUST',
    reason: 'Rust Project'
  },
  {
    name: 'Go Project',
    check: (item: FileNode, children?: FileNode[]): boolean => {
      if (item.type !== 'folder') return false;
      return children?.some(child => child.name === 'go.mod') ?? false;
    },
    category: 'PROJECT_GO',
    reason: 'Go Project'
  },
  {
    name: 'Java/Maven Project',
    check: (item: FileNode, children?: FileNode[]): boolean => {
      if (item.type !== 'folder') return false;
      return children?.some(child => child.name === 'pom.xml' || child.name === 'build.gradle') ?? false;
    },
    category: 'PROJECT_JAVA',
    reason: 'Java Project'
  },
];

// File extension rules
export const EXTENSION_RULES: Record<string, ExtensionRule> = {
  // Documents
  '.pdf': { category: 'DOC_PDF', reason: 'PDF Document' },
  '.docx': { category: 'DOC_OFFICE', reason: 'Word Document' },
  '.doc': { category: 'DOC_OFFICE', reason: 'Word Document' },
  '.xlsx': { category: 'DOC_OFFICE', reason: 'Excel Spreadsheet' },
  '.xls': { category: 'DOC_OFFICE', reason: 'Excel Spreadsheet' },
  '.pptx': { category: 'DOC_OFFICE', reason: 'PowerPoint' },
  '.txt': { category: 'DOC_TEXT', reason: 'Text File' },
  '.md': { category: 'DOC_TEXT', reason: 'Markdown' },

  // Media - Video
  '.mp4': { category: 'MEDIA_VIDEO', reason: 'Video File' },
  '.avi': { category: 'MEDIA_VIDEO', reason: 'Video File' },
  '.mkv': { category: 'MEDIA_VIDEO', reason: 'Video File' },
  '.mov': { category: 'MEDIA_VIDEO', reason: 'Video File' },
  '.wmv': { category: 'MEDIA_VIDEO', reason: 'Video File' },

  // Media - Audio
  '.mp3': { category: 'MEDIA_AUDIO', reason: 'Audio File' },
  '.wav': { category: 'MEDIA_AUDIO', reason: 'Audio File' },
  '.flac': { category: 'MEDIA_AUDIO', reason: 'Audio File' },
  '.m4a': { category: 'MEDIA_AUDIO', reason: 'Audio File' },
  '.ogg': { category: 'MEDIA_AUDIO', reason: 'Audio File' },

  // Media - Images
  '.jpg': { category: 'MEDIA_IMAGE', reason: 'Image File' },
  '.jpeg': { category: 'MEDIA_IMAGE', reason: 'Image File' },
  '.png': { category: 'MEDIA_IMAGE', reason: 'Image File' },
  '.gif': { category: 'MEDIA_IMAGE', reason: 'Image File' },
  '.bmp': { category: 'MEDIA_IMAGE', reason: 'Image File' },
  '.svg': { category: 'MEDIA_IMAGE', reason: 'Vector Image' },
  '.webp': { category: 'MEDIA_IMAGE', reason: 'Image File' },

  // Archives
  '.zip': { category: 'ARCHIVE_COMPRESSED', reason: 'Archive' },
  '.rar': { category: 'ARCHIVE_COMPRESSED', reason: 'Archive' },
  '.7z': { category: 'ARCHIVE_COMPRESSED', reason: 'Archive' },
  '.tar': { category: 'ARCHIVE_COMPRESSED', reason: 'Archive' },
  '.gz': { category: 'ARCHIVE_COMPRESSED', reason: 'Archive' },

  // Executables
  '.exe': { category: 'TOOL_EXECUTABLE', reason: 'Executable' },
  '.msi': { category: 'TOOL_EXECUTABLE', reason: 'Installer' },
  '.app': { category: 'TOOL_EXECUTABLE', reason: 'Application' },
  '.dmg': { category: 'TOOL_EXECUTABLE', reason: 'Disk Image' },
};

// Name-based pattern rules
export const NAME_PATTERNS: NamePattern[] = [
  { pattern: /invoice/i, category: 'PRIVATE_FINANCIAL', reason: 'Financial Document' },
  { pattern: /receipt/i, category: 'PRIVATE_FINANCIAL', reason: 'Financial Document' },
  { pattern: /tax/i, category: 'PRIVATE_FINANCIAL', reason: 'Tax Document' },
  { pattern: /nda/i, category: 'PRIVATE_LEGAL', reason: 'Legal Document' },
  { pattern: /contract/i, category: 'PRIVATE_LEGAL', reason: 'Legal Document' },
  { pattern: /blood/i, category: 'PRIVATE_MEDICAL', reason: 'Medical Record' },
  { pattern: /medical/i, category: 'PRIVATE_MEDICAL', reason: 'Medical Record' },
  { pattern: /passport/i, category: 'PRIVATE_IDENTITY', reason: 'ID Document' },
  { pattern: /screenshot/i, category: 'MEDIA_IMAGE', reason: 'Screenshot' },
  { pattern: /export/i, category: 'DOC_OFFICE', reason: 'Export' },
  { pattern: /cheatsheet/i, category: 'DOC_TEXT', reason: 'Reference' },
  { pattern: /book/i, category: 'DOC_PDF', reason: 'Book' },
];

// Folder-specific rules
export const FOLDER_RULES: FolderRule[] = [
  {
    check: (item: FileNode): boolean => item.type === 'folder' && (item.children?.length ?? 0) === 0,
    category: 'VACUUM_EMPTY',
    reason: 'Empty Folder'
  },
  {
    check: (item: FileNode): boolean =>
      item.type === 'folder' && item.name.includes('temp') && (item.age ?? 0) > 30,
    category: 'VACUUM_TEMP',
    reason: 'Old Temp Folder'
  },
  {
    check: (item: FileNode): boolean =>
      item.type === 'folder' && (item.age ?? 0) > 365 && !item.name.startsWith('.'),
    category: 'ARCHIVE_STALE',
    reason: (item: FileNode): string => `Inactive (${item.age}d)`
  } as FolderRule,
  {
    check: (item: FileNode): boolean => item.name === '.dotnet',
    category: 'SDK_DOTNET',
    reason: '.NET SDK'
  },
  {
    check: (item: FileNode): boolean => item.name.startsWith('.') && item.type === 'folder',
    category: 'CONFIG_DOTFILE',
    reason: 'Config Folder'
  },
];

// Main detection function
export function detectFileCategory(item: FileNode, children: FileNode[] | null = null): DetectionResult | null {
  // Priority 1: Project detection (highest priority)
  for (const detector of PROJECT_DETECTORS) {
    if (detector.check(item, children ?? undefined)) {
      return {
        category: detector.category,
        ...FILE_CATEGORIES[detector.category],
        reason: detector.reason
      };
    }
  }

  // Priority 2: Folder-specific rules
  if (item.type === 'folder') {
    for (const rule of FOLDER_RULES) {
      if (rule.check(item)) {
        const reason = typeof rule.reason === 'function' ? rule.reason(item) : rule.reason;
        return {
          category: rule.category,
          ...FILE_CATEGORIES[rule.category],
          reason
        };
      }
    }
  }

  // Priority 3: Name patterns for sensitive files
  for (const pattern of NAME_PATTERNS) {
    if (pattern.pattern.test(item.name)) {
      return {
        category: pattern.category,
        ...FILE_CATEGORIES[pattern.category],
        reason: pattern.reason
      };
    }
  }

  // Priority 4: Extension-based rules
  if (item.type === 'file') {
    const lastDotIndex = item.name.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      const ext = item.name.substring(lastDotIndex).toLowerCase();
      if (EXTENSION_RULES[ext]) {
        return {
          category: EXTENSION_RULES[ext].category,
          ...FILE_CATEGORIES[EXTENSION_RULES[ext].category],
          reason: EXTENSION_RULES[ext].reason
        };
      }
    }
  }

  return null;
}

// Export type definitions for use in other modules
export type { DetectionResult, CategoryConfig };