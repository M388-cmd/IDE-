import { FileSystemNode, FileType, Extension } from './types';

export const DEFAULT_EXTENSIONS: Extension[] = [
  {
    id: 'live-server',
    name: 'Live Server',
    description: 'Launch a development local server with live reload feature for static & dynamic pages.',
    publisher: 'Ritwick Dey',
    icon: 'Radio',
    downloads: '42M',
    installed: false,
    category: 'server'
  },
  {
    id: 'mobile-view',
    name: 'Mobile Simulator',
    description: 'Simulate mobile devices for responsive web development.',
    publisher: 'Google',
    icon: 'Smartphone',
    downloads: '15M',
    installed: false,
    category: 'utility'
  },
  {
    id: 'prettier',
    name: 'Prettier - Code formatter',
    description: 'Code formatter using prettier.',
    publisher: 'Prettier',
    icon: 'Check',
    downloads: '38M',
    installed: true,
    category: 'formatter'
  },
  {
    id: 'eslint',
    name: 'ESLint',
    description: 'Integrates ESLint into VS Code.',
    publisher: 'Microsoft',
    icon: 'ShieldAlert',
    downloads: '29M',
    installed: true,
    category: 'linter'
  },
  {
    id: 'gitlens',
    name: 'GitLens — Git supercharged',
    description: 'Supercharge the built-in Git capabilities.',
    publisher: 'GitKraken',
    icon: 'GitGraph',
    downloads: '25M',
    installed: false,
    category: 'utility'
  }
];

export const DEFAULT_FILES: FileSystemNode[] = [
  {
    id: 'root',
    name: 'Project',
    type: FileType.FOLDER,
    isOpen: true,
    parentId: null,
    children: [
      {
        id: 'index_html',
        name: 'index.html',
        type: FileType.FILE,
        parentId: 'root',
        language: 'html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Preview</title>
    <style>
      /* Styles are injected here in preview */
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        background: #121212;
        color: white;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
      }
      .card {
        background: #1e1e1e;
        padding: 2rem;
        border-radius: 12px;
        border: 1px solid #333;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        max-width: 300px;
      }
      button {
        background: #007acc;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 1rem;
        margin-top: 1rem;
      }
      button:hover {
        background: #005fa3;
      }
    </style>
</head>
<body>
    <div class="card">
      <h1>Hello World</h1>
      <p>Edit files to see changes in Live Server!</p>
      <button id="counter">Count: 0</button>
    </div>
    <script>
      // Scripts are injected here in preview
      let count = 0;
      const btn = document.getElementById('counter');
      btn.addEventListener('click', () => {
        count++;
        btn.innerText = 'Count: ' + count;
      });
    </script>
</body>
</html>`
      },
      {
        id: 'style_css',
        name: 'style.css',
        type: FileType.FILE,
        parentId: 'root',
        language: 'css',
        content: `/* External CSS Support */
body { 
  /* This file is conceptually linked to index.html in the preview logic */
}`
      },
      {
        id: 'script_js',
        name: 'script.js',
        type: FileType.FILE,
        parentId: 'root',
        language: 'javascript',
        content: `// External JS Support
console.log('Script loaded');`
      },
      {
        id: 'readme_md',
        name: 'README.md',
        type: FileType.FILE,
        parentId: 'root',
        language: 'markdown',
        content: `# My Project

Welcome to AI Code Studio.

## Features
- Integrated Terminal
- Extension Marketplace
- Gemini AI Assistant
`
      }
    ]
  }
];
