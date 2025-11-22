
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Files, 
  Search, 
  GitGraph, 
  Box, 
  Settings, 
  UserCircle, 
  X, 
  Menu,
  XCircle,
  Play,
  TerminalSquare,
  Music,
  FileQuestion,
  Download,
  FileSpreadsheet,
  FileText,
  Cpu,
  Archive,
  MessageSquare
} from 'lucide-react';
import FileTree from './components/FileSystem/FileTree';
import CodeEditor from './components/Editor/CodeEditor';
import AIPanel from './components/Panels/AIPanel';
import TerminalPanel from './components/Terminal/TerminalPanel';
import WelcomeScreen from './components/Welcome/WelcomeScreen';
import ExtensionSidebar from './components/Extensions/ExtensionSidebar';
import WebPreview from './components/Preview/WebPreview';
import MenuBar from './components/Layout/MenuBar';
import SettingsTab from './components/Settings/SettingsTab';
import { FileSystemNode, FileType, ViewMode, Tab, ChatMessage, ProjectState, GeminiModel } from './types';
import { DEFAULT_FILES } from './constants';

export default function App() {
  // --- STATE ---
  const [projectState, setProjectState] = useState<ProjectState>('WELCOME');
  const [fileSystem, setFileSystem] = useState<FileSystemNode[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [openTabs, setOpenTabs] = useState<Tab[]>([]);
  const [activeView, setActiveView] = useState<ViewMode>(ViewMode.EXPLORER);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [geminiModel, setGeminiModel] = useState<GeminiModel>('gemini-2.5-pro');
  
  // Extension & Terminal State
  const [installedExtensions, setInstalledExtensions] = useState<string[]>(['prettier', 'eslint']);
  const [showTerminal, setShowTerminal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isMobilePreview, setIsMobilePreview] = useState(false);
  
  // Terminal Current Working Directory (Path IDs)
  const [termPath, setTermPath] = useState<string[]>(['root']);

  // Fallback Input Refs for Iframe/Compatibility
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // --- HELPERS ---
  const findNode = useCallback((nodes: FileSystemNode[], id: string): FileSystemNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Helper to get file content by ID for preview
  // Updated: Prioritize exact matches for index.html, style.css etc.
  const getFileContent = (fileName: string) => {
    const findContent = (nodes: FileSystemNode[]): string | null => {
        for (const node of nodes) {
            // Exact match check
            if (node.name === fileName && node.content !== undefined) return node.content;
            if (node.children) {
                const found = findContent(node.children);
                if (found) return found;
            }
        }
        return null;
    };
    return findContent(fileSystem) || '';
  };

  const updateFileContent = (id: string, newContent: string) => {
    const updateNodes = (nodes: FileSystemNode[]): FileSystemNode[] => {
      return nodes.map(node => {
        if (node.id === id) {
            // Mark tab as dirty
            setOpenTabs(prev => prev.map(t => t.id === id ? { ...t, isDirty: true } : t));
            return { ...node, content: newContent };
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };
    setFileSystem(prev => updateNodes(prev));
  };

  // Updated to support ALL requested file types
  const getLanguageFromExtension = (filename: string) => {
      const ext = filename.split('.').pop()?.toLowerCase();
      switch(ext) {
          // 1. Code / Web / Programming
          case 'js': case 'mjs': return 'javascript';
          case 'ts': return 'typescript';
          case 'tsx': return 'tsx';
          case 'jsx': return 'jsx';
          case 'html': case 'htm': return 'html';
          case 'css': return 'css';
          case 'scss': return 'scss';
          case 'less': return 'less';
          case 'json': return 'json';
          case 'py': return 'python';
          case 'java': case 'class': return 'java';
          case 'c': case 'h': return 'c';
          case 'cpp': return 'cpp';
          case 'cs': return 'csharp';
          case 'go': return 'go';
          case 'rs': return 'rust';
          case 'php': return 'php';
          case 'sql': return 'sql';
          case 'xml': return 'xml';
          case 'yaml': case 'yml': return 'yaml';
          case 'svg': return 'xml'; // Treat SVG as code
          case 'md': case 'txt': case 'gitignore': case 'env': return 'text';
          case 'csv': return 'csv'; // Text-based data

          // 2. System & Config (Text-based)
          case 'ini': case 'cfg': case 'conf': return 'ini';
          
          // 3. System & Config (Binary/Restricted)
          case 'dll': case 'sys': case 'dat': case 'tmp': return 'system';

          // 4. Documents (Binary/Complex)
          case 'doc': case 'docx': case 'rtf': case 'odt': return 'document';
          case 'pdf': return 'pdf';

          // 5. Spreadsheets (Binary/Complex)
          case 'xls': case 'xlsx': case 'ods': return 'spreadsheet';

          // 6. Images
          case 'png': case 'jpg': case 'jpeg': case 'gif': case 'webp': case 'bmp': case 'ico': case 'tiff': case 'tif':
            return 'image';
          
          // 7. Audio
          case 'mp3': case 'wav': case 'ogg': case 'flac': case 'aac':
            return 'audio';
          
          // 8. Video
          case 'mp4': case 'webm': case 'mkv': case 'mov': case 'avi': case 'wmv':
            return 'video';

          // 9. Archives
          case 'zip': case 'rar': case '7z': case 'tar': case 'gz': case 'tgz':
            return 'archive';

          // 10. Executables
          case 'exe': case 'msi': case 'bin': case 'app': case 'deb': case 'rpm':
            return 'executable';

          default: return 'text'; // Default to text for unknown files so we can try to edit them
      }
  };

  const isMediaOrBinary = (lang: string | undefined) => {
      return ['image', 'audio', 'video', 'pdf', 'binary', 'system', 'document', 'spreadsheet', 'archive', 'executable'].includes(lang || '');
  };

  // --- PROJECT ACTIONS ---

  const createVirtualProject = () => {
    setFileSystem(DEFAULT_FILES);
    setProjectState('EDITING');
    setTermPath(['root']);
    const defaultFile = DEFAULT_FILES[0].children?.[0];
    if(defaultFile) {
        setOpenTabs([{ id: defaultFile.id, title: defaultFile.name, isDirty: false }]);
        setActiveTabId(defaultFile.id);
    }
  };

  const openSettings = () => {
    if (!openTabs.find(t => t.id === 'settings')) {
        setOpenTabs([...openTabs, { id: 'settings', title: 'Settings', isDirty: false }]);
    }
    setActiveTabId('settings');
    setProjectState('EDITING'); // Ensure we are in editing mode to see tabs
  };

  // --- FILE SYSTEM LOGIC ---

  // 1. Modern API: Process Handle (Recursive with Try-Catch Robustness)
  const processDirectoryHandle = async (dirHandle: any, parentId: string | null = null): Promise<FileSystemNode[]> => {
    const nodes: FileSystemNode[] = [];
    
    try {
        // @ts-ignore
        for await (const entry of dirHandle.values()) {
          const id = parentId ? `${parentId}_${entry.name}` : entry.name;
          
          try {
              if (entry.kind === 'file') {
                nodes.push({
                  id,
                  name: entry.name,
                  type: FileType.FILE,
                  parentId,
                  handle: entry, 
                  language: getLanguageFromExtension(entry.name)
                });
              } else if (entry.kind === 'directory') {
                // Recursively load children, verify permissions implicit in handle
                const children = await processDirectoryHandle(entry, id);
                nodes.push({
                  id,
                  name: entry.name,
                  type: FileType.FOLDER,
                  isOpen: false, 
                  parentId,
                  children, // Assign loaded children
                  handle: entry
                });
              }
          } catch (entryError) {
              console.warn(`Error processing entry ${entry.name}:`, entryError);
              // Skip restricted files/folders but continue loading the rest
          }
        }
    } catch (dirError) {
        console.warn("Error accessing directory handle:", dirError);
        return []; // Return empty if directory itself is restricted
    }

    // Sort: Folders first, then files
    return nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === FileType.FOLDER ? -1 : 1;
    });
  };

  // 2. Fallback API: Process FileList from <input> (Reconstructs nested folder structure)
  const processInputFiles = async (fileList: FileList) => {
    const rootChildren: FileSystemNode[] = [];

    // Helper to find or create nested folder
    const getOrCreateFolder = (childNodes: FileSystemNode[], name: string, parentId: string): FileSystemNode => {
        let folder = childNodes.find(n => n.name === name && n.type === FileType.FOLDER);
        if (!folder) {
            const id = parentId === 'root' ? name : `${parentId}_${name}`;
            folder = {
                id,
                name,
                type: FileType.FOLDER,
                isOpen: false,
                children: [],
                parentId
            };
            childNodes.push(folder);
        }
        return folder;
    };

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const lang = getLanguageFromExtension(file.name);
      let content = '';
      
      if (isMediaOrBinary(lang)) {
        content = URL.createObjectURL(file);
      } else {
        try {
            content = await file.text();
        } catch (e) {
            content = "Binary file cannot be displayed.";
        }
      }

      const path = file.webkitRelativePath; // e.g. "myProject/src/components/Button.tsx"
      
      if (!path) {
          // Flat file selection
          const newNode: FileSystemNode = {
            id: file.name,
            name: file.name,
            type: FileType.FILE,
            content: content,
            language: lang,
            parentId: 'root'
          };
          rootChildren.push(newNode);
      } else {
          // Recursive Folder Structure Reconstruction
          const parts = path.split('/');
          const fileName = parts.pop()!; // Remove filename
          
          let currentLevelNodes = rootChildren;
          let currentParentId = 'root';

          // Iterate through folders in path
          for (const folderName of parts) {
              const folderNode = getOrCreateFolder(currentLevelNodes, folderName, currentParentId);
              // Determine next level
              if (!folderNode.children) folderNode.children = [];
              currentLevelNodes = folderNode.children;
              currentParentId = folderNode.id;
          }
          
          // Add the file to the deepest folder found
          const newNode: FileSystemNode = {
              id: `${currentParentId}_${fileName}`,
              name: fileName,
              type: FileType.FILE,
              content,
              language: lang,
              parentId: currentParentId
          };
          currentLevelNodes.push(newNode);
      }
    }

    setFileSystem([{
        id: 'root',
        name: 'Opened Project',
        type: FileType.FOLDER,
        isOpen: true,
        children: rootChildren,
        parentId: null
    }]);
    setProjectState('EDITING');
    setTermPath(['root']);
    
    // Try to open README or index.html if available
    const findReadme = (nodes: FileSystemNode[]): FileSystemNode | null => {
        for (const n of nodes) {
            if (n.name.toLowerCase().startsWith('readme') || n.name === 'index.html') return n;
            if (n.children) {
                const found = findReadme(n.children);
                if (found) return found;
            }
        }
        return null;
    };
    const startFile = findReadme(rootChildren) || (rootChildren.length > 0 ? rootChildren[0] : null);
    if (startFile && startFile.type === FileType.FILE) {
        handleFileClick(startFile);
    }
  };

  // Trigger Handlers
  const openRealFolder = async () => {
    try {
        if (window.self !== window.top) {
            throw new Error("Iframe detected");
        }
        // @ts-ignore
        const dirHandle = await window.showDirectoryPicker();
        const nodes = await processDirectoryHandle(dirHandle, 'root');
        setFileSystem([{
            id: 'root',
            name: dirHandle.name,
            type: FileType.FOLDER,
            isOpen: true,
            parentId: null,
            children: nodes,
            handle: dirHandle
        }]);
        setProjectState('EDITING');
        setTermPath(['root']);
    } catch (e) {
        console.warn("Native File System API failed or restricted. Using fallback input.", e);
        folderInputRef.current?.click();
    }
  };

  const openRealFile = async () => {
      try {
        if (window.self !== window.top) {
            throw new Error("Iframe detected");
        }
        // @ts-ignore
        const [fileHandle] = await window.showOpenFilePicker();
        const file = await fileHandle.getFile();
        const lang = getLanguageFromExtension(file.name);
        
        let content = '';
        if (isMediaOrBinary(lang)) {
             content = URL.createObjectURL(file);
        } else {
             content = await file.text();
        }
        
        const newNode: FileSystemNode = {
            id: `root_${file.name}`,
            name: file.name,
            type: FileType.FILE,
            content: content,
            language: lang,
            handle: fileHandle,
            parentId: 'root'
        };

        setFileSystem(prev => {
            const root = prev.find(n => n.id === 'root');
            if (root) {
                return prev.map(n => n.id === 'root' ? { ...n, children: [...(n.children || []), newNode]} : n);
            }
            return [{
                id: 'root',
                name: 'Opened Files',
                type: FileType.FOLDER,
                isOpen: true,
                children: [newNode]
            }];
        });
        setProjectState('EDITING');
        setTermPath(['root']);
        handleFileClick(newNode);

      } catch (e) {
          console.warn("Native File API failed. Using fallback.", e);
          fileInputRef.current?.click();
      }
  };

  const handleInputFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
          processInputFiles(e.target.files);
      }
      e.target.value = '';
  };

  const saveActiveFile = async () => {
      if (!activeTabId) return;
      if (activeTabId === 'settings') return;

      const fileNode = findNode(fileSystem, activeTabId);
      if (!fileNode || typeof fileNode.content === 'undefined') return;

      // Prevent saving binary/media files via text method as we don't edit them in-app
      if (isMediaOrBinary(fileNode.language)) return;

      if (fileNode.handle) {
          try {
              // @ts-ignore
              const writable = await fileNode.handle.createWritable();
              await writable.write(fileNode.content);
              await writable.close();
              setOpenTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isDirty: false } : t));
              return;
          } catch (e) {
              console.error("Native save failed:", e);
          }
      }

      const blob = new Blob([fileNode.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileNode.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setOpenTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, isDirty: false } : t));
  };

  // --- EVENT HANDLERS ---

  const handleFileClick = async (node: FileSystemNode) => {
    // If node has handle but content is missing, load it now
    if (node.handle && node.type === FileType.FILE && typeof node.content === 'undefined') {
        try {
            // @ts-ignore
            const file = await node.handle.getFile();
            let content = '';
            
            if (isMediaOrBinary(node.language)) {
                content = URL.createObjectURL(file);
            } else {
                // Check file size for text files - prevent hanging on massive logs
                if (file.size > 5 * 1024 * 1024) { // > 5MB
                    content = "File is too large to display in editor.";
                } else {
                    content = await file.text();
                }
            }
            
            const updateContent = (nodes: FileSystemNode[]): FileSystemNode[] => {
                return nodes.map(n => {
                    if (n.id === node.id) return { ...n, content: content };
                    if (n.children) return { ...n, children: updateContent(n.children) };
                    return n;
                });
            };
            setFileSystem(prev => updateContent(prev));
        } catch (e) {
            console.error("Failed to read file:", e);
        }
    }

    if (!openTabs.find(tab => tab.id === node.id)) {
      setOpenTabs([...openTabs, { id: node.id, title: node.name, isDirty: false }]);
    }
    setActiveTabId(node.id);
  };

  const handleTabClose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newTabs = openTabs.filter(t => t.id !== id);
    setOpenTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
    }
  };

  const handleFolderToggle = (id: string) => {
    const toggleNodes = (nodes: FileSystemNode[]): FileSystemNode[] => {
      return nodes.map(node => {
        if (node.id === id) {
          return { ...node, isOpen: !node.isOpen };
        }
        if (node.children) {
          return { ...node, children: toggleNodes(node.children) };
        }
        return node;
      });
    };
    setFileSystem(prev => toggleNodes(prev));
  };

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 's') {
              e.preventDefault();
              saveActiveFile();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, fileSystem]);


  // --- EXTENSION HANDLERS ---
  const toggleExtension = (id: string) => {
    setInstalledExtensions(prev => {
        if (prev.includes(id)) {
            if (id === 'live-server') setShowPreview(false);
            return prev.filter(e => e !== id);
        }
        return [...prev, id];
    });
  };

  const toggleLiveServer = () => {
      if (!installedExtensions.includes('live-server')) {
          alert("Please install 'Live Server' extension first.");
          setActiveView(ViewMode.EXTENSIONS);
          return;
      }
      setShowPreview(!showPreview);
  };

  const toggleMobileView = () => {
       if (!showPreview) setShowPreview(true);
       if (!installedExtensions.includes('mobile-view')) {
           toggleExtension('mobile-view');
       }
       setIsMobilePreview(!isMobilePreview);
  };

  // --- TERMINAL HANDLERS ---
  
  const addNodeToTree = (nodes: FileSystemNode[], parentId: string, newNode: FileSystemNode): FileSystemNode[] => {
    return nodes.map(node => {
      if (node.id === parentId) {
        return { ...node, children: [...(node.children || []), newNode], isOpen: true };
      }
      if (node.children) {
        return { ...node, children: addNodeToTree(node.children, parentId, newNode) };
      }
      return node;
    });
  };

  const removeNodeFromTree = (nodes: FileSystemNode[], nodeId: string): FileSystemNode[] => {
    return nodes.filter(node => node.id !== nodeId).map(node => {
        if(node.children) return { ...node, children: removeNodeFromTree(node.children, nodeId) };
        return node;
    });
  };

  const handleTerminalCommand = async (cmd: string): Promise<string> => {
      const parts = cmd.trim().split(' ');
      const command = parts[0];
      const arg = parts[1];

      const currentDirId = termPath[termPath.length - 1];
      const currentDirNode = findNode(fileSystem, currentDirId);

      if (!currentDirNode && command !== 'ls') return 'Error: Current directory lost.';

      switch(command) {
          case 'ls':
              if (!currentDirNode || !currentDirNode.children) return '';
              return currentDirNode.children.map(c => {
                  return c.type === FileType.FOLDER ? `[${c.name}]` : c.name;
              }).join('  ');
          
          case 'pwd':
              return '/' + termPath.join('/');
          
          case 'cd':
              if (!arg) return '';
              if (arg === '..') {
                  if (termPath.length > 1) {
                      setTermPath(prev => prev.slice(0, -1));
                      return '';
                  }
                  return 'Already at root';
              }
              const targetFolder = currentDirNode?.children?.find(c => c.name === arg && c.type === FileType.FOLDER);
              if (targetFolder) {
                  setTermPath(prev => [...prev, targetFolder.id]);
                  return '';
              }
              return `cd: no such file or directory: ${arg}`;

          case 'mkdir':
              if (!arg) return 'usage: mkdir <directory_name>';
              if (!currentDirNode) return 'Error';
              
              if (currentDirNode.handle) {
                  try {
                      // @ts-ignore
                      const newDirHandle = await currentDirNode.handle.getDirectoryHandle(arg, { create: true });
                      const newFolderNode: FileSystemNode = {
                          id: `${currentDirNode.id}_${arg}`,
                          name: arg,
                          type: FileType.FOLDER,
                          children: [],
                          parentId: currentDirNode.id,
                          handle: newDirHandle,
                          isOpen: false
                      };
                      setFileSystem(prev => addNodeToTree(prev, currentDirNode.id, newFolderNode));
                      return `Directory '${arg}' created.`;
                  } catch (e) {
                      return `Error creating directory on disk: ${e}`;
                  }
              } 
              
              const newFolder: FileSystemNode = {
                  id: `${currentDirNode.id}_${arg}`,
                  name: arg,
                  type: FileType.FOLDER,
                  children: [],
                  parentId: currentDirNode.id,
                  isOpen: false
              };
              setFileSystem(prev => addNodeToTree(prev, currentDirNode.id, newFolder));
              return `Virtual directory '${arg}' created.`;

          case 'touch':
          case 'code':
              if (!arg) return 'usage: touch <filename>';
              if (!currentDirNode) return 'Error';

              if (currentDirNode.handle) {
                  try {
                      // @ts-ignore
                      const newFileHandle = await currentDirNode.handle.getFileHandle(arg, { create: true });
                      const newFileNode: FileSystemNode = {
                          id: `${currentDirNode.id}_${arg}`,
                          name: arg,
                          type: FileType.FILE,
                          content: '',
                          parentId: currentDirNode.id,
                          handle: newFileHandle,
                          language: getLanguageFromExtension(arg)
                      };
                      setFileSystem(prev => addNodeToTree(prev, currentDirNode.id, newFileNode));
                      return `File '${arg}' created.`;
                  } catch (e) {
                      return `Error creating file on disk: ${e}`;
                  }
              }

              const newFile: FileSystemNode = {
                  id: `${currentDirNode.id}_${arg}`,
                  name: arg,
                  type: FileType.FILE,
                  content: '',
                  parentId: currentDirNode.id,
                  language: getLanguageFromExtension(arg)
              };
              setFileSystem(prev => addNodeToTree(prev, currentDirNode.id, newFile));
              return `Virtual file '${arg}' created.`;

          case 'rm':
              if (!arg) return 'usage: rm <filename>';
              const targetNode = currentDirNode?.children?.find(c => c.name === arg);
              if (!targetNode) return `rm: ${arg}: No such file or directory`;
              
              if (currentDirNode?.handle) {
                  try {
                    // @ts-ignore
                    await currentDirNode.handle.removeEntry(arg, { recursive: true });
                  } catch(e) {
                      return `Error deleting from disk: ${e}`;
                  }
              }

              setFileSystem(prev => removeNodeFromTree(prev, targetNode.id));
              setOpenTabs(prev => prev.filter(t => t.id !== targetNode.id));
              return '';

          case 'cat':
              if (!arg) return 'Usage: cat <filename>';
              const fileToRead = currentDirNode?.children?.find(c => c.name === arg && c.type === FileType.FILE);
              if (!fileToRead) return `File not found: ${arg}`;
              
              if (isMediaOrBinary(fileToRead.language)) return `[${fileToRead.language?.toUpperCase()} File]`;

              if (fileToRead.handle && typeof fileToRead.content === 'undefined') {
                 try { 
                    // @ts-ignore
                    const f = await fileToRead.handle.getFile(); const t = await f.text(); return t.substring(0, 500); 
                 } catch(e) { return "Error reading file"; }
              }
              
              const content = fileToRead.content || '';
              return content.substring(0, 500) + (content.length > 500 ? '...' : '');

          case 'clear':
               return ''; 

          case 'npm':
              if (arg === 'install' || arg === 'i') return 'added 142 packages in 2s';
              return 'npm command not fully simulated.';
          case 'echo':
              return parts.slice(1).join(' ');
          default:
              return `command not found: ${command}`;
      }
  };

  const activeFileNode = activeTabId ? findNode(fileSystem, activeTabId) : null;
  const currentTermDirName = termPath[termPath.length - 1].split('_').pop() || 'project';

  // --- RENDER CONTENT SWITCHER ---
  const renderMainContent = () => {
      if (activeTabId === 'settings') {
          return (
              <SettingsTab 
                currentModel={geminiModel} 
                onModelChange={setGeminiModel} 
              />
          );
      }

      if (!activeFileNode) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-[#92a4c9]">
                <Menu size={64} strokeWidth={0.5} className="opacity-50" />
                <p className="mt-4 text-sm font-medium">Select a file to start editing</p>
                <p className="text-xs opacity-50 mt-2">Supports All File Types</p>
            </div>
        );
      }

      const lang = activeFileNode.language;
      
      if (lang === 'image') {
          return (
             <div className="w-full h-full flex flex-col items-center justify-center bg-[#101622] overflow-auto p-4 relative">
                 <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ 
                     backgroundImage: 'radial-gradient(#444 1px, transparent 1px)',
                     backgroundSize: '20px 20px' 
                 }}></div>
                 <img 
                    src={activeFileNode.content} 
                    alt={activeFileNode.name} 
                    className="max-w-full max-h-full object-contain shadow-lg border border-white/10 rounded-lg" 
                 />
                 <p className="mt-4 text-xs text-[#92a4c9]">{activeFileNode.name} (Image)</p>
             </div>
          );
      }

      if (lang === 'video') {
          return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#101622] p-10">
                <video controls src={activeFileNode.content} className="max-w-full max-h-full shadow-2xl rounded-lg bg-black border border-white/10" />
                <p className="mt-4 text-xs text-[#92a4c9]">{activeFileNode.name}</p>
            </div>
          );
      }

      if (lang === 'audio') {
          return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#101622]">
                <div className="p-10 bg-[#161b26] rounded-xl shadow-xl flex flex-col items-center border border-white/10">
                    <div className="w-24 h-24 bg-[#135bec]/20 rounded-full flex items-center justify-center mb-6">
                        <Music size={40} className="text-[#135bec]"/>
                    </div>
                    <h2 className="text-white text-lg mb-4 font-medium">{activeFileNode.name}</h2>
                    <audio controls src={activeFileNode.content} className="w-[300px]" />
                </div>
            </div>
          );
      }
      
      if (lang === 'pdf') {
          return (
            <div className="w-full h-full bg-[#333]">
                <iframe src={activeFileNode.content} className="w-full h-full border-none" title="PDF Viewer" />
            </div>
          );
      }

      // Handles: Executables, Archives, System Files, Binary Documents, Spreadsheets
      if (['binary', 'system', 'executable', 'archive', 'document', 'spreadsheet'].includes(lang || '')) {
          let Icon = FileQuestion;
          let message = "This file is binary or uses an unsupported text encoding.";
          
          if (lang === 'spreadsheet') { Icon = FileSpreadsheet; message = "Spreadsheet Viewer is not available in this version."; }
          if (lang === 'document') { Icon = FileText; message = "Document Viewer is not available in this version."; }
          if (lang === 'archive') { Icon = Archive; message = "Archive file (Compressed)."; }
          if (lang === 'system') { Icon = Settings; message = "System / Configuration File."; }
          if (lang === 'executable') { Icon = Cpu; message = "Executable / Binary File."; }

          return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#101622] text-[#92a4c9]">
                <Icon size={64} strokeWidth={0.5} className="mb-4 opacity-50 text-[#135bec]"/>
                <h3 className="text-lg text-white font-medium mb-2">{activeFileNode.name}</h3>
                <p className="mb-6 text-sm">{message}</p>
                <a 
                    href={activeFileNode.content} 
                    download={activeFileNode.name}
                    className="flex items-center px-4 py-2 bg-[#135bec] text-white rounded hover:bg-[#1a65fc] transition-colors text-sm"
                >
                    <Download size={16} className="mr-2"/>
                    Download File
                </a>
            </div>
          );
      }

      // Default: Code Editor
      return (
        <CodeEditor 
            value={activeFileNode.content || ''} 
            language={activeFileNode.language || 'javascript'}
            onChange={(val) => updateFileContent(activeFileNode.id, val)}
        />
      );
  };

  // Render WELCOME if no project
  if (projectState === 'WELCOME') {
      return (
        <>
           <WelcomeScreen 
              onCreateProject={createVirtualProject} 
              onOpenFolder={openRealFolder} 
              onOpenFile={openRealFile}
            />
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleInputFileChange} />
            <input type="file" ref={folderInputRef} className="hidden" 
                // @ts-ignore 
                webkitdirectory="" onChange={handleInputFileChange} />
        </>
      );
  }

  return (
    <div className="flex h-screen w-screen bg-[#101622] text-[#e0e0e0] overflow-hidden font-sans flex-col">
      
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleInputFileChange} />
      <input type="file" ref={folderInputRef} className="hidden" 
        // @ts-ignore 
        webkitdirectory="" onChange={handleInputFileChange} />

      {/* 0. TOP MENU BAR */}
      <MenuBar 
        onOpenFolder={openRealFolder} 
        onOpenFile={openRealFile}
        onSave={saveActiveFile}
        onTerminalToggle={() => setShowTerminal(!showTerminal)}
        onNewFile={() => {
            const newId = `root_new_${Date.now()}.txt`;
            const newNode: FileSystemNode = {
                id: newId,
                name: 'untitled.txt',
                type: FileType.FILE,
                content: '',
                language: 'text',
                parentId: 'root'
            };
            setFileSystem(prev => addNodeToTree(prev, 'root', newNode));
            handleFileClick(newNode);
        }}
      />

      <div className="flex-1 flex min-h-0">
        {/* 1. Activity Bar */}
        <div className="w-14 flex flex-col items-center py-4 bg-[#0d1117] border-r border-white/10 z-20 shrink-0">
            <div className={`p-3 mb-2 cursor-pointer transition-colors ${activeView === ViewMode.EXPLORER ? 'text-white border-l-2 border-[#135bec]' : 'text-[#92a4c9] hover:text-white'}`} onClick={() => setActiveView(ViewMode.EXPLORER)}>
            <Files size={24} strokeWidth={1.5} />
            </div>
            <div className={`p-3 mb-2 cursor-pointer transition-colors ${activeView === ViewMode.SEARCH ? 'text-white border-l-2 border-[#135bec]' : 'text-[#92a4c9] hover:text-white'}`} onClick={() => setActiveView(ViewMode.SEARCH)}>
            <Search size={24} strokeWidth={1.5} />
            </div>
            <div className={`p-3 mb-2 cursor-pointer transition-colors ${activeView === ViewMode.GIT ? 'text-white border-l-2 border-[#135bec]' : 'text-[#92a4c9] hover:text-white'}`} onClick={() => setActiveView(ViewMode.GIT)}>
            <GitGraph size={24} strokeWidth={1.5} />
            </div>
            <div className={`p-3 mb-2 cursor-pointer transition-colors ${activeView === ViewMode.EXTENSIONS ? 'text-white border-l-2 border-[#135bec]' : 'text-[#92a4c9] hover:text-white'}`} onClick={() => setActiveView(ViewMode.EXTENSIONS)}>
            <Box size={24} strokeWidth={1.5} />
            </div>
            
            <div className="mt-auto flex flex-col items-center space-y-4">
            <div className="cursor-pointer text-[#92a4c9] hover:text-white">
                <UserCircle size={24} strokeWidth={1.5} />
            </div>
            <div 
                className={`cursor-pointer transition-colors ${activeTabId === 'settings' ? 'text-white' : 'text-[#92a4c9] hover:text-white'}`}
                onClick={openSettings}
            >
                <Settings size={24} strokeWidth={1.5} />
            </div>
            </div>
        </div>

        {/* 2. Sidebar (Expanded to w-80 for Chat + Files) */}
        <div className="w-80 bg-[#111722] flex flex-col border-r border-white/10 shrink-0 transition-all duration-300">
            {activeView === ViewMode.EXPLORER && (
                <>
                     {/* Top: Gemini Chat (If enabled) */}
                    {showAIPanel && (
                        <div className="h-[45%] border-b border-white/10 flex flex-col min-h-[200px]">
                            <AIPanel 
                                history={chatHistory} 
                                onHistoryUpdate={setChatHistory}
                                activeCode={!isMediaOrBinary(activeFileNode?.language) ? activeFileNode?.content || '' : `[${activeFileNode?.language} file]`}
                                onClose={() => setShowAIPanel(false)}
                                model={geminiModel}
                            />
                        </div>
                    )}

                    {/* Bottom: File Explorer */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="h-9 px-4 flex items-center text-xs tracking-wide font-semibold text-[#92a4c9] justify-between shrink-0 bg-[#111722]">
                            <span>EXPLORER</span>
                            {!showAIPanel && (
                                <button onClick={() => setShowAIPanel(true)} className="hover:text-white" title="Open AI Assistant">
                                    <MessageSquare size={14} />
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto py-2">
                            <FileTree 
                                nodes={fileSystem} 
                                activeFileId={activeTabId} 
                                onFileClick={handleFileClick}
                                onFolderToggle={handleFolderToggle}
                            />
                        </div>
                    </div>
                </>
            )}
            {activeView === ViewMode.EXTENSIONS && (
                <ExtensionSidebar 
                    activeExtensions={installedExtensions}
                    onToggleExtension={toggleExtension}
                />
            )}
            {/* Other views can be added here */}
            {activeView !== ViewMode.EXPLORER && activeView !== ViewMode.EXTENSIONS && (
                <div className="p-4 text-[#92a4c9] text-sm text-center mt-10">
                    View not implemented
                </div>
            )}
        </div>

        {/* 3. Main Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#101622]">
            {/* Tab Bar */}
            <div className="h-9 bg-[#111722] flex items-center overflow-x-auto no-scrollbar border-b border-white/10">
            {openTabs.map(tab => (
                <div 
                key={tab.id}
                className={`
                    flex items-center h-full px-3 min-w-[120px] max-w-[200px] cursor-pointer text-sm border-r border-white/10 group transition-colors
                    ${activeTabId === tab.id ? 'bg-[#101622] text-white border-t-2 border-t-[#135bec]' : 'bg-[#161b26] text-[#92a4c9] hover:bg-[#1c2230]'}
                `}
                onClick={() => setActiveTabId(tab.id)}
                >
                <span className="mr-2 truncate flex-1 font-medium">
                    {tab.title} {tab.isDirty && '●'}
                </span>
                <span 
                    className={`rounded-md p-0.5 hover:bg-white/10 ${activeTabId === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    onClick={(e) => handleTabClose(e, tab.id)}
                >
                    <X size={12} />
                </span>
                </div>
            ))}
            </div>

            {/* Editor Toolbar (Only show if not settings) */}
            {activeTabId !== 'settings' && (
                <div className="h-8 flex items-center px-4 bg-[#101622] text-xs text-[#92a4c9] border-b border-white/10">
                    <span className="hover:text-white cursor-pointer">project</span>
                    <span className="mx-1 text-[#555]">{'>'}</span>
                    <span className="hover:text-white cursor-pointer">{activeFileNode?.name || 'No file'}</span>
                    
                    <div className="ml-auto flex space-x-3 items-center">
                    <button onClick={toggleMobileView} className={`hover:text-white ${isMobilePreview && showPreview ? 'text-[#135bec]' : ''}`} title="Mobile View">
                        <Box size={14} />
                    </button>
                    </div>
                </div>
            )}

            {/* Editor / Preview Split View */}
            <div className="flex-1 relative flex overflow-hidden">
            
            {/* Main Content Area (Editor) */}
            <div className={`h-full relative flex-1 flex flex-col ${showPreview ? 'border-r border-white/10' : ''}`}>
                {renderMainContent()}
            </div>

            {/* Live Preview Panel (Right) */}
            {showPreview && activeTabId !== 'settings' && (
                <div className="w-1/3 min-w-[300px] h-full z-10">
                    <WebPreview 
                        htmlContent={getFileContent('index.html')}
                        cssContent={getFileContent('style.css')}
                        jsContent={getFileContent('script.js')}
                        isMobile={isMobilePreview}
                        onClose={() => setShowPreview(false)}
                        onToggleMobile={() => setIsMobilePreview(!isMobilePreview)}
                    />
                </div>
            )}

            </div>

            {/* Terminal Panel */}
            <TerminalPanel 
                isVisible={showTerminal} 
                onClose={() => setShowTerminal(false)} 
                onCommand={handleTerminalCommand}
                currentPath={currentTermDirName}
            />
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="h-6 bg-[#135bec] text-white flex items-center px-3 text-xs justify-between select-none z-30 shrink-0 font-medium shadow-inner">
          <div className="flex items-center space-x-4">
            <div 
                className="flex items-center cursor-pointer hover:bg-white/20 px-1 rounded transition-colors"
                onClick={toggleLiveServer}
            >
                {installedExtensions.includes('live-server') ? (
                    showPreview ? <span className="flex items-center font-bold"><XCircle size={12} className="mr-1"/> Stop Live</span> : <span className="flex items-center font-bold"><Play size={12} className="mr-1"/> Go Live</span>
                ) : null}
            </div>
            <div className="flex items-center space-x-1 cursor-pointer hover:bg-white/20 px-1 rounded transition-colors" onClick={() => setShowTerminal(!showTerminal)}>
                <TerminalSquare size={12} className="mr-1" />
                <span>{showTerminal ? 'Close Terminal' : 'Terminal'}</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
             <span>{geminiModel === 'gemini-2.5-pro' ? 'Gemini Pro' : 'Gemini Flash'}</span>
             <span>Ln {activeFileNode?.content?.split?.('\n')?.length || 0}, Col 1</span>
             <span>UTF-8</span>
             <span>{activeFileNode?.language?.toUpperCase() || 'TXT'}</span>
             <span className="hover:bg-white/20 px-1 rounded cursor-pointer transition-colors">Prettier</span>
          </div>
        </div>
    </div>
  );
}
