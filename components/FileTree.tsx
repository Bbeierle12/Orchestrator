import React, { useState, useEffect } from 'react';
import { Folder, File, HardDrive, ChevronRight } from 'lucide-react';
import { FileNode } from '../types';

interface FileItemProps {
  name: string;
  isDir: boolean;
  stale?: boolean;
  size?: number;
}

const formatSize = (kb?: number) => {
  if (kb === undefined) return '';
  if (kb === 0) return '0 KB';
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
};

export const FileItem: React.FC<FileItemProps> = ({ name, isDir, stale, size }) => (
  <div className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-800 text-sm text-slate-300 transition-colors duration-150 cursor-default group w-full">
    {isDir ? (
      <Folder className={`w-4 h-4 ${stale ? 'text-orange-400' : 'text-blue-400'} transition-colors shrink-0`} />
    ) : (
      <File className="w-4 h-4 text-slate-500 group-hover:text-slate-400 transition-colors shrink-0" />
    )}
    <span className="truncate">{name}</span>
    {stale && (
      <span className="text-[9px] bg-orange-900/50 text-orange-200 px-1.5 py-0.5 rounded border border-orange-800 ml-2 shrink-0">
        STALE
      </span>
    )}
    {size !== undefined && (
      <span className="ml-auto text-[10px] text-slate-500 font-mono shrink-0 tabular-nums opacity-60 group-hover:opacity-100">
        {formatSize(size)}
      </span>
    )}
  </div>
);

interface FolderItemProps {
  name: string;
  children?: React.ReactNode;
  indent?: boolean;
  color?: string;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  size?: number;
}

export const FolderItem: React.FC<FolderItemProps> = ({ 
  name, 
  children, 
  indent, 
  color = "text-slate-200", 
  defaultOpen = true,
  forceOpen = false,
  size
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  return (
    <div className={indent ? "ml-4 pl-2 border-l border-slate-800" : ""}>
      <div 
        className="flex items-center gap-2 py-1 text-sm font-bold cursor-pointer hover:text-white transition-colors select-none group w-full"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={`transition-transform duration-200 text-slate-600 group-hover:text-slate-400 shrink-0 ${isOpen ? 'rotate-90' : ''}`}>
           <ChevronRight className="w-3 h-3" />
        </div>
        <Folder className={`w-4 h-4 ${color} shrink-0`} fill="currentColor" fillOpacity={0.2} />
        <span className={`${color} truncate`}>{name}</span>
        {size !== undefined && (
          <span className="ml-auto text-[10px] text-slate-600 font-mono shrink-0 tabular-nums opacity-60 group-hover:opacity-100">
            {formatSize(size)}
          </span>
        )}
      </div>
      {isOpen && (
        <div className="transition-all duration-300 ease-in-out animate-in fade-in slide-in-from-top-1">
          {children}
        </div>
      )}
    </div>
  );
};

export const RecursiveFileNode: React.FC<{ node: FileNode; forceOpen?: boolean }> = ({ node, forceOpen }) => {
  if (node.type === 'file') {
    return <FileItem name={node.name} isDir={false} stale={(node.age ?? 0) > 180} size={node.size} />;
  }

  return (
    <FolderItem 
      name={node.name} 
      indent 
      color={node.name.startsWith('.') ? 'text-purple-400' : undefined}
      defaultOpen={false}
      forceOpen={forceOpen}
      size={node.size}
    >
      {node.children?.map((child, i) => (
        <RecursiveFileNode key={i} node={child} forceOpen={forceOpen} />
      ))}
    </FolderItem>
  );
};

interface FileTreeProps {
  root: FileNode;
  forceOpen?: boolean;
}

export const FileTree: React.FC<FileTreeProps> = ({ root, forceOpen }) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-slate-400 text-sm mb-4 font-mono border-b border-slate-800 pb-2 w-full">
        <HardDrive className="w-4 h-4 shrink-0" /> 
        <span className="truncate">{root.name}</span>
        {root.size !== undefined && (
          <span className="ml-auto text-xs font-bold text-slate-500">
            {formatSize(root.size)}
          </span>
        )}
      </div>
      <div className="-ml-4"> 
        {/* Negative margin to counteract indentation of the first level children if we treat root as invisible container */}
        {root.children?.map((f, i) => (
          <RecursiveFileNode key={i} node={f} forceOpen={forceOpen} />
        ))}
      </div>
    </div>
  );
};

export const OptimizedFileTree: React.FC = () => {
  return (
    <div className="space-y-2">
      <FolderItem name="00_Inbox" color="text-slate-400">
        <FileItem name="random_note.txt" isDir={false} />
      </FolderItem>

      <FolderItem name="01_Build" color="text-blue-400">
        <FolderItem name="Web" indent>
          <FileItem name="NextJS-Dashboard" isDir={true} />
        </FolderItem>
        <FolderItem name="Data" indent>
          <FileItem name="PyTorch_Model_Training" isDir={true} />
        </FolderItem>
        <FolderItem name="Interactive" indent />
      </FolderItem>
      
      <FolderItem name="02_Studio" color="text-purple-400">
        <FolderItem name="Config" indent>
          <FileItem name=".gitconfig" isDir={false} />
          <FileItem name=".zshrc" isDir={false} />
        </FolderItem>
        <FolderItem name="SDKs" indent>
          <FileItem name=".dotnet" isDir={true} />
        </FolderItem>
      </FolderItem>

      <FolderItem name="03_Library" color="text-teal-400">
        <FolderItem name="Books" indent>
          <FileItem name="Clean_Architecture_Book.pdf" isDir={false} />
        </FolderItem>
        <FolderItem name="Cheatsheets" indent>
           <FileItem name="React_Patterns_Cheatsheet.md" isDir={false} />
        </FolderItem>
      </FolderItem>

      <FolderItem name="04_Private" color="text-pink-400">
        <FolderItem name="Financial" indent>
          <FileItem name="Invoice_Design_Services.pdf" isDir={false} />
        </FolderItem>
        <FolderItem name="Legal" indent>
          <FileItem name="NDA_Client_X.docx" isDir={false} />
        </FolderItem>
        <FolderItem name="Medical" indent>
          <FileItem name="Blood_Work_Results.pdf" isDir={false} />
        </FolderItem>
        <FolderItem name="Identity" indent>
          <FileItem name="Passport_Scan_2024.jpg" isDir={false} />
        </FolderItem>
      </FolderItem>

      <FolderItem name="05_Stage" color="text-indigo-400">
         <FolderItem name="Exports" indent>
            <FileItem name="Final_Presentation_Export.pdf" isDir={false} />
         </FolderItem>
         <FolderItem name="Screenshots" indent>
            <FileItem name="App_Screenshot_v1.png" isDir={false} />
         </FolderItem>
      </FolderItem>

      <FolderItem name="99_Archives" color="text-slate-600">
        <FolderItem name="2023" indent>
          <FileItem name="Old_Unity_Prototype_v1" isDir={true} stale />
        </FolderItem>
      </FolderItem>
    </div>
  );
};