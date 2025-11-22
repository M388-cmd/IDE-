

export enum FileType {
  FILE = 'FILE',
  FOLDER = 'FOLDER'
}

export interface FileSystemNode {
  id: string;
  name: string;
  type: FileType;
  content?: string;
  language?: string;
  children?: FileSystemNode[];
  isOpen?: boolean; // For folders
  parentId?: string | null;
  handle?: any; // FileSystemHandle (Native Browser API)
}

export interface Tab {
  id: string; // Matches fileId
  title: string;
  isDirty: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isLoading?: boolean;
}

export enum ViewMode {
  EXPLORER = 'EXPLORER',
  SEARCH = 'SEARCH',
  GIT = 'GIT',
  EXTENSIONS = 'EXTENSIONS',
  SETTINGS = 'SETTINGS'
}

export interface Extension {
  id: string;
  name: string;
  description: string;
  publisher: string;
  icon: string;
  downloads: string;
  installed: boolean;
  category: 'server' | 'formatter' | 'linter' | 'utility' | 'theme';
}

export interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
  directory?: string;
}

export type ProjectState = 'WELCOME' | 'EDITING';

export type GeminiModel = 'gemini-2.5-flash' | 'gemini-2.5-pro';
