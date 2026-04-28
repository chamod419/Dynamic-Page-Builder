let cachedProjects = [];
let cachedNodes = [];

let selectedProjectId = "";
let selectedProjectRoot = "";
let selectedFolderPath = "";
let selectedFilePath = "";

const collapsedFolders = new Set();

let monacoApi = null;
let monacoEditor = null;

let fallbackTextarea = null;
let fallbackHighlightEl = null;
let fallbackLineNumbersEl = null;

let activeEditorValue = "";
let activeEditorLanguage = "plaintext";
let activeEditorPath = "empty.txt";
let activeEditorReadOnly = true;

const projectsListEl = document.getElementById("projectsList");
const nodesTreeEl = document.getElementById("nodesTree");
const selectedProjectTextEl = document.getElementById("selectedProjectText");
const selectedFolderTextEl = document.getElementById("selectedFolderText");
const selectedPathInputEl = document.getElementById("selectedPathInput");
const editorHostEl = document.getElementById("editorHost");
const editorEmptyEl = document.getElementById("editorEmpty");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");
const editorModeEl = document.getElementById("editorMode");
const fileTypeBadgeEl = document.getElementById("fileTypeBadge");
const languageBadgeEl = document.getElementById("languageBadge");
const previewFrame = document.getElementById("previewFrame");

const newProjectBtn = document.getElementById("newProjectBtn");
const renameProjectBtn = document.getElementById("renameProjectBtn");
const deleteProjectBtn = document.getElementById("deleteProjectBtn");
const refreshProjectsBtn = document.getElementById("refreshProjectsBtn");

const newFileBtn = document.getElementById("newFileBtn");
const newFolderBtn = document.getElementById("newFolderBtn");
const renameBtn = document.getElementById("renameBtn");
const deleteBtn = document.getElementById("deleteBtn");
const refreshBtn = document.getElementById("refreshBtn");

const publishedUrlRowEl = document.getElementById("publishedUrlRow");
const publishedUrlLinkEl = document.getElementById("publishedUrlLink");


let projectModalEl = null;
let projectModalTitleEl = null;
let projectModalSubtitleEl = null;
let projectNameInputEl = null;
let projectTypeCardsEl = null;
let projectStructurePreviewEl = null;
let projectModalStatusEl = null;
let projectCreateConfirmBtnEl = null;
let projectCancelBtnEl = null;
let projectCloseBtnEl = null;
let selectedModalProjectType = "html-site";
let isCreatingProject = false;

let fileModalEl = null;
let fileNameInputEl = null;
let fileFolderTextEl = null;
let fileTypeCardsEl = null;
let fileTemplatePreviewEl = null;
let fileModalStatusEl = null;
let fileCreateConfirmBtnEl = null;
let fileCancelBtnEl = null;
let fileCloseBtnEl = null;
let selectedModalFileType = "html";
let isCreatingFile = false;

let inlineCreateMode = "";
let inlineCreateParentPath = "";
let inlineCreateValue = "";
let inlineCreateError = "";
let isInlineCreating = false;

let inlineRenamePath = "";
let inlineRenameValue = "";
let inlineRenameError = "";
let isInlineRenaming = false;

const PROJECT_TYPE_OPTIONS = [
  {
    type: "html-site",
    icon: "H",
    title: "HTML Site",
    subtitle: "Static pages with HTML, CSS, and JavaScript.",
    accentClass: "html",
    structure: [
      "index.html",
      "style.css",
      "script.js",
    ],
  },
  {
    type: "react-vite",
    icon: "R",
    title: "React + Vite",
    subtitle: "Component-driven React starter with Vite structure.",
    accentClass: "react",
    structure: [
      "public/",
      "src/",
      "  app.jsx",
      "  index.css",
      "  main.jsx",
      "index.html",
      "package.json",
      "vite.config.js",
    ],
  },
  {
    type: "vue-vite",
    icon: "V",
    title: "Vue + Vite",
    subtitle: "Vue single-file component starter with Vite structure.",
    accentClass: "vue",
    structure: [
      "public/",
      "src/",
      "  app.vue",
      "  main.js",
      "  style.css",
      "index.html",
      "package.json",
      "vite.config.js",
    ],
  },
 ];

const FILE_TYPE_OPTIONS = [
  {
    type: "html",
    icon: "<>",
    title: "HTML",
    extension: "html",
    subtitle: "Page markup with document starter.",
    accentClass: "html",
  },
  {
    type: "css",
    icon: "#",
    title: "CSS",
    extension: "css",
    subtitle: "Stylesheet with clean starter rules.",
    accentClass: "css",
  },
  {
    type: "js",
    icon: "JS",
    title: "JavaScript",
    extension: "js",
    subtitle: "Browser script or Vite module file.",
    accentClass: "js",
  },
  {
    type: "jsx",
    icon: "⚛",
    title: "React JSX",
    extension: "jsx",
    subtitle: "React component file with export default.",
    accentClass: "react",
  },
  {
    type: "vue",
    icon: "V",
    title: "Vue SFC",
    extension: "vue",
    subtitle: "Vue single-file component template.",
    accentClass: "vue",
  },
  {
    type: "json",
    icon: "{}",
    title: "JSON",
    extension: "json",
    subtitle: "Structured data or configuration file.",
    accentClass: "json",
  },
  {
    type: "md",
    icon: "MD",
    title: "Markdown",
    extension: "md",
    subtitle: "Documentation or content note.",
    accentClass: "md",
  },
];

function injectVsCodePolishStyles() {
  if (document.getElementById("builder-vscode-polish-style")) return;

  const style = document.createElement("style");
  style.id = "builder-vscode-polish-style";

  style.textContent = `
    .toolbar {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: flex-end !important;
      gap: 2px !important;
      flex-wrap: nowrap !important;
      min-width: max-content !important;
    }

    .icon-btn {
      position: relative !important;
      width: 30px !important;
      min-width: 30px !important;
      height: 30px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 0 !important;
      padding: 0 !important;
      border: 1px solid transparent !important;
      border-radius: 6px !important;
      background: transparent !important;
      color: #c5c5c5 !important;
      font-size: 12px !important;
      font-weight: 700 !important;
      line-height: 1 !important;
      cursor: pointer !important;
      box-shadow: none !important;
      transition:
        background 0.12s ease,
        border-color 0.12s ease,
        color 0.12s ease,
        transform 0.12s ease !important;
    }

    .icon-btn:hover {
      background: #2a2d2e !important;
      border-color: #3a3d41 !important;
      color: #ffffff !important;
    }

    .icon-btn:active {
      transform: translateY(1px) !important;
    }

    .icon-btn:disabled {
      opacity: 0.38 !important;
      cursor: not-allowed !important;
      transform: none !important;
    }

    .icon-btn svg {
      width: 15px !important;
      height: 15px !important;
      flex: 0 0 15px !important;
      stroke: currentColor !important;
      stroke-width: 2 !important;
      stroke-linecap: round !important;
      stroke-linejoin: round !important;
      fill: none !important;
    }

    .icon-btn .btn-label {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    }

    .icon-btn.action-create:hover {
      color: #89d185 !important;
    }

    .icon-btn.action-rename:hover {
      color: #dcdcaa !important;
    }

    .icon-btn.action-delete:hover {
      color: #f48771 !important;
    }

    .icon-btn.action-refresh:hover {
      color: #75beff !important;
    }


    .explorer-context {
      display: none !important;
    }

    .section-card:has(#nodesTree) .section-body {
      padding-top: 10px !important;
    }

    .project-dropdown {
      position: relative !important;
      width: 100% !important;
    }

    .section-card.project-dropdown-open,
    .section-card:has(.project-dropdown.open) {
      overflow: visible !important;
      position: relative !important;
      z-index: 120 !important;
    }

    .workspace-scroll:has(.project-dropdown.open) {
      overflow: visible !important;
    }

    .project-picker-trigger {
      width: 100% !important;
      min-height: 48px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 10px !important;
      padding: 10px 12px !important;
      border: 1px solid #333333 !important;
      border-radius: 8px !important;
      background: #252526 !important;
      color: #d4d4d4 !important;
      cursor: pointer !important;
      text-align: left !important;
      transition: background 0.12s ease, border-color 0.12s ease !important;
    }

    .project-picker-trigger:hover {
      background: #2a2d2e !important;
      border-color: #007acc !important;
    }

    .project-picker-trigger-main {
      min-width: 0 !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
    }

    .project-picker-text {
      min-width: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 2px !important;
    }

    .project-picker-name {
      color: #ffffff !important;
      font-size: 13px !important;
      font-weight: 800 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    .project-picker-meta {
      color: #9ca3af !important;
      font-size: 11px !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
    }

    .project-picker-arrow {
      width: 18px !important;
      flex: 0 0 18px !important;
      color: #c5c5c5 !important;
      font-size: 12px !important;
      display: inline-flex !important;
      justify-content: center !important;
      transition: transform 0.12s ease !important;
    }

    .project-dropdown.open .project-picker-arrow {
      transform: rotate(180deg) !important;
    }

    .project-menu {
      display: none !important;
      position: absolute !important;
      z-index: 50 !important;
      left: 0 !important;
      right: 0 !important;
      top: calc(100% + 6px) !important;
      max-height: 300px !important;
      overflow: auto !important;
      padding: 6px !important;
      border: 1px solid #3c3c3c !important;
      border-radius: 8px !important;
      background: #252526 !important;
      box-shadow: 0 18px 45px rgba(0, 0, 0, 0.42) !important;
    }

    .project-dropdown.open .project-menu {
      display: flex !important;
      flex-direction: column !important;
      gap: 2px !important;
    }

    .project-menu::-webkit-scrollbar {
      width: 10px !important;
    }

    .project-menu::-webkit-scrollbar-track {
      background: #1e1e1e !important;
    }

    .project-menu::-webkit-scrollbar-thumb {
      background: #555 !important;
      border-radius: 999px !important;
      border: 2px solid #1e1e1e !important;
    }

    .project-menu .project-item {
      padding: 9px 10px !important;
      border-radius: 6px !important;
    }

    .project-menu .project-item.active {
      background: #04395e !important;
      border-color: rgba(0, 122, 204, 0.7) !important;
    }


    .project-item,
    .tree-row {
      background: transparent !important;
      color: #cccccc !important;
      border: 1px solid transparent !important;
      box-shadow: none !important;
    }

    .project-item:hover,
    .tree-row:hover {
      background: #2a2d2e !important;
    }

    .project-item.active,
    .tree-row.file-active,
    .tree-row.folder-active {
      background: #37373d !important;
      border-color: rgba(0, 122, 204, 0.65) !important;
    }

    .tree-row {
      min-height: 24px !important;
      border-radius: 4px !important;
      padding-top: 2px !important;
      padding-bottom: 2px !important;
      white-space: nowrap !important;
    }

    .tree-label {
      color: #d4d4d4 !important;
      font-size: 13px !important;
      font-weight: 500 !important;
    }

    .tree-meta {
      color: #858585 !important;
      font-size: 10.5px !important;
      opacity: 0 !important;
    }

    .tree-row:hover .tree-meta,
    .tree-row.file-active .tree-meta,
    .tree-row.folder-active .tree-meta {
      opacity: 1 !important;
    }

    .vscode-icon,
    .project-icon {
      width: 18px !important;
      height: 18px !important;
      flex: 0 0 18px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      font-family: Consolas, Menlo, Monaco, monospace !important;
      font-size: 10px !important;
      font-weight: 900 !important;
      line-height: 1 !important;
      user-select: none !important;
    }

    .project-icon {
      border-radius: 5px !important;
    }

    .project-icon.html {
      color: #e44d26 !important;
      background: rgba(228, 77, 38, 0.13) !important;
    }

    .project-icon.react {
      color: #61dafb !important;
      background: rgba(97, 218, 251, 0.13) !important;
    }

    .project-icon.vue {
      color: #42b883 !important;
      background: rgba(66, 184, 131, 0.13) !important;
    }

    .icon-folder { color: #dcb67a !important; font-size: 15px !important; }
    .icon-html { color: #e44d26 !important; }
    .icon-css { color: #42a5f5 !important; }
    .icon-js { color: #f7df1e !important; }
    .icon-react { color: #61dafb !important; font-size: 13px !important; }
    .icon-vue { color: #42b883 !important; }
    .icon-json { color: #f2c94c !important; }
    .icon-md { color: #9cdcfe !important; }
    .icon-astro { color: #ff5d01 !important; }
    .icon-config { color: #c586c0 !important; }
    .icon-text { color: #c5c5c5 !important; }

    .fallback-code-editor {
      position: absolute;
      inset: 0;
      display: grid;
      grid-template-columns: 58px minmax(0, 1fr);
      background: #1e1e1e;
      color: #d4d4d4;
      font-family: Consolas, Menlo, Monaco, monospace;
      font-size: 14px;
      line-height: 22px;
      overflow: hidden;
    }

    .fallback-line-numbers {
      padding: 16px 10px 16px 0;
      text-align: right;
      color: #858585;
      background: #1e1e1e;
      border-right: 1px solid #2f2f2f;
      user-select: none;
      white-space: pre;
      overflow: hidden;
      line-height: 22px;
    }

    .fallback-code-area {
      position: relative;
      min-width: 0;
      overflow: hidden;
      background: #1e1e1e;
    }

    .fallback-highlight,
    .fallback-input {
      position: absolute;
      inset: 0;
      margin: 0;
      border: 0;
      outline: 0;
      padding: 16px;
      font-family: Consolas, Menlo, Monaco, monospace;
      font-size: 14px;
      line-height: 22px;
      white-space: pre;
      tab-size: 2;
      overflow: auto;
    }

    .fallback-highlight {
      pointer-events: none;
      color: #d4d4d4;
      background: #1e1e1e;
    }

    .fallback-input {
      resize: none;
      background: transparent !important;
      color: transparent !important;
      -webkit-text-fill-color: transparent !important;
      caret-color: #ffffff;
      z-index: 2;
    }

    .fallback-input::selection {
      background: rgba(38, 79, 120, 0.85);
    }

    .fallback-input:disabled {
      cursor: not-allowed;
    }

    .tok-comment { color: #6a9955; font-style: italic; }
    .tok-keyword { color: #c586c0; }
    .tok-string { color: #ce9178; }
    .tok-number { color: #b5cea8; }
    .tok-tag { color: #569cd6; }
    .tok-attr { color: #9cdcfe; }
    .tok-punct { color: #808080; }
    .tok-function { color: #dcdcaa; }
    .tok-type { color: #4ec9b0; }
    .tok-property { color: #9cdcfe; }
    .tok-css-value { color: #ce9178; }
    .tok-selector { color: #d7ba7d; }

    .inline-create-wrap {
      margin: 2px 0 4px;
    }

    .inline-create-row {
      width: 100%;
      min-height: 28px;
      display: flex;
      align-items: center;
      gap: 5px;
      border: 1px solid rgba(0, 122, 204, 0.72);
      border-radius: 4px;
      background: #252526;
      padding-top: 2px;
      padding-bottom: 2px;
      padding-right: 8px;
      box-shadow: inset 0 0 0 1px rgba(0, 122, 204, 0.18);
    }

    .inline-create-input {
      min-width: 0;
      width: 100%;
      height: 22px;
      border: 0;
      outline: 0;
      padding: 0 4px;
      border-radius: 3px;
      background: #3c3c3c;
      color: #ffffff;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      font-size: 13px;
      font-weight: 600;
    }

    .inline-create-input::selection {
      background: #264f78;
    }

    .inline-create-helper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 3px 8px 0 37px;
      color: #858585;
      font-size: 10.5px;
      line-height: 1.35;
    }

    .inline-create-error {
      color: #f48771;
      font-size: 10.5px;
      line-height: 1.35;
    }

    .inline-create-kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border: 1px solid #3c3c3c;
      border-bottom-color: #5a5a5a;
      border-radius: 4px;
      background: #202020;
      color: #d4d4d4;
      font-family: Consolas, Menlo, Monaco, monospace;
      font-size: 9.5px;
      font-weight: 800;
    }

    .inline-rename-row {
      border-color: rgba(14, 99, 156, 0.88);
      background: #2a2d2e;
    }

    .inline-rename-input {
      background: #3c3c3c;
      color: #ffffff;
    }

    .framework-preview-note {
      font-family: system-ui, Arial, sans-serif;
      margin: 24px;
      padding: 18px;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      color: #64748b;
      background: #f8fafc;
      line-height: 1.6;
    }

    .monaco-editor,
    .monaco-editor-background,
    .monaco-editor .margin {
      background-color: #1e1e1e !important;
    }
  `;

  document.head.appendChild(style);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function safeStyleContent(value) {
  return String(value || "").replace(/<\/style/gi, "<\\/style");
}

function safeScriptContent(value) {
  return String(value || "").replace(/<\/script/gi, "<\\/script");
}

function getFileExtension(fileName) {
  const name = String(fileName || "").toLowerCase();
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1) : "";
}

function detectFileType(fileName, fallback) {
  const ext = getFileExtension(fileName);

  if (ext === "html" || ext === "htm") return "html";
  if (ext === "css" || ext === "scss" || ext === "less") return "css";
  if (ext === "js" || ext === "mjs" || ext === "cjs") return "js";
  if (ext === "jsx") return "jsx";
  if (ext === "ts") return "ts";
  if (ext === "tsx") return "tsx";
  if (ext === "vue") return "vue";
  if (ext === "json") return "json";
  if (ext === "md" || ext === "mdx") return "md";
  if (ext === "astro") return "astro";

  const allowedFallbacks = [
    "html",
    "css",
    "js",
    "jsx",
    "ts",
    "tsx",
    "vue",
    "json",
    "md",
    "astro",
    "txt",
  ];

  return allowedFallbacks.includes(fallback) ? fallback : "txt";
}

function getMonacoLanguage(fileName, fallback) {
  const fileType = detectFileType(fileName, fallback);

  if (fileType === "html") return "builder-html";
  if (fileType === "css") return "builder-css";
  if (fileType === "js" || fileType === "jsx") return "builder-javascript";
  if (fileType === "ts" || fileType === "tsx") return "builder-typescript";
  if (fileType === "vue") return "builder-html";
  if (fileType === "json") return "builder-json";
  if (fileType === "md") return "markdown";
  if (fileType === "astro") return "builder-html";

  const ext = getFileExtension(fileName);

  if (ext === "xml" || ext === "svg") return "xml";
  if (ext === "php") return "php";
  if (ext === "py") return "python";
  if (ext === "sh" || ext === "bash") return "shell";
  if (ext === "yml" || ext === "yaml") return "yaml";

  return "plaintext";
}

function getFileTypeLabel(fileName, fallback) {
  const type = detectFileType(fileName, fallback);

  if (type === "html") return "HTML";
  if (type === "css") return "CSS";
  if (type === "js") return "JavaScript";
  if (type === "jsx") return "React JSX";
  if (type === "ts") return "TypeScript";
  if (type === "tsx") return "React TSX";
  if (type === "vue") return "Vue";
  if (type === "json") return "JSON";
  if (type === "md") return "Markdown";
  if (type === "astro") return "Astro";

  return "Text";
}

function getProjectTypeLabel(type) {
  if (type === "react-vite") return "React + Vite";
  if (type === "vue-vite") return "Vue + Vite";
  return "HTML Site";
}

function getProjectTypeClass(type) {
  if (type === "react-vite") return "react";
  if (type === "vue-vite") return "vue";
  return "html";
}

function getProjectIconText(type) {
  if (type === "react-vite") return "R";
  if (type === "vue-vite") return "V";
  return "H";
}

function getDefaultFileNameForProject(type) {
  if (type === "react-vite") return "App.jsx";
  if (type === "vue-vite") return "App.vue";
  return "index.html";
}

function iconSvg(name) {
  const icons = {
    project: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H10l2 2h5.5A2.5 2.5 0 0 1 20 8.5v9A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-11Z"></path>
        <path d="M12 10v6"></path>
        <path d="M9 13h6"></path>
      </svg>
    `,
    file: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3.5h6l4 4v13H7V3.5Z"></path>
        <path d="M13 3.5v5h5"></path>
        <path d="M12 11.5v5"></path>
        <path d="M9.5 14h5"></path>
      </svg>
    `,
    folder: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 6.5A2.5 2.5 0 0 1 6 4h4l2 2h6A2.5 2.5 0 0 1 20.5 8.5v8A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5v-10Z"></path>
        <path d="M12 10.5v5"></path>
        <path d="M9.5 13h5"></path>
      </svg>
    `,
    rename: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 20h4l10.5-10.5a2.2 2.2 0 0 0-3.1-3.1L5 16.8 4 20Z"></path>
        <path d="M14 7l3 3"></path>
      </svg>
    `,
    delete: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 7h14"></path>
        <path d="M10 11v6"></path>
        <path d="M14 11v6"></path>
        <path d="M8 7l1-3h6l1 3"></path>
        <path d="M7 7l1 13h8l1-13"></path>
      </svg>
    `,
    refresh: `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 6v5h-5"></path>
        <path d="M4 18v-5h5"></path>
        <path d="M18.5 9A7 7 0 0 0 6.2 6.8L4 9"></path>
        <path d="M5.5 15A7 7 0 0 0 17.8 17.2L20 15"></path>
      </svg>
    `,
  };

  return icons[name] || "";
}

function setActionButtonIcon(button, iconName, label, className) {
  if (!button) return;

  button.classList.add(className);
  button.setAttribute("title", label);
  button.setAttribute("aria-label", label);
  button.innerHTML = `${iconSvg(iconName)}<span class="btn-label">${escapeHtml(label)}</span>`;
}

function setupActionButtonIcons() {
  setActionButtonIcon(newProjectBtn, "project", "New Project", "action-create");
  setActionButtonIcon(renameProjectBtn, "rename", "Rename Project", "action-rename");
  setActionButtonIcon(deleteProjectBtn, "delete", "Delete Project", "action-delete");
  setActionButtonIcon(refreshProjectsBtn, "refresh", "Refresh Projects", "action-refresh");

  setActionButtonIcon(newFileBtn, "file", "New File", "action-create");
  setActionButtonIcon(newFolderBtn, "folder", "New Folder", "action-create");
  setActionButtonIcon(renameBtn, "rename", "Rename", "action-rename");
  setActionButtonIcon(deleteBtn, "delete", "Delete", "action-delete");
  setActionButtonIcon(refreshBtn, "refresh", "Refresh", "action-refresh");
}

function getNodeIconInfo(node) {
  if (!node) return { className: "vscode-icon icon-text", text: "•" };

  if (node.kind === "folder") {
    return { className: "vscode-icon icon-folder", text: "▰" };
  }

  const ext = getFileExtension(node.name);
  const name = String(node.name || "").toLowerCase();

  if (ext === "html" || ext === "htm") return { className: "vscode-icon icon-html", text: "<>" };
  if (ext === "css" || ext === "scss" || ext === "less") return { className: "vscode-icon icon-css", text: "#" };
  if (ext === "js" || ext === "mjs" || ext === "cjs") return { className: "vscode-icon icon-js", text: "JS" };
  if (ext === "jsx") return { className: "vscode-icon icon-react", text: "⚛" };
  if (ext === "ts") return { className: "vscode-icon icon-css", text: "TS" };
  if (ext === "tsx") return { className: "vscode-icon icon-react", text: "TSX" };
  if (ext === "vue") return { className: "vscode-icon icon-vue", text: "V" };
  if (ext === "json") return { className: "vscode-icon icon-json", text: "{}" };
  if (ext === "md" || ext === "mdx") return { className: "vscode-icon icon-md", text: "MD" };
  if (ext === "astro") return { className: "vscode-icon icon-astro", text: "A" };

  if (
    name.includes("config") ||
    name.includes("vite") ||
    name.includes("package") ||
    name.includes("tsconfig")
  ) {
    return { className: "vscode-icon icon-config", text: "⚙" };
  }

  return { className: "vscode-icon icon-text", text: "•" };
}

function getNodeIconMarkup(node) {
  const icon = getNodeIconInfo(node);
  return `<span class="${icon.className}" aria-hidden="true">${escapeHtml(icon.text)}</span>`;
}

function highlightHtmlLine(line) {
  let result = "";
  let lastIndex = 0;

  const tagRegex = /(<!--.*?-->)|(<\/?)([A-Za-z][\w:-]*)([^>]*?)(\/?>)/g;
  let match;

  while ((match = tagRegex.exec(line)) !== null) {
    result += escapeHtml(line.slice(lastIndex, match.index));

    if (match[1]) {
      result += `<span class="tok-comment">${escapeHtml(match[1])}</span>`;
    } else {
      result += `<span class="tok-punct">${escapeHtml(match[2])}</span>`;
      result += `<span class="tok-tag">${escapeHtml(match[3])}</span>`;
      result += highlightAttributes(match[4] || "");
      result += `<span class="tok-punct">${escapeHtml(match[5])}</span>`;
    }

    lastIndex = tagRegex.lastIndex;
  }

  result += escapeHtml(line.slice(lastIndex));
  return result;
}

function highlightAttributes(attrs) {
  return escapeHtml(attrs).replace(
    /([:@A-Za-z_][\w:.-]*)(\s*=\s*)(&quot;.*?&quot;|&#39;.*?&#39;|[^\s"'=<>`]+)/g,
    `<span class="tok-attr">$1</span><span class="tok-punct">$2</span><span class="tok-string">$3</span>`
  );
}

function highlightJsLine(line) {
  let html = escapeHtml(line);

  html = html.replace(/(\/\/.*)$/g, `<span class="tok-comment">$1</span>`);
  html = html.replace(/(&quot;.*?&quot;|&#39;.*?&#39;|`.*?`)/g, `<span class="tok-string">$1</span>`);
  html = html.replace(/\b(import|from|export|default|function|return|const|let|var|if|else|for|while|class|extends|new|try|catch|async|await|true|false|null|undefined)\b/g, `<span class="tok-keyword">$1</span>`);
  html = html.replace(/\b([A-Z][A-Za-z0-9_]*)\b/g, `<span class="tok-type">$1</span>`);
  html = html.replace(/\b([a-zA-Z_$][\w$]*)(?=\s*\()/g, `<span class="tok-function">$1</span>`);
  html = html.replace(/\b(\d+(\.\d+)?)\b/g, `<span class="tok-number">$1</span>`);

  return html;
}

function highlightCssLine(line) {
  let html = escapeHtml(line);

  html = html.replace(/(\/\*.*?\*\/)/g, `<span class="tok-comment">$1</span>`);
  html = html.replace(/(&quot;.*?&quot;|&#39;.*?&#39;)/g, `<span class="tok-string">$1</span>`);
  html = html.replace(/(#(?:[0-9a-fA-F]{3}){1,2})\b/g, `<span class="tok-number">$1</span>`);
  html = html.replace(/\b(\d+(\.\d+)?)(px|rem|em|%|vh|vw|s|ms)?\b/g, `<span class="tok-number">$1$3</span>`);
  html = html.replace(/([a-zA-Z-]+)(\s*:)/g, `<span class="tok-property">$1</span>$2`);
  html = html.replace(/\b(display|flex|grid|block|none|relative|absolute|fixed|sticky|center|space-between|white|black|transparent)\b/g, `<span class="tok-css-value">$1</span>`);

  return html;
}

function highlightJsonLine(line) {
  let html = escapeHtml(line);

  html = html.replace(/(&quot;[^&]*?&quot;)(\s*:)/g, `<span class="tok-property">$1</span>$2`);
  html = html.replace(/(:\s*)(&quot;[^&]*?&quot;)/g, `$1<span class="tok-string">$2</span>`);
  html = html.replace(/\b(true|false|null)\b/g, `<span class="tok-keyword">$1</span>`);
  html = html.replace(/\b(\d+(\.\d+)?)\b/g, `<span class="tok-number">$1</span>`);

  return html;
}

function highlightCode(code, language) {
  return String(code || "")
    .split("\n")
    .map((line) => {
      if (language === "html" || language === "xml") return highlightHtmlLine(line);
      if (language === "css") return highlightCssLine(line);
      if (language === "javascript" || language === "typescript") return highlightJsLine(line);
      if (language === "json") return highlightJsonLine(line);
      return escapeHtml(line);
    })
    .join("\n");
}

function updateFallbackHighlight() {
  if (!fallbackHighlightEl || !fallbackLineNumbersEl || !fallbackTextarea) return;

  const value = fallbackTextarea.value || "";
  const lineCount = Math.max(1, value.split("\n").length);

  fallbackHighlightEl.innerHTML = highlightCode(value, activeEditorLanguage);
  fallbackLineNumbersEl.textContent = Array.from(
    { length: lineCount },
    (_, index) => index + 1
  ).join("\n");

  fallbackHighlightEl.scrollTop = fallbackTextarea.scrollTop;
  fallbackHighlightEl.scrollLeft = fallbackTextarea.scrollLeft;
  fallbackLineNumbersEl.scrollTop = fallbackTextarea.scrollTop;
}

function setupFallbackEditor() {
  if (!editorHostEl) return;

  const wrapper = document.createElement("div");
  wrapper.className = "fallback-code-editor";

  fallbackLineNumbersEl = document.createElement("div");
  fallbackLineNumbersEl.className = "fallback-line-numbers";
  fallbackLineNumbersEl.textContent = "1";

  const area = document.createElement("div");
  area.className = "fallback-code-area";

  fallbackHighlightEl = document.createElement("pre");
  fallbackHighlightEl.className = "fallback-highlight";

  fallbackTextarea = document.createElement("textarea");
  fallbackTextarea.className = "fallback-input";
  fallbackTextarea.spellcheck = false;
  fallbackTextarea.wrap = "off";
  fallbackTextarea.disabled = true;
  fallbackTextarea.value = "";

  fallbackTextarea.addEventListener("input", () => {
    activeEditorValue = fallbackTextarea ? fallbackTextarea.value : "";
    updateFallbackHighlight();
    renderPreview();
  });

  fallbackTextarea.addEventListener("scroll", () => {
    updateFallbackHighlight();
  });

  area.appendChild(fallbackHighlightEl);
  area.appendChild(fallbackTextarea);

  wrapper.appendChild(fallbackLineNumbersEl);
  wrapper.appendChild(area);

  editorHostEl.innerHTML = "";
  editorHostEl.appendChild(wrapper);

  updateFallbackHighlight();
}

function registerBuilderSyntaxLanguages() {
  if (!monacoApi?.languages) return;

  const languageIds = [
    "builder-html",
    "builder-css",
    "builder-javascript",
    "builder-typescript",
    "builder-json",
  ];

  for (const id of languageIds) {
    const alreadyRegistered = monacoApi.languages
      .getLanguages()
      .some((language) => language.id === id);

    if (!alreadyRegistered) {
      monacoApi.languages.register({ id });
    }
  }

  monacoApi.languages.setLanguageConfiguration("builder-html", {
    comments: {
      blockComment: ["<!--", "-->"],
    },
    brackets: [
      ["<", ">"],
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "<", close: ">" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
    ],
    surroundingPairs: [
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: "<", close: ">" },
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
    ],
  });

  monacoApi.languages.setMonarchTokensProvider("builder-html", {
    defaultToken: "",
    ignoreCase: true,
    tokenizer: {
      root: [
        [/<!DOCTYPE[^>]*>/i, "metatag"],
        [/<!--/, "comment", "@comment"],
        [/(<\/?)([a-zA-Z][\w:-]*)/, ["delimiter.html", { token: "tag.html", next: "@tag" }]],
        [/</, { token: "delimiter.html", next: "@tag" }],
        [/[^<]+/, ""],
      ],

      comment: [
        [/-->/, "comment", "@pop"],
        [/[^-]+/, "comment"],
        [/./, "comment"],
      ],

      tag: [
        [/[a-zA-Z_:][\w:.-]*(?=\s*=)/, "attribute.name"],
        [/[a-zA-Z_:][\w:.-]*/, "attribute.name"],
        [/=/, "delimiter"],
        [/"[^"]*"/, "attribute.value"],
        [/'[^']*'/, "attribute.value"],
        [/[^\s"'=<>`]+/, "attribute.value"],
        [/\/?>/, { token: "delimiter.html", next: "@pop" }],
        [/\s+/, ""],
      ],
    },
  });

  monacoApi.languages.setLanguageConfiguration("builder-css", {
    comments: {
      blockComment: ["/*", "*/"],
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
  });

  monacoApi.languages.setMonarchTokensProvider("builder-css", {
    defaultToken: "",
    tokenizer: {
      root: [
        [/\/\*/, "comment", "@comment"],
        [/[.#]?[a-zA-Z_][\w-]*(?=\s*\{)/, "tag.css"],
        [/[a-zA-Z-]+(?=\s*:)/, "attribute.name.css"],
        [/:/, "delimiter"],
        [/[{}()[\];,]/, "delimiter"],
        [/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/, "number"],
        [/\d+(\.\d+)?(px|rem|em|%|vh|vw|s|ms)?\b/, "number"],
        [/"[^"]*"|'[^']*'/, "string"],
        [
          /\b(flex|grid|block|inline|none|relative|absolute|fixed|sticky|center|space-between|white|black|transparent|solid|auto)\b/,
          "attribute.value.css",
        ],
      ],
      comment: [
        [/\*\//, "comment", "@pop"],
        [/./, "comment"],
      ],
    },
  });

  monacoApi.languages.setLanguageConfiguration("builder-javascript", {
    comments: {
      lineComment: "//",
      blockComment: ["/*", "*/"],
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' },
      { open: "'", close: "'" },
      { open: "`", close: "`" },
    ],
  });

  monacoApi.languages.setMonarchTokensProvider("builder-javascript", {
    defaultToken: "",
    keywords: [
      "import",
      "from",
      "export",
      "default",
      "function",
      "return",
      "const",
      "let",
      "var",
      "if",
      "else",
      "for",
      "while",
      "class",
      "extends",
      "new",
      "try",
      "catch",
      "async",
      "await",
      "true",
      "false",
      "null",
      "undefined",
    ],
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/"([^"\\]|\\.)*"/, "string"],
        [/'([^'\\]|\\.)*'/, "string"],
        [/`([^`\\]|\\.)*`/, "string"],
        [/\b[A-Z][\w$]*\b/, "type"],
        [/[a-zA-Z_$][\w$]*(?=\s*\()/, "function"],
        [
          /[a-zA-Z_$][\w$]*/,
          {
            cases: {
              "@keywords": "keyword",
              "@default": "variable",
            },
          },
        ],
        [/\d+(\.\d+)?/, "number"],
        [/[{}()[\]]/, "delimiter.bracket"],
        [/[;,.]/, "delimiter"],
        [/[+\-*/%=!<>|&?:]+/, "operator"],
      ],
      comment: [
        [/\*\//, "comment", "@pop"],
        [/./, "comment"],
      ],
    },
  });

  monacoApi.languages.setMonarchTokensProvider("builder-typescript", {
    defaultToken: "",
    keywords: [
      "import",
      "from",
      "export",
      "default",
      "function",
      "return",
      "const",
      "let",
      "var",
      "if",
      "else",
      "for",
      "while",
      "class",
      "extends",
      "interface",
      "type",
      "new",
      "try",
      "catch",
      "async",
      "await",
      "true",
      "false",
      "null",
      "undefined",
    ],
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/"([^"\\]|\\.)*"/, "string"],
        [/'([^'\\]|\\.)*'/, "string"],
        [/`([^`\\]|\\.)*`/, "string"],
        [/\b[A-Z][\w$]*\b/, "type"],
        [/[a-zA-Z_$][\w$]*(?=\s*\()/, "function"],
        [
          /[a-zA-Z_$][\w$]*/,
          {
            cases: {
              "@keywords": "keyword",
              "@default": "variable",
            },
          },
        ],
        [/\d+(\.\d+)?/, "number"],
        [/[{}()[\]]/, "delimiter.bracket"],
        [/[;,.]/, "delimiter"],
        [/[+\-*/%=!<>|&?:]+/, "operator"],
      ],
      comment: [
        [/\*\//, "comment", "@pop"],
        [/./, "comment"],
      ],
    },
  });

  monacoApi.languages.setMonarchTokensProvider("builder-json", {
    defaultToken: "",
    tokenizer: {
      root: [
        [/"[^"]*"(?=\s*:)/, "attribute.name"],
        [/"[^"]*"/, "string"],
        [/\b(true|false|null)\b/, "keyword"],
        [/\d+(\.\d+)?/, "number"],
        [/[{}[\],:]/, "delimiter"],
      ],
    },
  });
}

async function setupMonacoEditor() {
  if (!editorHostEl) return;

  try {
    const [
      monacoModule,
      editorWorkerModule,
      cssWorkerModule,
      htmlWorkerModule,
      jsonWorkerModule,
      tsWorkerModule,
    ] = await Promise.all([
      import("monaco-editor/esm/vs/editor/editor.api"),
      import("monaco-editor/esm/vs/editor/editor.worker?worker"),
      import("monaco-editor/esm/vs/language/css/css.worker?worker"),
      import("monaco-editor/esm/vs/language/html/html.worker?worker"),
      import("monaco-editor/esm/vs/language/json/json.worker?worker"),
      import("monaco-editor/esm/vs/language/typescript/ts.worker?worker"),
      import("monaco-editor/min/vs/editor/editor.main.css"),
    ]);

    await Promise.all([
      import("monaco-editor/esm/vs/language/css/monaco.contribution"),
      import("monaco-editor/esm/vs/language/html/monaco.contribution"),
      import("monaco-editor/esm/vs/language/json/monaco.contribution"),
      import("monaco-editor/esm/vs/language/typescript/monaco.contribution"),
      import("monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution"),
      import("monaco-editor/esm/vs/basic-languages/xml/xml.contribution"),
      import("monaco-editor/esm/vs/basic-languages/php/php.contribution"),
      import("monaco-editor/esm/vs/basic-languages/python/python.contribution"),
      import("monaco-editor/esm/vs/basic-languages/shell/shell.contribution"),
      import("monaco-editor/esm/vs/basic-languages/yaml/yaml.contribution"),
    ]);

    monacoApi = monacoModule;

    registerBuilderSyntaxLanguages();

    globalThis.MonacoEnvironment = {
      getWorker(_workerId, label) {
        if (label === "json") return new jsonWorkerModule.default();

        if (label === "css" || label === "scss" || label === "less") {
          return new cssWorkerModule.default();
        }

        if (label === "html" || label === "handlebars" || label === "razor") {
          return new htmlWorkerModule.default();
        }

        if (label === "typescript" || label === "javascript") {
          return new tsWorkerModule.default();
        }

        return new editorWorkerModule.default();
      },
    };

    monacoApi.editor.defineTheme("builderDarkPlus", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "", foreground: "D4D4D4", background: "1E1E1E" },

        { token: "comment", foreground: "6A9955", fontStyle: "italic" },
        { token: "comment.html", foreground: "6A9955", fontStyle: "italic" },
        { token: "comment.css", foreground: "6A9955", fontStyle: "italic" },
        { token: "comment.js", foreground: "6A9955", fontStyle: "italic" },

        { token: "keyword", foreground: "C586C0" },
        { token: "keyword.js", foreground: "C586C0" },
        { token: "keyword.ts", foreground: "C586C0" },
        { token: "keyword.css", foreground: "C586C0" },

        { token: "string", foreground: "CE9178" },
        { token: "string.html", foreground: "CE9178" },
        { token: "string.css", foreground: "CE9178" },
        { token: "string.js", foreground: "CE9178" },
        { token: "string.ts", foreground: "CE9178" },

        { token: "number", foreground: "B5CEA8" },
        { token: "number.css", foreground: "B5CEA8" },
        { token: "number.js", foreground: "B5CEA8" },
        { token: "regexp", foreground: "D16969" },

        { token: "tag", foreground: "569CD6" },
        { token: "tag.html", foreground: "569CD6" },
        { token: "metatag", foreground: "569CD6" },
        { token: "delimiter.html", foreground: "808080" },
        { token: "delimiter.xml", foreground: "808080" },

        { token: "attribute.name", foreground: "9CDCFE" },
        { token: "attribute.name.html", foreground: "9CDCFE" },
        { token: "attribute.value", foreground: "CE9178" },
        { token: "attribute.value.html", foreground: "CE9178" },

        { token: "type", foreground: "4EC9B0" },
        { token: "class", foreground: "4EC9B0" },
        { token: "interface", foreground: "4EC9B0" },
        { token: "namespace", foreground: "4EC9B0" },

        { token: "function", foreground: "DCDCAA" },
        { token: "member", foreground: "DCDCAA" },
        { token: "variable", foreground: "9CDCFE" },
        { token: "variable.predefined", foreground: "4FC1FF" },
        { token: "constant", foreground: "4FC1FF" },

        { token: "property", foreground: "9CDCFE" },
        { token: "attribute.name.css", foreground: "9CDCFE" },
        { token: "attribute.value.css", foreground: "CE9178" },
        { token: "tag.css", foreground: "D7BA7D" },
        { token: "key", foreground: "9CDCFE" },
        { token: "value", foreground: "CE9178" },

        { token: "delimiter", foreground: "808080" },
        { token: "delimiter.bracket", foreground: "D4D4D4" },
        { token: "operator", foreground: "D4D4D4" },
      ],
      colors: {
        "editor.background": "#1E1E1E",
        "editor.foreground": "#D4D4D4",

        "editorLineNumber.foreground": "#858585",
        "editorLineNumber.activeForeground": "#C6C6C6",

        "editorCursor.foreground": "#FFFFFF",
        "editor.selectionBackground": "#264F78",
        "editor.inactiveSelectionBackground": "#3A3D41",

        "editor.lineHighlightBackground": "#2A2D2E",
        "editor.lineHighlightBorder": "#00000000",

        "editorGutter.background": "#1E1E1E",
        "editorIndentGuide.background1": "#404040",
        "editorIndentGuide.activeBackground1": "#707070",

        "editorBracketMatch.background": "#0064001A",
        "editorBracketMatch.border": "#888888",

        "editorWidget.background": "#252526",
        "editorWidget.border": "#454545",

        "editorSuggestWidget.background": "#252526",
        "editorSuggestWidget.border": "#454545",
        "editorSuggestWidget.foreground": "#D4D4D4",
        "editorSuggestWidget.selectedBackground": "#04395E",
        "editorSuggestWidget.highlightForeground": "#18A3FF",

        "editorHoverWidget.background": "#252526",
        "editorHoverWidget.border": "#454545",

        "scrollbarSlider.background": "#79797966",
        "scrollbarSlider.hoverBackground": "#646464B3",
        "scrollbarSlider.activeBackground": "#BFBFBF66",

        "minimap.background": "#1E1E1E",
        "minimap.selectionHighlight": "#264F78",
        "minimap.findMatchHighlight": "#D18616",
        "minimap.errorHighlight": "#FF1212",
        "minimap.warningHighlight": "#CCA700",
      },
      semanticHighlighting: false,
    });

    const tsLanguage = monacoApi.languages?.typescript;

    if (
      tsLanguage?.javascriptDefaults &&
      tsLanguage?.typescriptDefaults &&
      tsLanguage?.JsxEmit &&
      tsLanguage?.ScriptTarget &&
      tsLanguage?.ModuleKind &&
      tsLanguage?.ModuleResolutionKind
    ) {
      tsLanguage.javascriptDefaults.setCompilerOptions({
        allowNonTsExtensions: true,
        allowJs: true,
        checkJs: false,
        jsx: tsLanguage.JsxEmit.React,
        target: tsLanguage.ScriptTarget.ES2020,
        module: tsLanguage.ModuleKind.ESNext,
        moduleResolution: tsLanguage.ModuleResolutionKind.NodeJs,
      });

      tsLanguage.typescriptDefaults.setCompilerOptions({
        allowNonTsExtensions: true,
        jsx: tsLanguage.JsxEmit.React,
        target: tsLanguage.ScriptTarget.ES2020,
        module: tsLanguage.ModuleKind.ESNext,
        moduleResolution: tsLanguage.ModuleResolutionKind.NodeJs,
      });
    }

    editorHostEl.innerHTML = "";

    monacoEditor = monacoApi.editor.create(editorHostEl, {
      value: activeEditorValue,
      language: activeEditorLanguage,
      theme: "builderDarkPlus",
      readOnly: activeEditorReadOnly,

      automaticLayout: true,
      fontSize: 14,
      lineHeight: 22,
      fontFamily:
        "Cascadia Code, JetBrains Mono, Fira Code, Consolas, Menlo, Monaco, monospace",
      fontLigatures: true,

      tabSize: 2,
      insertSpaces: true,
      detectIndentation: true,

      minimap: {
        enabled: true,
        renderCharacters: false,
        scale: 0.85,
        showSlider: "mouseover",
      },

      scrollbar: {
        vertical: "visible",
        horizontal: "visible",
        useShadows: true,
        verticalScrollbarSize: 12,
        horizontalScrollbarSize: 12,
      },

      wordWrap: "on",
      wrappingIndent: "same",
      scrollBeyondLastLine: false,
      smoothScrolling: true,

      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",

      bracketPairColorization: {
        enabled: true,
      },

      guides: {
        indentation: true,
        bracketPairs: true,
        highlightActiveIndentation: true,
      },

      renderWhitespace: "selection",
      renderLineHighlight: "all",
      roundedSelection: true,

      folding: true,
      foldingHighlight: true,
      showFoldingControls: "mouseover",

      quickSuggestions: {
        other: true,
        comments: false,
        strings: true,
      },
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: "on",
      tabCompletion: "on",

      formatOnPaste: true,
      formatOnType: true,

      colorDecorators: true,
      links: true,

      glyphMargin: false,
      lineNumbers: "on",
      lineNumbersMinChars: 4,

      stickyScroll: {
        enabled: false,
      },
    });

    monacoEditor.onDidChangeModelContent(() => {
      activeEditorValue = monacoEditor ? monacoEditor.getValue() : "";
      renderPreview();
    });

    setEditorContent(
      activeEditorValue,
      activeEditorLanguage,
      activeEditorPath,
      activeEditorReadOnly
    );
  } catch (error) {
    console.error("Monaco Editor failed to load. Highlight fallback editor is active.", error);
    setStatus("Monaco failed to load. Highlight fallback editor is active.", "bad");
  }
}

function setEditorContent(value, language, modelPath, readOnly) {
  activeEditorValue = String(value || "");
  activeEditorLanguage = language || "plaintext";
  activeEditorPath = modelPath || "empty.txt";
  activeEditorReadOnly = Boolean(readOnly);

  if (monacoApi && monacoEditor) {
    const uri = monacoApi.Uri.parse(
      `inmemory://dynamic-page-builder/${encodeURIComponent(activeEditorPath)}`
    );

    let model = monacoApi.editor.getModel(uri);

    if (!model) {
      model = monacoApi.editor.createModel(activeEditorValue, activeEditorLanguage, uri);
    } else {
      monacoApi.editor.setModelLanguage(model, activeEditorLanguage);

      if (model.getValue() !== activeEditorValue) {
        model.setValue(activeEditorValue);
      }
    }

    monacoEditor.setModel(model);
    monacoApi.editor.setModelLanguage(model, activeEditorLanguage);
    monacoApi.editor.setTheme("builderDarkPlus");
    monacoEditor.updateOptions({ theme: "builderDarkPlus", readOnly: activeEditorReadOnly });
    return;
  }

  if (fallbackTextarea) {
    fallbackTextarea.value = activeEditorValue;
    fallbackTextarea.disabled = activeEditorReadOnly;
    updateFallbackHighlight();
  }
}

function getEditorValue() {
  if (monacoEditor) return monacoEditor.getValue();
  if (fallbackTextarea) return fallbackTextarea.value;
  return activeEditorValue;
}

function setStatus(message, type = "") {
  if (!statusEl) return;

  if (!message) {
    statusEl.innerHTML = "";
    return;
  }

  if (type === "ok") {
    statusEl.innerHTML = `<span class="ok">${escapeHtml(message)}</span>`;
    return;
  }

  if (type === "bad") {
    statusEl.innerHTML = `<span class="bad">${escapeHtml(message)}</span>`;
    return;
  }

  statusEl.textContent = message;
}

function isPathInsideProject(nodePath) {
  if (!selectedProjectRoot || !nodePath) return false;
  return nodePath === selectedProjectRoot || nodePath.startsWith(`${selectedProjectRoot}/`);
}

function getProjectById(projectId) {
  return cachedProjects.find((project) => project.id === projectId);
}

function getSelectedProject() {
  return getProjectById(selectedProjectId) || null;
}

function getNodeByPath(nodePath) {
  return cachedNodes.find((node) => node.path === nodePath);
}

function getVisibleNodes() {
  if (!selectedProjectRoot) return [];
  return cachedNodes.filter((node) => isPathInsideProject(node.path));
}

function getChildren(parentPath) {
  return getVisibleNodes().filter((node) => node.parentPath === parentPath);
}

function sortChildren(children) {
  return [...children].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });
}

function expandAncestors(nodePath) {
  const parts = String(nodePath || "").split("/").filter(Boolean);
  let current = "";

  for (const part of parts.slice(0, -1)) {
    current = current ? `${current}/${part}` : part;
    collapsedFolders.delete(current);
  }
}

function getActionTarget() {
  if (selectedFilePath) {
    return getNodeByPath(selectedFilePath) || null;
  }

  if (selectedFolderPath && selectedFolderPath !== selectedProjectRoot) {
    return getNodeByPath(selectedFolderPath) || null;
  }

  return null;
}

function updateActionButtons() {
  const hasProject = Boolean(selectedProjectRoot);
  const actionTarget = getActionTarget();

  if (newFileBtn) newFileBtn.disabled = !hasProject;
  if (newFolderBtn) newFolderBtn.disabled = !hasProject;
  if (renameBtn) renameBtn.disabled = !actionTarget;
  if (deleteBtn) deleteBtn.disabled = !actionTarget;
  if (renameProjectBtn) renameProjectBtn.disabled = !hasProject;
  if (deleteProjectBtn) deleteProjectBtn.disabled = !hasProject;

  if (selectedProjectTextEl) {
    const project = getProjectById(selectedProjectId);

    selectedProjectTextEl.innerHTML = project
      ? `${escapeHtml(project.name)} (${escapeHtml(project.rootPath)}) • ${escapeHtml(
          getProjectTypeLabel(project.type)
        )}`
      : "No project selected";
  }

  if (selectedFolderTextEl) {
    selectedFolderTextEl.textContent = selectedFolderPath || selectedProjectRoot || "Root";
  }
}

function renderProjectsList() {
  if (!projectsListEl) return;

  if (!cachedProjects.length) {
    projectsListEl.innerHTML = '<div class="empty-text">No projects yet.</div>';
    return;
  }

  const selectedProject =
    cachedProjects.find((project) => project.id === selectedProjectId) || cachedProjects[0];

  const selectedTypeClass = getProjectTypeClass(selectedProject.type);
  const selectedProjectIconText = getProjectIconText(selectedProject.type);

  const projectOptions = cachedProjects
    .map((project) => {
      const activeClass = project.id === selectedProjectId ? "active" : "";
      const typeClass = getProjectTypeClass(project.type);
      const projectIconText = getProjectIconText(project.type);

      return `
        <button
          class="project-item ${activeClass}"
          type="button"
          data-project-id="${escapeAttribute(project.id)}"
        >
          <div class="project-main-row">
            <div class="project-name-wrap">
              <span class="project-icon ${typeClass}" aria-hidden="true">${escapeHtml(projectIconText)}</span>
              <span class="project-name">${escapeHtml(project.name)}</span>
            </div>
            <span class="type-pill ${typeClass}">${escapeHtml(getProjectTypeLabel(project.type))}</span>
          </div>
          <span class="project-meta">${escapeHtml(project.rootPath)}</span>
        </button>
      `;
    })
    .join("");

  projectsListEl.innerHTML = `
    <div class="project-dropdown" data-project-dropdown>
      <button
        class="project-picker-trigger"
        type="button"
        data-project-dropdown-toggle
        aria-label="Select project"
      >
        <span class="project-picker-trigger-main">
          <span class="project-icon ${selectedTypeClass}" aria-hidden="true">${escapeHtml(selectedProjectIconText)}</span>
          <span class="project-picker-text">
            <span class="project-picker-name">${escapeHtml(selectedProject.name)}</span>
            <span class="project-picker-meta">${escapeHtml(selectedProject.rootPath)} • ${escapeHtml(getProjectTypeLabel(selectedProject.type))}</span>
          </span>
        </span>
        <span class="project-picker-arrow" aria-hidden="true">▾</span>
      </button>

      <div class="project-menu" data-project-menu>
        ${projectOptions}
      </div>
    </div>
  `;
}

function getDefaultFolderNameForCurrentContext() {
  const baseFolder = selectedFolderPath || selectedProjectRoot;
  const existingNames = new Set(
    cachedNodes
      .filter((node) => node.kind === "folder" && node.parentPath === baseFolder)
      .map((node) => String(node.name || "").toLowerCase())
  );

  const candidates = ["new-folder", "components", "pages", "assets", "styles", "scripts"];
  const availableCandidate = candidates.find((name) => !existingNames.has(name.toLowerCase()));

  if (availableCandidate) return availableCandidate;

  let index = 2;
  while (existingNames.has(`new-folder-${index}`)) {
    index += 1;
  }

  return `new-folder-${index}`;
}

function resetInlineCreateState() {
  inlineCreateMode = "";
  inlineCreateParentPath = "";
  inlineCreateValue = "";
  inlineCreateError = "";
  isInlineCreating = false;
}

function focusInlineCreateInput() {
  if (!inlineCreateMode || !nodesTreeEl) return;

  requestAnimationFrame(() => {
    const input = nodesTreeEl.querySelector('[data-inline-create-input="true"]');

    if (input instanceof HTMLInputElement) {
      input.focus();
      input.select();
    }
  });
}

function resetInlineRenameState() {
  inlineRenamePath = "";
  inlineRenameValue = "";
  inlineRenameError = "";
  isInlineRenaming = false;
}

function focusInlineRenameInput() {
  if (!inlineRenamePath || !nodesTreeEl) return;

  requestAnimationFrame(() => {
    const input = nodesTreeEl.querySelector('[data-inline-rename-input="true"]');

    if (input instanceof HTMLInputElement) {
      input.focus();
      input.select();
    }
  });
}

function renderInlineRenameRow(node, depth = 0) {
  if (!node || inlineRenamePath !== node.path) return "";

  const isFolder = node.kind === "folder";
  const renameValue = inlineRenameValue || node.name || "";
  const helperText = isFolder
    ? "Enter renames folder • Esc cancels"
    : "Keep the extension when renaming files • Enter renames file";

  return `
    <div class="inline-create-wrap" data-inline-rename="true" data-inline-rename-path="${escapeAttribute(node.path)}">
      <div class="inline-create-row inline-rename-row" style="padding-left:${10 + depth * 16}px;">
        <span class="tree-arrow"></span>
        ${getNodeIconMarkup(node)}
        <input
          class="inline-create-input inline-rename-input"
          data-inline-rename-input="true"
          value="${escapeAttribute(renameValue)}"
          autocomplete="off"
          spellcheck="false"
          aria-label="Rename ${isFolder ? "folder" : "file"}"
        />
      </div>
      <div class="inline-create-helper">
        <span>
          <span class="inline-create-kbd">Enter</span> rename
          <span class="inline-create-kbd">Esc</span> cancel
        </span>
        <span class="${inlineRenameError ? "inline-create-error" : ""}">
          ${escapeHtml(inlineRenameError || helperText)}
        </span>
      </div>
    </div>
  `;
}

function renderInlineCreateRow(parentPath, depth = 0) {
  if (!inlineCreateMode || inlineCreateParentPath !== parentPath) return "";

  const isFolder = inlineCreateMode === "folder";
  const fileName = inlineCreateValue || (isFolder ? "new-folder" : getDefaultFileNameForCurrentContext());
  const tempNode = isFolder
    ? { kind: "folder", name: fileName }
    : { kind: "file", name: fileName, fileType: inferFileTypeFromName(fileName, "html") };

  const helperText = isFolder
    // ? "Enter creates folder • Esc cancels"
    // : "Extension decides template automatically • Enter creates file";

  return `
    <div class="inline-create-wrap" data-inline-create="${escapeAttribute(inlineCreateMode)}">
      <div class="inline-create-row" style="padding-left:${10 + depth * 16}px;">
        <span class="tree-arrow"></span>
        ${getNodeIconMarkup(tempNode)}
        <input
          class="inline-create-input"
          data-inline-create-input="true"
          data-inline-create-mode="${escapeAttribute(inlineCreateMode)}"
          value="${escapeAttribute(fileName)}"
          autocomplete="off"
          spellcheck="false"
          aria-label="${isFolder ? "New folder name" : "New file name"}"
        />
      </div>
      <div class="inline-create-helper">
        
        <span class="${inlineCreateError ? "inline-create-error" : ""}">
          ${escapeHtml(inlineCreateError || helperText)}
        </span>
      </div>
    </div>
  `;
}

function renderTree(parentPath, depth = 0) {
  const children = sortChildren(getChildren(parentPath));
  const inlineRow = renderInlineCreateRow(parentPath, depth);

  return inlineRow + children
    .map((node) => {
      if (inlineRenamePath === node.path) {
        return renderInlineRenameRow(node, depth);
      }

      if (node.kind === "folder") {
        const isCollapsed = collapsedFolders.has(node.path);
        const folderActiveClass =
          node.path === selectedFolderPath && !selectedFilePath ? "folder-active" : "";

        return `
          <div class="tree-node">
            <button
              class="tree-row ${folderActiveClass}"
              type="button"
              data-folder-path="${escapeAttribute(node.path)}"
              style="padding-left:${10 + depth * 16}px;"
            >
              <span class="tree-arrow">${isCollapsed ? "▸" : "▾"}</span>
              ${getNodeIconMarkup(node)}
              <span class="tree-label-wrap">
                <span class="tree-label">${escapeHtml(node.name)}</span>
                <span class="tree-meta">folder</span>
              </span>
            </button>
            ${
              isCollapsed
                ? ""
                : `<div class="tree-children">${renderTree(node.path, depth + 1)}</div>`
            }
          </div>
        `;
      }

      const fileActiveClass = node.path === selectedFilePath ? "file-active" : "";
      const fileTypeLabel = getFileTypeLabel(node.name, node.fileType);

      return `
        <button
          class="tree-row ${fileActiveClass}"
          type="button"
          data-file-path="${escapeAttribute(node.path)}"
          style="padding-left:${10 + depth * 16}px;"
        >
          <span class="tree-arrow"></span>
          ${getNodeIconMarkup(node)}
          <span class="tree-label-wrap">
            <span class="tree-label">${escapeHtml(node.name)}</span>
            <span class="tree-meta">${escapeHtml(fileTypeLabel)}</span>
          </span>
        </button>
      `;
    })
    .join("");
}

function renderExplorer() {
  if (!nodesTreeEl) return;

  updateActionButtons();

  if (!selectedProjectRoot) {
    nodesTreeEl.innerHTML = '<div class="empty-text">Create or select a project first.</div>';
    return;
  }

  const visibleNodes = getVisibleNodes();
  const projectChildren = visibleNodes.filter((node) => node.parentPath === selectedProjectRoot);

  const hasInlineCreateAtRoot = Boolean(
    inlineCreateMode && inlineCreateParentPath === selectedProjectRoot
  );

  if (!projectChildren.length && !hasInlineCreateAtRoot) {
    nodesTreeEl.innerHTML = '<div class="empty-text">No files or folders in this project yet.</div>';
    return;
  }

  nodesTreeEl.innerHTML = renderTree(selectedProjectRoot, 0);
  focusInlineCreateInput();
  focusInlineRenameInput();
}

function clearEditor() {
  selectedFilePath = "";

  if (!selectedPathInputEl || !saveBtn || !fileTypeBadgeEl || !languageBadgeEl || !editorModeEl) {
    return;
  }

  selectedPathInputEl.value = selectedFolderPath || selectedProjectRoot || "";
  saveBtn.disabled = true;

  fileTypeBadgeEl.style.display = "none";
  fileTypeBadgeEl.textContent = "";

  languageBadgeEl.style.display = "none";
  languageBadgeEl.textContent = "";

  if (editorEmptyEl) {
    editorEmptyEl.style.display = "grid";
  }

  setEditorContent("", "plaintext", "empty.txt", true);

  if (selectedFolderPath) {
    editorModeEl.innerHTML = `Folder selected: <span class="badge">${escapeHtml(
      selectedFolderPath
    )}</span>`;
  } else if (selectedProjectRoot) {
    editorModeEl.innerHTML = `Project selected: <span class="badge">${escapeHtml(
      selectedProjectRoot
    )}</span>`;
  } else {
    editorModeEl.textContent = "Select a project and then choose a file to edit.";
  }
}

function openFile(node) {
  resetInlineCreateState();

  if (
    !selectedPathInputEl ||
    !saveBtn ||
    !fileTypeBadgeEl ||
    !languageBadgeEl ||
    !editorModeEl ||
    !statusEl
  ) {
    return;
  }

  selectedFilePath = node.path;
  selectedFolderPath = node.parentPath || selectedProjectRoot;

  expandAncestors(node.path);

  const fileTypeLabel = getFileTypeLabel(node.name, node.fileType);
  const language = getMonacoLanguage(node.name, node.fileType);

  selectedPathInputEl.value = node.path;
  saveBtn.disabled = false;

  fileTypeBadgeEl.textContent = fileTypeLabel;
  fileTypeBadgeEl.style.display = "inline-flex";

  languageBadgeEl.textContent = language;
  languageBadgeEl.style.display = "inline-flex";

  if (editorEmptyEl) {
    editorEmptyEl.style.display = "none";
  }

  setEditorContent(node.content || "", language, node.path, false);

  editorModeEl.innerHTML = `Editing <span class="badge">${escapeHtml(node.path)}</span>`;
  statusEl.textContent = "";

  renderExplorer();
  renderPreview();

  requestAnimationFrame(() => {
    if (monacoEditor) {
      monacoEditor.layout();
      monacoEditor.focus();
    }

    if (fallbackTextarea) {
      fallbackTextarea.focus();
    }
  });
}

function selectFolder(folderPath) {
  resetInlineCreateState();
  selectedFolderPath = folderPath;
  selectedFilePath = "";

  if (folderPath && folderPath !== selectedProjectRoot) {
    if (collapsedFolders.has(folderPath)) {
      collapsedFolders.delete(folderPath);
    } else {
      collapsedFolders.add(folderPath);
    }
  }

  clearEditor();
  renderExplorer();
  renderPreview();
}

function selectProject(project) {
  resetInlineCreateState();
  selectedProjectId = project.id;
  selectedProjectRoot = project.rootPath;
  selectedFolderPath = project.rootPath;
  selectedFilePath = "";

  setStatus("");

  collapsedFolders.clear();
  collapsedFolders.delete(project.rootPath);

  renderProjectsList();
  clearEditor();
  renderExplorer();
  renderPreview();
}

function getWorkingContent(node) {
  if (!node) return "";

  if (selectedFilePath && node.path === selectedFilePath) {
    return getEditorValue();
  }

  return String(node.content || "");
}

function isFrameworkProject(project) {
  return project?.type === "react-vite" || project?.type === "vue-vite";
}

function getCurrentPreviewFolderPath() {
  const selectedProject = getSelectedProject();

  if (isFrameworkProject(selectedProject)) {
    return selectedProjectRoot;
  }

  if (selectedFilePath) {
    const fileNode = getNodeByPath(selectedFilePath);
    return fileNode?.parentPath || selectedProjectRoot || "";
  }

  return selectedFolderPath || selectedProjectRoot || "";
}

function getFolderChain(projectRoot, folderPath) {
  if (!projectRoot || !folderPath) return [];

  if (!(folderPath === projectRoot || folderPath.startsWith(`${projectRoot}/`))) {
    return [];
  }

  const rootParts = projectRoot.split("/").filter(Boolean);
  const folderParts = folderPath.split("/").filter(Boolean);

  const chain = [];

  for (let i = rootParts.length; i <= folderParts.length; i += 1) {
    chain.push(folderParts.slice(0, i).join("/"));
  }

  return chain;
}

function collectAssetNodesForPreview(previewFolderPath) {
  const selectedProject = getSelectedProject();

  if (isFrameworkProject(selectedProject)) {
    const cssNodes = cachedNodes.filter((node) => {
      if (node.kind !== "file") return false;
      if (!isPathInsideProject(node.path)) return false;
      return detectFileType(node.name, node.fileType) === "css";
    });

    return {
      cssNodes,
      jsNodes: [],
    };
  }

  const chain = getFolderChain(selectedProjectRoot, previewFolderPath);
  const seen = new Set();
  const cssNodes = [];
  const jsNodes = [];

  for (const folderPath of chain) {
    const folderFiles = cachedNodes.filter(
      (node) => node.kind === "file" && node.parentPath === folderPath
    );

    const candidates =
      folderPath === previewFolderPath
        ? folderFiles.filter((node) => {
            const type = detectFileType(node.name, node.fileType);
            return type === "css" || type === "js";
          })
        : folderFiles.filter((node) => node.name === "style.css" || node.name === "script.js");

    for (const node of candidates) {
      if (seen.has(node.path)) continue;

      seen.add(node.path);

      const type = detectFileType(node.name, node.fileType);

      if (type === "css") cssNodes.push(node);
      if (type === "js") jsNodes.push(node);
    }
  }

  return { cssNodes, jsNodes };
}

function getPublishedUrl() {
  if (!selectedProjectRoot) return "";

  const selectedProject = getSelectedProject();

  if (isFrameworkProject(selectedProject)) {
    return `/site/${selectedProjectRoot}`;
  }

  if (selectedFilePath) {
    const node = getNodeByPath(selectedFilePath);

    if (node && detectFileType(node.name, node.fileType) === "html") {
      if (node.name === "index.html") {
        return `/site/${node.parentPath || selectedProjectRoot}`;
      }

      return `/site/${node.path.replace(/\.html$/i, "")}`;
    }

    const fallbackFolder = node?.parentPath || selectedFolderPath || selectedProjectRoot;
    return fallbackFolder ? `/site/${fallbackFolder}` : "";
  }

  const folderPath = selectedFolderPath || selectedProjectRoot;
  return folderPath ? `/site/${folderPath}` : "";
}

function updatePublishedLink() {
  if (!publishedUrlRowEl || !publishedUrlLinkEl) return;

  const url = getPublishedUrl();

  if (!url) {
    publishedUrlRowEl.style.display = "none";
    publishedUrlLinkEl.href = "#";
    publishedUrlLinkEl.textContent = "";
    return;
  }

  publishedUrlRowEl.style.display = "block";
  publishedUrlLinkEl.href = url;
  publishedUrlLinkEl.textContent = url;
}

function findFileInProject(fileNames) {
  const normalizedNames = fileNames.map((name) => String(name).toLowerCase());

  return (
    cachedNodes.find((node) => {
      if (node.kind !== "file") return false;
      if (!isPathInsideProject(node.path)) return false;
      return normalizedNames.includes(String(node.name || "").toLowerCase());
    }) || null
  );
}

function findProjectFileBySuffix(suffixes) {
  const normalizedSuffixes = suffixes.map((suffix) => String(suffix || "").toLowerCase());

  return (
    cachedNodes.find((node) => {
      if (node.kind !== "file") return false;
      if (!isPathInsideProject(node.path)) return false;

      const nodePath = String(node.path || "").toLowerCase();
      const relativePath = nodePath.startsWith(`${selectedProjectRoot.toLowerCase()}/`)
        ? nodePath.slice(selectedProjectRoot.length + 1)
        : nodePath;

      return normalizedSuffixes.some((suffix) => {
        const safeSuffix = suffix.replace(/^\/+/, "");
        return relativePath === safeSuffix || relativePath.endsWith(`/${safeSuffix}`);
      });
    }) || null
  );
}

function getProjectFilesByType(types) {
  return cachedNodes
    .filter((node) => {
      if (node.kind !== "file") return false;
      if (!isPathInsideProject(node.path)) return false;
      return types.includes(detectFileType(node.name, node.fileType));
    })
    .sort((a, b) => String(a.path || "").localeCompare(String(b.path || "")));
}

function getProjectCssContent() {
  return getProjectFilesByType(["css"])
    .map((node) => `/* ${node.path} */\n${getWorkingContent(node)}`)
    .join("\n\n");
}

function getFrameworkPreviewBaseHtml(mountId) {
  const rootHtmlNode = getNodeByPath(`${selectedProjectRoot}/index.html`);
  const rootHtmlContent = rootHtmlNode ? getWorkingContent(rootHtmlNode) : "";

  if (rootHtmlContent.trim()) {
    return ensureMountElement(removeHtmlScripts(rootHtmlContent), mountId);
  }

  return `
<!DOCTYPE html>
<html lang="en">
  <head></head>
  <body>
    <div id="${mountId}"></div>
  </body>
</html>`;
}

function ensureMountElement(html, mountId) {
  const source = String(html || "");
  const mountRegex = new RegExp(`id=(['"])${mountId}\\1`, "i");

  if (mountRegex.test(source)) return source;

  return injectBeforeBodyEnd(source, `<div id="${mountId}"></div>`);
}

function getPreviewRuntimeStyles(cssContent) {
  return `
<style>
${safeStyleContent(cssContent)}

#builder-preview-runtime-error {
  position: fixed;
  inset: auto 18px 18px 18px;
  z-index: 999999;
  padding: 14px 16px;
  border: 1px solid rgba(244, 135, 113, 0.45);
  border-radius: 12px;
  background: rgba(30, 30, 30, 0.94);
  color: #f8d7d0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.55;
  box-shadow: 0 16px 45px rgba(0, 0, 0, 0.28);
  white-space: pre-wrap;
}

.builder-preview-watermark {
  position: fixed;
  right: 14px;
  bottom: 14px;
  z-index: 20;
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.66);
  color: white;
  font-family: system-ui, Arial, sans-serif;
  font-size: 11px;
  font-weight: 700;
  backdrop-filter: blur(10px);
  pointer-events: none;
  opacity: 0.58;
}
</style>`;
}

function getPreviewRuntimeErrorScript(label) {
  return `
<script>
(function () {
  var label = ${JSON.stringify(label)};

  function showError(message) {
    var existing = document.getElementById("builder-preview-runtime-error");
    if (!existing) {
      existing = document.createElement("div");
      existing.id = "builder-preview-runtime-error";
      document.body.appendChild(existing);
    }

    existing.textContent = label + " preview error:\n" + String(message || "Unknown error");
  }

  window.__builderPreviewShowError = showError;

  window.addEventListener("error", function (event) {
    showError(event.message || event.error || "Runtime error");
  });

  window.addEventListener("unhandledrejection", function (event) {
    showError(event.reason && event.reason.message ? event.reason.message : event.reason || "Unhandled promise rejection");
  });
})();
<\/script>`;
}

function getPreviewWatermark(label) {
  return `<div class="builder-preview-watermark">${escapeHtml(label)} Preview</div>`;
}

function stripModuleImportsAndExports(source) {
  return String(source || "")
    .replace(/^\s*import\s+[^;]+;\s*$/gm, "")
    .replace(/^\s*import\s+["'][^"']+["'];\s*$/gm, "")
    .replace(/export\s+default\s+function\s+([A-Za-z_$][\w$]*)/g, "function $1")
    .replace(/export\s+default\s+class\s+([A-Za-z_$][\w$]*)/g, "class $1")
    .replace(/^\s*export\s+default\s+([A-Za-z_$][\w$]*);?\s*$/gm, "")
    .replace(/^\s*export\s+\{[^}]*\};?\s*$/gm, "")
    .replace(/\bexport\s+(?=(const|let|var|function|class)\b)/g, "");
}

function stripMainCssImports(source) {
  return String(source || "").replace(/^\s*import\s+["'][^"']+\.(css|scss|less)["'];\s*$/gm, "");
}

function getReactAppNode() {
  return findProjectFileBySuffix([
    "src/App.jsx",
    "src/App.tsx",
    "src/app.jsx",
    "src/app.tsx",
    "App.jsx",
    "App.tsx",
    "app.jsx",
    "app.tsx",
  ]);
}

function getReactEntryNode() {
  return findProjectFileBySuffix([
    "src/main.jsx",
    "src/main.tsx",
    "src/main.js",
    "src/main.ts",
    "src/index.jsx",
    "src/index.tsx",
    "src/index.js",
    "src/index.ts",
    "main.jsx",
    "main.js",
    "index.jsx",
    "index.js",
  ]);
}

function getReactPreviewModuleNodes() {
  return getProjectFilesByType(["js", "jsx", "ts", "tsx"]).filter((node) => {
    const normalizedName = String(node.name || "").toLowerCase();
    const normalizedPath = String(node.path || "").toLowerCase();

    if (normalizedName.includes("config")) return false;
    if (normalizedPath.endsWith("vite.config.js")) return false;
    if (normalizedPath.endsWith("vite.config.ts")) return false;

    return true;
  });
}

function getNodeDirectoryPath(nodePath) {
  const value = String(nodePath || "");
  const lastSlashIndex = value.lastIndexOf("/");
  return lastSlashIndex >= 0 ? value.slice(0, lastSlashIndex) : "";
}

function normalizeBuilderPath(pathValue) {
  const parts = String(pathValue || "")
    .split("/")
    .filter(Boolean);

  const stack = [];

  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") {
      stack.pop();
      continue;
    }

    stack.push(part);
  }

  return stack.join("/");
}

function getReactModuleId(node) {
  return normalizeBuilderPath(node?.path || "");
}

function isRelativeImportSpecifier(specifier) {
  return String(specifier || "").startsWith("./") || String(specifier || "").startsWith("../");
}

function isStyleImportSpecifier(specifier) {
  return /\.(css|scss|less)$/i.test(String(specifier || ""));
}

function resolveReactImportNode(fromNode, specifier) {
  const rawSpecifier = String(specifier || "").trim();

  if (!rawSpecifier) return null;
  if (isStyleImportSpecifier(rawSpecifier)) return null;

  let basePath = "";

  if (isRelativeImportSpecifier(rawSpecifier)) {
    basePath = normalizeBuilderPath(`${getNodeDirectoryPath(fromNode.path)}/${rawSpecifier}`);
  } else if (rawSpecifier.startsWith("/src/")) {
    basePath = normalizeBuilderPath(`${selectedProjectRoot}${rawSpecifier}`);
  } else if (rawSpecifier.startsWith("src/")) {
    basePath = normalizeBuilderPath(`${selectedProjectRoot}/${rawSpecifier}`);
  } else if (rawSpecifier.startsWith("@/")) {
    basePath = normalizeBuilderPath(`${selectedProjectRoot}/src/${rawSpecifier.slice(2)}`);
  } else {
    return null;
  }

  const candidates = [
    basePath,
    `${basePath}.jsx`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.ts`,
    `${basePath}/index.jsx`,
    `${basePath}/index.tsx`,
    `${basePath}/index.js`,
    `${basePath}/index.ts`,
  ];

  return cachedNodes.find((node) => {
    if (node.kind !== "file") return false;
    if (!isPathInsideProject(node.path)) return false;
    return candidates.includes(normalizeBuilderPath(node.path));
  }) || null;
}

function parseNamedImportBindings(namedClause) {
  return String(namedClause || "")
    .replace(/^\{/, "")
    .replace(/\}$/, "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [imported, local] = part.split(/\s+as\s+/i).map((item) => item.trim());
      return {
        imported,
        local: local || imported,
      };
    });
}

function buildReactNamedDestructure(moduleExpression, namedClause) {
  const bindings = parseNamedImportBindings(namedClause);

  if (!bindings.length) return "";

  const destructure = bindings
    .map((binding) => {
      if (binding.imported === binding.local) return binding.imported;
      return `${binding.imported}: ${binding.local}`;
    })
    .join(", ");

  return `const { ${destructure} } = ${moduleExpression};`;
}

function buildReactExternalImportReplacement(importClause, specifier) {
  const clause = String(importClause || "").trim();
  const source = String(specifier || "").trim();

  if (!clause) return "";

  if (source === "react") {
    if (clause.startsWith("{")) {
      return buildReactNamedDestructure("React", clause);
    }

    if (clause.startsWith("* as ")) {
      const namespaceName = clause.replace(/^\*\s+as\s+/i, "").trim();
      return namespaceName && namespaceName !== "React" ? `const ${namespaceName} = React;` : "";
    }

    const defaultAndNamed = clause.match(/^([A-Za-z_$][\w$]*)(\s*,\s*(\{[\s\S]*\}))?$/);

    if (defaultAndNamed) {
      const defaultName = defaultAndNamed[1];
      const namedClause = defaultAndNamed[3] || "";
      const lines = [];

      if (defaultName && defaultName !== "React") {
        lines.push(`const ${defaultName} = React;`);
      }

      if (namedClause) {
        lines.push(buildReactNamedDestructure("React", namedClause));
      }

      return lines.filter(Boolean).join("\n");
    }

    return "";
  }

  if (source === "react-dom" || source === "react-dom/client") {
    if (clause.startsWith("{")) {
      const normalizedClause = clause.replace(/\bcreateRoot\b/g, "createRoot");
      return buildReactNamedDestructure("ReactDOM", normalizedClause);
    }

    if (clause.startsWith("* as ")) {
      const namespaceName = clause.replace(/^\*\s+as\s+/i, "").trim();
      return namespaceName && namespaceName !== "ReactDOM" ? `const ${namespaceName} = ReactDOM;` : "";
    }

    const defaultAndNamed = clause.match(/^([A-Za-z_$][\w$]*)(\s*,\s*(\{[\s\S]*\}))?$/);

    if (defaultAndNamed) {
      const defaultName = defaultAndNamed[1];
      const namedClause = defaultAndNamed[3] || "";
      const lines = [];

      if (defaultName && defaultName !== "ReactDOM") {
        lines.push(`const ${defaultName} = ReactDOM;`);
      }

      if (namedClause) {
        lines.push(buildReactNamedDestructure("ReactDOM", namedClause));
      }

      return lines.filter(Boolean).join("\n");
    }

    return "";
  }

  return `throw new Error(${JSON.stringify(`External package import '${source}' is not available in the browser preview yet.`)});`;
}

function buildReactLocalImportReplacement(importClause, resolvedNode) {
  if (!resolvedNode) return "";

  const clause = String(importClause || "").trim();
  const moduleId = getReactModuleId(resolvedNode);
  const requireExpression = `__builderRequire(${JSON.stringify(moduleId)})`;

  if (!clause) {
    return `${requireExpression};`;
  }

  if (clause.startsWith("{")) {
    return buildReactNamedDestructure(requireExpression, clause);
  }

  if (clause.startsWith("* as ")) {
    const namespaceName = clause.replace(/^\*\s+as\s+/i, "").trim();
    return namespaceName ? `const ${namespaceName} = ${requireExpression};` : "";
  }

  const defaultAndNamed = clause.match(/^([A-Za-z_$][\w$]*)(\s*,\s*(\{[\s\S]*\}))?$/);

  if (!defaultAndNamed) return "";

  const defaultName = defaultAndNamed[1];
  const namedClause = defaultAndNamed[3] || "";
  const lines = [];

  if (defaultName) {
    lines.push(`const ${defaultName} = ${requireExpression}.default;`);
  }

  if (namedClause) {
    lines.push(buildReactNamedDestructure(requireExpression, namedClause));
  }

  return lines.filter(Boolean).join("\n");
}

function transformReactImports(source, fromNode) {
  let output = String(source || "");

  output = output.replace(/^\s*import\s+([\s\S]*?)\s+from\s+["']([^"']+)["'];?\s*$/gm, (_match, importClause, specifier) => {
    const normalizedSpecifier = String(specifier || "").trim();

    if (isStyleImportSpecifier(normalizedSpecifier)) {
      return `/* CSS import ${normalizedSpecifier} handled by preview stylesheet collector */`;
    }

    if (isRelativeImportSpecifier(normalizedSpecifier) || normalizedSpecifier.startsWith("/") || normalizedSpecifier.startsWith("src/") || normalizedSpecifier.startsWith("@/")) {
      const resolvedNode = resolveReactImportNode(fromNode, normalizedSpecifier);

      if (!resolvedNode) {
        return `throw new Error(${JSON.stringify(`Could not resolve local import '${normalizedSpecifier}' from '${fromNode.path}'.`)});`;
      }

      return buildReactLocalImportReplacement(importClause, resolvedNode);
    }

    return buildReactExternalImportReplacement(importClause, normalizedSpecifier);
  });

  output = output.replace(/^\s*import\s+["']([^"']+)["'];?\s*$/gm, (_match, specifier) => {
    const normalizedSpecifier = String(specifier || "").trim();

    if (isStyleImportSpecifier(normalizedSpecifier)) {
      return `/* CSS import ${normalizedSpecifier} handled by preview stylesheet collector */`;
    }

    if (isRelativeImportSpecifier(normalizedSpecifier) || normalizedSpecifier.startsWith("/") || normalizedSpecifier.startsWith("src/") || normalizedSpecifier.startsWith("@/")) {
      const resolvedNode = resolveReactImportNode(fromNode, normalizedSpecifier);
      return resolvedNode ? `__builderRequire(${JSON.stringify(getReactModuleId(resolvedNode))});` : "";
    }

    return `/* External side-effect import ${normalizedSpecifier} ignored by preview */`;
  });

  return output;
}

function transformReactExports(source) {
  let output = String(source || "");
  const exportAssignments = [];

  output = output.replace(/export\s+default\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g, (_match, name) => {
    exportAssignments.push(`exports.default = ${name};`);
    return `function ${name}(`;
  });

  output = output.replace(/export\s+default\s+class\s+([A-Za-z_$][\w$]*)\s*/g, (_match, name) => {
    exportAssignments.push(`exports.default = ${name};`);
    return `class ${name} `;
  });

  output = output.replace(/export\s+default\s+function\s*\(/g, () => {
    exportAssignments.push("exports.default = __builderDefaultExport;");
    return "const __builderDefaultExport = function (";
  });

  output = output.replace(/export\s+default\s+class\s*/g, () => {
    exportAssignments.push("exports.default = __builderDefaultExport;");
    return "const __builderDefaultExport = class ";
  });

  output = output.replace(/^\s*export\s+default\s+([^;]+);?\s*$/gm, (_match, expression) => {
    return `exports.default = ${expression.trim()};`;
  });

  output = output.replace(/export\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g, (_match, name) => {
    exportAssignments.push(`exports.${name} = ${name};`);
    return `function ${name}(`;
  });

  output = output.replace(/export\s+const\s+([A-Za-z_$][\w$]*)\s*=/g, (_match, name) => {
    exportAssignments.push(`exports.${name} = ${name};`);
    return `const ${name} =`;
  });

  output = output.replace(/export\s+let\s+([A-Za-z_$][\w$]*)\s*=/g, (_match, name) => {
    exportAssignments.push(`exports.${name} = ${name};`);
    return `let ${name} =`;
  });

  output = output.replace(/export\s+var\s+([A-Za-z_$][\w$]*)\s*=/g, (_match, name) => {
    exportAssignments.push(`exports.${name} = ${name};`);
    return `var ${name} =`;
  });

  output = output.replace(/^\s*export\s+\{([^}]+)\};?\s*$/gm, (_match, exportList) => {
    return String(exportList || "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [local, exported] = part.split(/\s+as\s+/i).map((item) => item.trim());
        return `exports.${exported || local} = ${local};`;
      })
      .join("\n");
  });

  if (exportAssignments.length) {
    output += `\n\n${[...new Set(exportAssignments)].join("\n")}`;
  }

  return output;
}

function transformReactPreviewModuleSource(node) {
  const rawSource = getWorkingContent(node);
  const withoutImports = transformReactImports(rawSource, node);
  return transformReactExports(withoutImports);
}

function getReactSourceBundle() {
  const sourceNodes = getReactPreviewModuleNodes();
  const entryNode = getReactEntryNode();
  const appNode = getReactAppNode();

  const pieces = [];

  pieces.push(`
const __builderFactories = Object.create(null);
const __builderModuleCache = Object.create(null);

function __builderDefine(moduleId, factory) {
  __builderFactories[moduleId] = factory;
}

function __builderRequire(moduleId) {
  if (__builderModuleCache[moduleId]) {
    return __builderModuleCache[moduleId].exports;
  }

  const factory = __builderFactories[moduleId];

  if (!factory) {
    throw new Error("React preview module not found: " + moduleId);
  }

  const module = { exports: {} };
  __builderModuleCache[moduleId] = module;
  factory(module.exports, module);
  return module.exports;
}
`);

  for (const node of sourceNodes) {
    const moduleId = getReactModuleId(node);
    const transformedSource = transformReactPreviewModuleSource(node);

    pieces.push(`
__builderDefine(${JSON.stringify(moduleId)}, function (exports, module) {
const React = window.React;
const ReactDOM = window.ReactDOM;

${transformedSource}
});`);
  }

  const entryModuleId = entryNode ? getReactModuleId(entryNode) : "";
  const appModuleId = appNode ? getReactModuleId(appNode) : "";

  pieces.push(`
const __builderRootElement = document.getElementById("root") || document.getElementById("app");

if (${JSON.stringify(entryModuleId)}) {
  __builderRequire(${JSON.stringify(entryModuleId)});
} else if (${JSON.stringify(appModuleId)} && __builderRootElement) {
  const AppModule = __builderRequire(${JSON.stringify(appModuleId)});
  const App = AppModule.default || AppModule.App;

  if (!App) {
    throw new Error("App component was found, but it does not export a default component.");
  }

  ReactDOM.createRoot(__builderRootElement).render(<App />);
} else {
  throw new Error("React preview needs src/main.jsx or src/App.jsx.");
}

document.documentElement.setAttribute("data-builder-preview-ready", "react");`);

  return pieces.join("\n\n");
}

function buildReactPreviewDocument(project) {
  const mountId = "root";
  const title = project?.name || selectedProjectRoot || "React Preview";
  const cssContent = getProjectCssContent();
  const reactSource = getReactSourceBundle();

  const headContent = `
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
${getPreviewRuntimeStyles(cssContent)}`;

  const runtimeScripts = `
${getPreviewRuntimeErrorScript("React")}
<script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
<script type="text/babel" data-presets="env,react,typescript">
try {
${safeScriptContent(reactSource)}
} catch (error) {
  if (window.__builderPreviewShowError) {
    window.__builderPreviewShowError(error && error.message ? error.message : error);
  } else {
    throw error;
  }
}
<\/script>
${getPreviewWatermark("React")}`;

  return injectBeforeBodyEnd(
    injectIntoHead(getFrameworkPreviewBaseHtml(mountId), headContent),
    runtimeScripts
  );
}

function extractVueBlock(source, blockName) {
  const pattern = new RegExp(`<${blockName}([^>]*)>([\\s\\S]*?)<\\/${blockName}>`, "i");
  const match = String(source || "").match(pattern);

  if (!match) {
    return {
      attrs: "",
      content: "",
    };
  }

  return {
    attrs: match[1] || "",
    content: match[2] || "",
  };
}

function getVueAppNode() {
  return findProjectFileBySuffix([
    "src/App.vue",
    "src/app.vue",
    "App.vue",
    "app.vue",
  ]);
}

function getVueEntryNode() {
  return findProjectFileBySuffix([
    "src/main.js",
    "src/main.ts",
    "src/main.mjs",
    "main.js",
    "main.ts",
  ]);
}

function getVueComponentConfigSource(appNode, templateContent) {
  if (!appNode) {
    return `let __BuilderVueComponent = { template: ${JSON.stringify(templateContent)} };`;
  }

  const appContent = getWorkingContent(appNode);
  const scriptBlock = extractVueBlock(appContent, "script");
  const attrs = String(scriptBlock.attrs || "").toLowerCase();
  const scriptContent = stripModuleImportsAndExports(stripMainCssImports(scriptBlock.content || ""));

  if (attrs.includes("setup")) {
    return `
let __BuilderVueComponent = {
  template: ${JSON.stringify(templateContent)},
  setup() {
    return {};
  }
};`;
  }

  if (scriptContent.trim()) {
    const convertedScript = String(scriptContent).replace(/export\s+default/, "__BuilderVueComponent =");

    return `
let __BuilderVueComponent = { template: ${JSON.stringify(templateContent)} };
${convertedScript}
if (!__BuilderVueComponent.template) {
  __BuilderVueComponent.template = ${JSON.stringify(templateContent)};
}`;
  }

  return `let __BuilderVueComponent = { template: ${JSON.stringify(templateContent)} };`;
}

function getVueStyleContent(appNode) {
  const globalCss = getProjectCssContent();

  if (!appNode) return globalCss;

  const appContent = getWorkingContent(appNode);
  const styleMatches = [...String(appContent).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
  const componentStyles = styleMatches.map((match) => match[1].trim()).join("\n\n");

  return [globalCss, componentStyles].filter(Boolean).join("\n\n");
}

function getVueTemplateContent(appNode) {
  if (!appNode) {
    return `<section style="font-family: system-ui, Arial, sans-serif; padding: 32px;">
  <h1>Vue Preview</h1>
  <p>Create or open <code>src/App.vue</code> to preview your Vue component.</p>
</section>`;
  }

  const templateBlock = extractVueBlock(getWorkingContent(appNode), "template");

  return templateBlock.content.trim() || `<section style="font-family: system-ui, Arial, sans-serif; padding: 32px;">
  <h1>Vue Preview</h1>
  <p>No template block found in <code>${escapeHtml(appNode.path)}</code>.</p>
</section>`;
}

function buildVuePreviewDocument(project) {
  const mountId = "app";
  const title = project?.name || selectedProjectRoot || "Vue Preview";
  const appNode = getVueAppNode();
  const entryNode = getVueEntryNode();
  const templateContent = getVueTemplateContent(appNode);
  const cssContent = getVueStyleContent(appNode);
  const vueComponentConfigSource = getVueComponentConfigSource(appNode, templateContent);
  const entrySource = entryNode ? stripModuleImportsAndExports(stripMainCssImports(getWorkingContent(entryNode))) : "";

  const headContent = `
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
${getPreviewRuntimeStyles(cssContent)}`;

  const runtimeScripts = `
${getPreviewRuntimeErrorScript("Vue")}
<script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"><\/script>
<script>
try {
${safeScriptContent(vueComponentConfigSource)}

const __builderMountElement = document.getElementById("app") || document.getElementById("root");

if (__builderMountElement) {
  Vue.createApp(__BuilderVueComponent).mount(__builderMountElement);
}

${entrySource && !/createApp\s*\(/.test(entrySource) ? `\n/* Original entry file detected: ${entryNode?.path || "main.js"}. The builder uses App.vue directly for stable preview. */\n` : ""}

document.documentElement.setAttribute("data-builder-preview-ready", "vue");
} catch (error) {
  if (window.__builderPreviewShowError) {
    window.__builderPreviewShowError(error && error.message ? error.message : error);
  } else {
    throw error;
  }
}
<\/script>
${getPreviewWatermark("Vue")}`;

  return injectBeforeBodyEnd(
    injectIntoHead(getFrameworkPreviewBaseHtml(mountId), headContent),
    runtimeScripts
  );
}

function removeHtmlScripts(html) {
  return String(html || "").replace(/<script[\s\S]*?<\/script>/gi, "");
}

function injectIntoHead(html, content) {
  const source = String(html || "");

  if (source.match(/<head[^>]*>/i)) {
    return source.replace(/<head[^>]*>/i, (match) => `${match}\n${content}`);
  }

  if (source.match(/<html[^>]*>/i)) {
    return source.replace(/<html[^>]*>/i, (match) => `${match}\n<head>\n${content}\n</head>`);
  }

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    ${content}
  </head>
  <body>
    ${source}
  </body>
</html>`;
}

function injectBeforeBodyEnd(html, content) {
  const source = String(html || "");

  if (source.match(/<\/body>/i)) {
    return source.replace(/<\/body>/i, `${content}\n</body>`);
  }

  return `${source}\n${content}`;
}

function buildFrameworkPreviewDocument(project) {
  if (project?.type === "react-vite") {
    return buildReactPreviewDocument(project);
  }

  if (project?.type === "vue-vite") {
    return buildVuePreviewDocument(project);
  }

  return buildHtmlPreviewDocument();
}

function buildHtmlPreviewDocument() {
  const previewFolderPath = getCurrentPreviewFolderPath();

  const folderFiles = cachedNodes.filter(
    (node) => node.kind === "file" && node.parentPath === previewFolderPath
  );

  const selectedFileNode = selectedFilePath ? getNodeByPath(selectedFilePath) : null;

  let htmlNode = null;

  if (
    selectedFileNode &&
    detectFileType(selectedFileNode.name, selectedFileNode.fileType) === "html"
  ) {
    htmlNode = selectedFileNode;
  } else {
    htmlNode =
      folderFiles.find(
        (node) =>
          detectFileType(node.name, node.fileType) === "html" && node.name === "index.html"
      ) ||
      folderFiles.find((node) => detectFileType(node.name, node.fileType) === "html") ||
      null;
  }

  const { cssNodes, jsNodes } = collectAssetNodesForPreview(previewFolderPath);

  const htmlContent = htmlNode ? getWorkingContent(htmlNode) : "";
  const cssContent = cssNodes.map((node) => getWorkingContent(node)).join("\n\n");
  const jsContent = jsNodes.map((node) => getWorkingContent(node)).join("\n\n");

  const title = previewFolderPath || selectedProjectRoot || "Preview";
  const baseHref = previewFolderPath ? `/site/${previewFolderPath}/` : "/site/";

  if (!htmlContent.trim()) {
    return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      body {
        font-family: system-ui, Arial, sans-serif;
        padding: 24px;
        color: #0f172a;
      }

      .empty {
        padding: 20px;
        border: 1px dashed #cbd5e1;
        border-radius: 12px;
        background: #f8fafc;
        color: #64748b;
      }

      code {
        background: #e2e8f0;
        padding: 2px 6px;
        border-radius: 6px;
      }
    </style>
  </head>
  <body>
    <div class="empty">
      No HTML file found in this folder.<br />
      Create something like <code>index.html</code> inside <code>${escapeHtml(
        previewFolderPath || "root"
      )}</code>.
    </div>
  </body>
</html>`;
  }

  const headAssets = `
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<base href="${escapeHtml(baseHref)}" />
<style>
${safeStyleContent(cssContent)}
</style>`;

  const scriptAsset = `
<script>
${safeScriptContent(jsContent)}
<\/script>`;

  const looksLikeFullDocument = /<html[\s>]/i.test(htmlContent) || /<!doctype/i.test(htmlContent);

  if (looksLikeFullDocument) {
    return injectBeforeBodyEnd(injectIntoHead(htmlContent, headAssets), scriptAsset);
  }

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    ${headAssets}
  </head>
  <body>
    ${htmlContent}
    ${scriptAsset}
  </body>
</html>`;
}

function buildPreviewDocument() {
  const selectedProject = getSelectedProject();

  if (selectedProject?.type === "react-vite") {
    return buildReactPreviewDocument(selectedProject);
  }

  if (selectedProject?.type === "vue-vite") {
    return buildVuePreviewDocument(selectedProject);
  }

  return buildHtmlPreviewDocument();
}

function renderPreview() {
  if (!previewFrame) return;

  previewFrame.srcdoc = buildPreviewDocument();
  updatePublishedLink();
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Server returned non-JSON (status ${response.status}): ${text}`);
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || "Request failed");
  }

  return data;
}

async function loadProjects() {
  if (!projectsListEl) return;

  projectsListEl.innerHTML = '<div class="empty-text">Loading projects...</div>';

  try {
    const data = await fetchJson("/api/projects/list");
    cachedProjects = Array.isArray(data?.projects) ? data.projects : [];

    const selectedProject = cachedProjects.find((project) => project.id === selectedProjectId);

    if (!selectedProject && cachedProjects.length) {
      const firstProject = cachedProjects[0];
      selectedProjectId = firstProject.id;
      selectedProjectRoot = firstProject.rootPath;
      selectedFolderPath = firstProject.rootPath;
      selectedFilePath = "";
    }

    if (!cachedProjects.length) {
      selectedProjectId = "";
      selectedProjectRoot = "";
      selectedFolderPath = "";
      selectedFilePath = "";
    }

    renderProjectsList();
    updateActionButtons();
  } catch (error) {
    projectsListEl.innerHTML = `<div class="bad">${escapeHtml(error?.message || error)}</div>`;
  }
}

async function loadNodes() {
  if (!nodesTreeEl) return;

  nodesTreeEl.innerHTML = '<div class="empty-text">Loading files...</div>';

  try {
    const data = await fetchJson("/api/nodes/list");
    cachedNodes = Array.isArray(data?.nodes) ? data.nodes : [];

    if (selectedProjectRoot) {
      const projectRootExists = cachedNodes.some(
        (node) => node.kind === "folder" && node.path === selectedProjectRoot
      );

      if (!projectRootExists) {
        selectedProjectId = "";
        selectedProjectRoot = "";
        selectedFolderPath = "";
        selectedFilePath = "";
      }
    }

    if (selectedFilePath) {
      const currentFile = getNodeByPath(selectedFilePath);

      if (!currentFile || !isPathInsideProject(currentFile.path)) {
        selectedFilePath = "";
      }
    }

    if (selectedFolderPath) {
      const currentFolder = getNodeByPath(selectedFolderPath);

      const validFolder =
        selectedFolderPath === selectedProjectRoot ||
        (currentFolder &&
          currentFolder.kind === "folder" &&
          isPathInsideProject(currentFolder.path));

      if (!validFolder) {
        selectedFolderPath = selectedProjectRoot || "";
      }
    }

    renderExplorer();

    if (selectedFilePath) {
      const currentFile = getNodeByPath(selectedFilePath);

      if (currentFile) {
        openFile(currentFile);
      } else {
        clearEditor();
        renderPreview();
      }
    } else {
      clearEditor();
      renderPreview();
    }
  } catch (error) {
    nodesTreeEl.innerHTML = `<div class="bad">${escapeHtml(error?.message || error)}</div>`;
  }
}

async function refreshWorkspace() {
  await loadProjects();
  await loadNodes();
}


function injectProjectModalStyles() {
  if (document.getElementById("builder-project-modal-style")) return;

  const style = document.createElement("style");
  style.id = "builder-project-modal-style";
  style.textContent = `
    .project-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: grid;
      place-items: center;
      padding: 24px;
      background: rgba(0, 0, 0, 0.62);
      backdrop-filter: blur(12px);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.16s ease;
    }

    .project-modal-backdrop.open {
      opacity: 1;
      pointer-events: auto;
    }

    .project-modal {
      width: min(940px, 96vw);
      max-height: min(760px, 92vh);
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      overflow: hidden;
      border: 1px solid #3c3c3c;
      border-radius: 18px;
      background:
        radial-gradient(circle at top left, rgba(14, 99, 156, 0.22), transparent 34%),
        linear-gradient(180deg, #252526 0%, #1e1e1e 100%);
      box-shadow: 0 28px 90px rgba(0, 0, 0, 0.52);
      transform: translateY(10px) scale(0.98);
      transition: transform 0.16s ease;
    }

    .project-modal-backdrop.open .project-modal {
      transform: translateY(0) scale(1);
    }

    .project-modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 20px 22px 16px;
      border-bottom: 1px solid #333333;
      background: rgba(24, 24, 24, 0.78);
    }

    .project-modal-kicker {
      margin: 0 0 6px;
      color: #75beff;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .project-modal-title {
      margin: 0;
      color: #f5f5f5;
      font-size: 22px;
      line-height: 1.2;
      font-weight: 800;
    }

    .project-modal-subtitle {
      margin: 8px 0 0;
      color: #9da3ad;
      font-size: 13px;
      line-height: 1.55;
      max-width: 680px;
    }

    .project-modal-close {
      width: 32px;
      height: 32px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid transparent;
      border-radius: 8px;
      background: transparent;
      color: #c5c5c5;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
    }

    .project-modal-close:hover {
      background: #2a2d2e;
      border-color: #3c3c3c;
      color: #ffffff;
    }

    .project-modal-body {
      min-height: 0;
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
      gap: 18px;
      padding: 20px 22px;
      overflow: auto;
    }

    .project-modal-field {
      margin-bottom: 18px;
    }

    .project-modal-label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }

    .project-modal-label {
      color: #d4d4d4;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .project-modal-help {
      color: #858585;
      font-size: 12px;
    }

    .project-modal-input {
      width: 100%;
      height: 46px;
      border: 1px solid #3c3c3c;
      border-radius: 12px;
      background: #1b1b1b;
      color: #f5f5f5;
      padding: 0 14px;
      outline: none;
      font-size: 14px;
      transition: border-color 0.14s ease, box-shadow 0.14s ease;
    }

    .project-modal-input:focus {
      border-color: #007acc;
      box-shadow: 0 0 0 3px rgba(0, 122, 204, 0.16);
    }

    .project-type-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
    }

    .project-type-card {
      min-height: 148px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: flex-start;
      border: 1px solid #343434;
      border-radius: 14px;
      background: rgba(37, 37, 38, 0.72);
      color: #d4d4d4;
      padding: 14px;
      text-align: left;
      cursor: pointer;
      transition: background 0.14s ease, border-color 0.14s ease, transform 0.14s ease;
    }

    .project-type-card:hover {
      background: #2a2d2e;
      border-color: #4a4a4a;
      transform: translateY(-1px);
    }

    .project-type-card.selected {
      border-color: #007acc;
      background: linear-gradient(180deg, rgba(0, 122, 204, 0.18), rgba(55, 55, 61, 0.62));
    }

    .project-type-icon {
      width: 34px;
      height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
      font-family: Consolas, Menlo, Monaco, monospace;
      font-weight: 900;
      font-size: 13px;
    }

    .project-type-icon.html {
      color: #ffab91;
      background: rgba(227, 79, 38, 0.13);
      border: 1px solid rgba(227, 79, 38, 0.22);
    }

    .project-type-icon.react {
      color: #88e6ff;
      background: rgba(97, 218, 251, 0.13);
      border: 1px solid rgba(97, 218, 251, 0.22);
    }

    .project-type-icon.vue {
      color: #80d8ae;
      background: rgba(65, 184, 131, 0.13);
      border: 1px solid rgba(65, 184, 131, 0.22);
    }

    .project-type-title {
      color: #ffffff;
      font-size: 14px;
      font-weight: 800;
    }

    .project-type-subtitle {
      color: #9da3ad;
      font-size: 12px;
      line-height: 1.5;
    }

    .project-preview-panel {
      min-height: 0;
      border: 1px solid #333333;
      border-radius: 14px;
      background: #181818;
      overflow: hidden;
    }

    .project-preview-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      min-height: 40px;
      padding: 0 12px;
      border-bottom: 1px solid #333333;
      background: #1f1f1f;
    }

    .project-preview-title {
      color: #d4d4d4;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .project-preview-tag {
      color: #75beff;
      font-size: 11px;
      font-weight: 700;
    }

    .project-structure-preview {
      margin: 0;
      padding: 14px;
      min-height: 250px;
      color: #d4d4d4;
      font-family: Consolas, Menlo, Monaco, monospace;
      font-size: 13px;
      line-height: 1.65;
      white-space: pre-wrap;
    }

    .project-modal-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 14px 22px;
      border-top: 1px solid #333333;
      background: rgba(24, 24, 24, 0.82);
    }

    .project-modal-status {
      min-height: 18px;
      color: #858585;
      font-size: 13px;
      line-height: 1.4;
    }

    .project-modal-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .project-modal-secondary,
    .project-modal-primary {
      height: 38px;
      border-radius: 10px;
      padding: 0 14px;
      font-weight: 800;
      cursor: pointer;
      transition: background 0.14s ease, border-color 0.14s ease, transform 0.14s ease;
    }

    .project-modal-secondary {
      border: 1px solid #3c3c3c;
      background: #252526;
      color: #d4d4d4;
    }

    .project-modal-secondary:hover {
      background: #2a2d2e;
      border-color: #505050;
    }

    .project-modal-primary {
      border: 1px solid #0e639c;
      background: #0e639c;
      color: #ffffff;
    }

    .project-modal-primary:hover {
      background: #1177bb;
      border-color: #1177bb;
    }

    .project-modal-primary:disabled,
    .project-modal-secondary:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      transform: none;
    }



    .file-modal-folder-pill {
      display: inline-flex;
      align-items: center;
      max-width: 100%;
      min-height: 34px;
      padding: 7px 10px;
      border: 1px solid #333333;
      border-radius: 10px;
      background: #181818;
      color: #c5c5c5;
      font-family: Consolas, Menlo, Monaco, monospace;
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-type-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .file-type-card {
      min-height: 98px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: flex-start;
      border: 1px solid #343434;
      border-radius: 14px;
      background: rgba(37, 37, 38, 0.72);
      color: #d4d4d4;
      padding: 12px;
      text-align: left;
      cursor: pointer;
      transition: background 0.14s ease, border-color 0.14s ease, transform 0.14s ease;
    }

    .file-type-card:hover {
      background: #2a2d2e;
      border-color: #4a4a4a;
      transform: translateY(-1px);
    }

    .file-type-card.selected {
      border-color: #007acc;
      background: linear-gradient(180deg, rgba(0, 122, 204, 0.18), rgba(55, 55, 61, 0.62));
    }

    .file-type-icon {
      width: 30px;
      height: 30px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 9px;
      font-family: Consolas, Menlo, Monaco, monospace;
      font-weight: 900;
      font-size: 12px;
    }

    .file-type-icon.html { color: #ffab91; background: rgba(227, 79, 38, 0.13); border: 1px solid rgba(227, 79, 38, 0.22); }
    .file-type-icon.css { color: #75beff; background: rgba(66, 165, 245, 0.13); border: 1px solid rgba(66, 165, 245, 0.22); }
    .file-type-icon.js { color: #f7df1e; background: rgba(247, 223, 30, 0.12); border: 1px solid rgba(247, 223, 30, 0.22); }
    .file-type-icon.react { color: #88e6ff; background: rgba(97, 218, 251, 0.13); border: 1px solid rgba(97, 218, 251, 0.22); }
    .file-type-icon.vue { color: #80d8ae; background: rgba(65, 184, 131, 0.13); border: 1px solid rgba(65, 184, 131, 0.22); }
    .file-type-icon.json { color: #f2c94c; background: rgba(242, 201, 76, 0.13); border: 1px solid rgba(242, 201, 76, 0.22); }
    .file-type-icon.md { color: #9cdcfe; background: rgba(156, 220, 254, 0.12); border: 1px solid rgba(156, 220, 254, 0.22); }

    .file-type-title {
      color: #ffffff;
      font-size: 13px;
      font-weight: 800;
    }

    .file-type-subtitle {
      color: #9da3ad;
      font-size: 11px;
      line-height: 1.45;
    }

    .file-template-preview {
      margin: 0;
      padding: 14px;
      min-height: 338px;
      max-height: 420px;
      color: #d4d4d4;
      font-family: Consolas, Menlo, Monaco, monospace;
      font-size: 12px;
      line-height: 1.6;
      white-space: pre-wrap;
      overflow: auto;
    }

    @media (max-width: 860px) {
      .project-modal-body {
        grid-template-columns: 1fr;
      }

      .project-type-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}

function getProjectTypeOption(type) {
  return PROJECT_TYPE_OPTIONS.find((option) => option.type === type) || PROJECT_TYPE_OPTIONS[0];
}

function setProjectModalStatus(message, type = "") {
  if (!projectModalStatusEl) return;

  if (!message) {
    projectModalStatusEl.innerHTML = "";
    return;
  }

  if (type === "ok") {
    projectModalStatusEl.innerHTML = `<span class="ok">${escapeHtml(message)}</span>`;
    return;
  }

  if (type === "bad") {
    projectModalStatusEl.innerHTML = `<span class="bad">${escapeHtml(message)}</span>`;
    return;
  }

  projectModalStatusEl.textContent = message;
}

function renderProjectTypeCards() {
  if (!projectTypeCardsEl) return;

  projectTypeCardsEl.innerHTML = PROJECT_TYPE_OPTIONS.map((option) => {
    const selectedClass = option.type === selectedModalProjectType ? "selected" : "";

    return `
      <button
        class="project-type-card ${selectedClass}"
        type="button"
        data-project-type="${escapeAttribute(option.type)}"
        aria-pressed="${option.type === selectedModalProjectType ? "true" : "false"}"
      >
        <span class="project-type-icon ${escapeAttribute(option.accentClass)}">${escapeHtml(option.icon)}</span>
        <span class="project-type-title">${escapeHtml(option.title)}</span>
        <span class="project-type-subtitle">${escapeHtml(option.subtitle)}</span>
      </button>
    `;
  }).join("");
}

function renderProjectStructurePreview() {
  if (!projectStructurePreviewEl) return;

  const option = getProjectTypeOption(selectedModalProjectType);
  const name = projectNameInputEl?.value?.trim() || "my-project";
  const rootLine = `${name}/`;
  const structureLines = option.structure.map((line) => `  ${line}`);

  projectStructurePreviewEl.textContent = [rootLine, ...structureLines].join("\n");
}

function setModalProjectType(type) {
  selectedModalProjectType = PROJECT_TYPE_OPTIONS.some((option) => option.type === type)
    ? type
    : "html-site";

  renderProjectTypeCards();
  renderProjectStructurePreview();
}

function setupProjectCreationModal() {
  if (projectModalEl) return;

  injectProjectModalStyles();

  projectModalEl = document.createElement("div");
  projectModalEl.id = "projectCreationModal";
  projectModalEl.className = "project-modal-backdrop";
  projectModalEl.setAttribute("aria-hidden", "true");

  projectModalEl.innerHTML = `
    <section class="project-modal" role="dialog" aria-modal="true" aria-labelledby="projectModalTitle">
      <header class="project-modal-header">
        <div>
          <p class="project-modal-kicker">New workspace</p>
          <h2 id="projectModalTitle" class="project-modal-title">Create a new project</h2>
          <p class="project-modal-subtitle">
            Choose a framework-aware starter. The builder will create the project folder, starter files,
            and open it inside your VS Code-like workspace.
          </p>
        </div>
        <button id="projectModalCloseBtn" class="project-modal-close" type="button" aria-label="Close project modal">×</button>
      </header>

      <div class="project-modal-body">
        <div>
          <div class="project-modal-field">
            <div class="project-modal-label-row">
              <label class="project-modal-label" for="projectNameInput">Project name</label>
              <span class="project-modal-help">Example: portfolio-site</span>
            </div>
            <input
              id="projectNameInput"
              class="project-modal-input"
              type="text"
              autocomplete="off"
              placeholder="Enter project name"
            />
          </div>

          <div class="project-modal-field">
            <div class="project-modal-label-row">
              <span class="project-modal-label">Project type</span>
              <span class="project-modal-help">Framework-aware starter</span>
            </div>
            <div id="projectTypeCards" class="project-type-grid"></div>
          </div>
        </div>

        <aside class="project-preview-panel">
          <div class="project-preview-head">
            <span class="project-preview-title">Starter structure</span>
            <span class="project-preview-tag">Preview</span>
          </div>
          <pre id="projectStructurePreview" class="project-structure-preview"></pre>
        </aside>
      </div>

      <footer class="project-modal-footer">
        <div id="projectModalStatus" class="project-modal-status"></div>
        <div class="project-modal-actions">
          <button id="projectCancelBtn" class="project-modal-secondary" type="button">Cancel</button>
          <button id="projectCreateConfirmBtn" class="project-modal-primary" type="button">Create Project</button>
        </div>
      </footer>
    </section>
  `;

  document.body.appendChild(projectModalEl);

  projectNameInputEl = document.getElementById("projectNameInput");
  projectTypeCardsEl = document.getElementById("projectTypeCards");
  projectStructurePreviewEl = document.getElementById("projectStructurePreview");
  projectModalStatusEl = document.getElementById("projectModalStatus");
  projectCreateConfirmBtnEl = document.getElementById("projectCreateConfirmBtn");
  projectCancelBtnEl = document.getElementById("projectCancelBtn");
  projectCloseBtnEl = document.getElementById("projectModalCloseBtn");

  renderProjectTypeCards();
  renderProjectStructurePreview();

  projectNameInputEl?.addEventListener("input", () => {
    setProjectModalStatus("");
    renderProjectStructurePreview();
  });

  projectNameInputEl?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      createProjectFromModal();
    }
  });

  projectTypeCardsEl?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const card = target.closest("[data-project-type]");
    if (!(card instanceof HTMLElement)) return;

    const type = card.getAttribute("data-project-type");
    if (type) {
      setModalProjectType(type);
      setProjectModalStatus("");
    }
  });

  projectCreateConfirmBtnEl?.addEventListener("click", createProjectFromModal);
  projectCancelBtnEl?.addEventListener("click", closeProjectCreationModal);
  projectCloseBtnEl?.addEventListener("click", closeProjectCreationModal);

  projectModalEl.addEventListener("click", (event) => {
    if (event.target === projectModalEl) {
      closeProjectCreationModal();
    }
  });
}

function openProjectCreationModal() {
  setupProjectCreationModal();

  selectedModalProjectType = "html-site";
  isCreatingProject = false;

  if (projectNameInputEl) projectNameInputEl.value = "";
  if (projectCreateConfirmBtnEl) projectCreateConfirmBtnEl.disabled = false;

  setModalProjectType(selectedModalProjectType);
  setProjectModalStatus("");

  projectModalEl?.classList.add("open");
  projectModalEl?.setAttribute("aria-hidden", "false");

  setTimeout(() => {
    projectNameInputEl?.focus();
  }, 40);
}

function closeProjectCreationModal() {
  if (isCreatingProject) return;

  projectModalEl?.classList.remove("open");
  projectModalEl?.setAttribute("aria-hidden", "true");
}

function validateProjectName(name) {
  const value = String(name || "").trim();

  if (!value) return "Project name is required.";
  if (value.length < 2) return "Project name must be at least 2 characters.";
  if (value.length > 60) return "Project name must be shorter than 60 characters.";

  return "";
}

async function createProjectFromModal() {
  if (!projectNameInputEl || !projectCreateConfirmBtnEl) return;

  const name = projectNameInputEl.value.trim();
  const validationMessage = validateProjectName(name);

  if (validationMessage) {
    setProjectModalStatus(validationMessage, "bad");
    projectNameInputEl.focus();
    return;
  }

  isCreatingProject = true;
  projectCreateConfirmBtnEl.disabled = true;
  projectCreateConfirmBtnEl.textContent = "Creating...";
  setProjectModalStatus("Creating project workspace...");

  try {
    const data = await fetchJson("/api/projects/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type: selectedModalProjectType }),
    });

    const project = data?.project;

    if (project?.id) {
      selectedProjectId = project.id;
      selectedProjectRoot = project.rootPath;
      selectedFolderPath = project.rootPath;
      selectedFilePath = "";
      collapsedFolders.clear();
    }

    setProjectModalStatus("Project created successfully.", "ok");
    setStatus(`Project created successfully (${getProjectTypeLabel(selectedModalProjectType)}).`, "ok");

    await refreshWorkspace();
    closeProjectCreationModal();
  } catch (error) {
    setProjectModalStatus(error?.message || error, "bad");
  } finally {
    isCreatingProject = false;
    projectCreateConfirmBtnEl.disabled = false;
    projectCreateConfirmBtnEl.textContent = "Create Project";
  }
}

function createProjectFromPrompt() {
  openProjectCreationModal();
}

async function renameSelectedProjectFromPrompt() {
  if (!selectedProjectId) {
    setStatus("Select a project first.", "bad");
    return;
  }

  const currentProject = getProjectById(selectedProjectId);
  const currentName = currentProject?.name || selectedProjectId;

  const newName = window.prompt(
    `Rename project\n\nCurrent name: ${currentName}\nNew name:`,
    currentName
  );

  if (!newName || newName === currentName) return;

  try {
    const data = await fetchJson("/api/projects/rename", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: selectedProjectId,
        newName,
      }),
    });

    const project = data?.project;

    if (project?.id) {
      selectedProjectId = project.id;
      selectedProjectRoot = project.rootPath;
      selectedFolderPath = project.rootPath;
      selectedFilePath = "";
    }

    collapsedFolders.clear();

    setStatus("Project renamed successfully.", "ok");
    await refreshWorkspace();
  } catch (error) {
    setStatus(error?.message || error, "bad");
  }
}

async function deleteSelectedProject() {
  if (!selectedProjectId) {
    setStatus("Select a project first.", "bad");
    return;
  }

  const currentProject = getProjectById(selectedProjectId);
  const projectLabel = currentProject?.name || selectedProjectId;

  const confirmed = window.confirm(
    `Delete this project?\n\n${projectLabel}\n\nAll files and folders inside it will be removed.`
  );

  if (!confirmed) return;

  try {
    await fetchJson("/api/projects/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: selectedProjectId,
      }),
    });

    selectedProjectId = "";
    selectedProjectRoot = "";
    selectedFolderPath = "";
    selectedFilePath = "";
    collapsedFolders.clear();

    setStatus("Project deleted successfully.", "ok");
    await refreshWorkspace();
  } catch (error) {
    setStatus(error?.message || error, "bad");
  }
}

function startInlineCreate(mode) {
  if (!selectedProjectRoot) {
    setStatus("Create or select a project first.", "bad");
    return;
  }

  const baseFolder = selectedFolderPath || selectedProjectRoot;

  resetInlineRenameState();

  inlineCreateMode = mode === "folder" ? "folder" : "file";
  inlineCreateParentPath = baseFolder;
  inlineCreateError = "";
  isInlineCreating = false;
  inlineCreateValue = inlineCreateMode === "folder"
    ? getDefaultFolderNameForCurrentContext()
    : getDefaultFileNameForCurrentContext();

  selectedFilePath = "";
  selectedFolderPath = baseFolder;
  collapsedFolders.delete(baseFolder);

  clearEditor();
  renderExplorer();
  setStatus(
    inlineCreateMode === "folder"
      ? "Type a folder name in the Explorer and press Enter."
      : "Type a file name in the Explorer and press Enter.",
    ""
  );
}

function validateFolderName(name) {
  const value = String(name || "").trim();

  if (!value) return "Folder name is required.";
  if (value.length < 2) return "Folder name must be at least 2 characters.";
  if (value.length > 70) return "Folder name must be shorter than 70 characters.";
  if (value === "." || value === "..") return "Invalid folder name.";
  if (/[\\/]/.test(value)) return "Create one folder at a time.";
  if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
    return "Use only letters, numbers, dots, hyphens, and underscores.";
  }

  return "";
}

function updateInlineCreateValueFromInput() {
  const input = nodesTreeEl?.querySelector('[data-inline-create-input="true"]');

  if (input instanceof HTMLInputElement) {
    inlineCreateValue = input.value;
  }
}

function cancelInlineCreate() {
  if (!inlineCreateMode || isInlineCreating) return;

  resetInlineCreateState();
  renderExplorer();
  setStatus("");
}

async function confirmInlineCreate() {
  if (!inlineCreateMode || isInlineCreating) return;

  updateInlineCreateValueFromInput();

  const mode = inlineCreateMode;
  const baseFolder = inlineCreateParentPath || selectedFolderPath || selectedProjectRoot;
  const name = String(inlineCreateValue || "").trim();
  const validationMessage = mode === "folder" ? validateFolderName(name) : validateFileName(name);

  if (validationMessage) {
    inlineCreateError = validationMessage;
    renderExplorer();
    return;
  }

  isInlineCreating = true;
  inlineCreateError = "";
  setStatus(mode === "folder" ? "Creating folder..." : "Creating file...");

  try {
    if (mode === "folder") {
      const data = await fetchJson("/api/nodes/create-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentPath: baseFolder,
          name,
        }),
      });

      const node = data?.node;
      resetInlineCreateState();

      if (node?.path) {
        selectedFolderPath = node.path;
        selectedFilePath = "";
        collapsedFolders.delete(node.path);
      }

      setStatus("Folder created successfully.", "ok");
      await loadNodes();
      return;
    }

    const templateType = inferFileTypeFromName(name, "html");
    const templateContent = getFileTemplate(name, templateType);

    const data = await fetchJson("/api/nodes/create-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentPath: baseFolder,
        name,
      }),
    });

    const node = data?.node;

    if (node?.path && templateContent) {
      await fetchJson("/api/nodes/save-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: node.path,
          content: templateContent,
        }),
      });
    }

    resetInlineCreateState();
    setStatus("File created successfully.", "ok");
    await loadNodes();

    if (node?.path) {
      const createdNode = getNodeByPath(node.path);

      if (createdNode) {
        openFile(createdNode);
      }
    }
  } catch (error) {
    isInlineCreating = false;
    inlineCreateError = error?.message || String(error);
    renderExplorer();
    setStatus(error?.message || error, "bad");
  }
}

function createFolderFromPrompt() {
  startInlineCreate("folder");
}


function getFileTypeOption(type) {
  return FILE_TYPE_OPTIONS.find((option) => option.type === type) || FILE_TYPE_OPTIONS[0];
}

function inferFileTypeFromName(fileName, fallback = selectedModalFileType) {
  const detected = detectFileType(fileName, fallback);

  if (detected === "jsx" || detected === "tsx") return "jsx";
  if (detected === "js" || detected === "ts") return "js";
  if (detected === "vue") return "vue";
  if (detected === "css") return "css";
  if (detected === "json") return "json";
  if (detected === "md") return "md";
  if (detected === "html") return "html";

  return fallback || "html";
}

function getSuggestedFilesForCurrentContext() {
  const selectedProject = getSelectedProject();
  const baseFolder = selectedFolderPath || selectedProjectRoot || "";
  const relativeFolder = selectedProjectRoot && baseFolder.startsWith(selectedProjectRoot)
    ? baseFolder.slice(selectedProjectRoot.length).replace(/^\//, "")
    : "";

  if (selectedProject?.type === "react-vite") {
    if (relativeFolder === "src") {
      return ["App.jsx", "main.jsx", "index.css", "Hero.jsx"];
    }

    return ["index.html", "package.json", "vite.config.js", "README.md"];
  }

  if (selectedProject?.type === "vue-vite") {
    if (relativeFolder === "src") {
      return ["App.vue", "main.js", "style.css", "Hero.vue"];
    }

    return ["index.html", "package.json", "vite.config.js", "README.md"];
  }

  return ["index.html", "about.html", "style.css", "script.js", "README.md"];
}

function getDefaultFileNameForCurrentContext() {
  const suggestions = getSuggestedFilesForCurrentContext();
  const existingNames = new Set(
    cachedNodes
      .filter((node) => node.kind === "file" && node.parentPath === (selectedFolderPath || selectedProjectRoot))
      .map((node) => String(node.name || "").toLowerCase())
  );

  return suggestions.find((name) => !existingNames.has(name.toLowerCase())) || suggestions[0] || "index.html";
}

function setFileModalStatus(message, type = "") {
  if (!fileModalStatusEl) return;

  if (!message) {
    fileModalStatusEl.innerHTML = "";
    return;
  }

  if (type === "ok") {
    fileModalStatusEl.innerHTML = `<span class="ok">${escapeHtml(message)}</span>`;
    return;
  }

  if (type === "bad") {
    fileModalStatusEl.innerHTML = `<span class="bad">${escapeHtml(message)}</span>`;
    return;
  }

  fileModalStatusEl.textContent = message;
}

function renderFileTypeCards() {
  if (!fileTypeCardsEl) return;

  fileTypeCardsEl.innerHTML = FILE_TYPE_OPTIONS.map((option) => {
    const selectedClass = option.type === selectedModalFileType ? "selected" : "";

    return `
      <button
        class="file-type-card ${selectedClass}"
        type="button"
        data-file-type="${escapeAttribute(option.type)}"
        aria-pressed="${option.type === selectedModalFileType ? "true" : "false"}"
      >
        <span class="file-type-icon ${escapeAttribute(option.accentClass)}">${escapeHtml(option.icon)}</span>
        <span class="file-type-title">${escapeHtml(option.title)}</span>
        <span class="file-type-subtitle">.${escapeHtml(option.extension)} · ${escapeHtml(option.subtitle)}</span>
      </button>
    `;
  }).join("");
}

function toTitleFromFileName(fileName) {
  const base = String(fileName || "New Page")
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

  return base || "New Page";
}

function toComponentName(fileName) {
  const base = String(fileName || "Component")
    .split("/")
    .pop()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim();

  const pascal = base
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  if (!pascal) return "Component";
  return /^[A-Za-z]/.test(pascal) ? pascal : `Component${pascal}`;
}

function getFileTemplate(fileName, requestedType) {
  const fileType = inferFileTypeFromName(fileName, requestedType);
  const title = toTitleFromFileName(fileName);
  const componentName = toComponentName(fileName);
  const selectedProject = getSelectedProject();
  const projectName = selectedProject?.name || "Dynamic Page Builder";

  if (fileType === "html") {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <p class="eyebrow">${projectName}</p>
        <h1>${title}</h1>
        <p>Start building this page with your own content.</p>
      </section>
    </main>
  </body>
</html>
`;
  }

  if (fileType === "css") {
    return `:root {
  font-family: Inter, system-ui, Arial, sans-serif;
  color: #0f172a;
  background: #f8fafc;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 48px 20px;
}

.hero {
  width: min(900px, 100%);
  padding: 48px;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
}

.eyebrow {
  margin: 0 0 12px;
  color: #2563eb;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

h1 {
  margin: 0 0 16px;
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: 1;
}
`;
  }

  if (fileType === "js") {
    const normalizedName = String(fileName || "").toLowerCase();

    if (normalizedName === "main.jsx" || normalizedName === "main.js") {
      return selectedProject?.type === "react-vite"
        ? `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`
        : selectedProject?.type === "vue-vite"
          ? `import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";

createApp(App).mount("#app");
`
          : `const app = document.querySelector(".page") || document.body;

console.log("${title} loaded", app);
`;
    }

    return `const pageTitle = "${title}";

function init${componentName}() {
  console.log(pageTitle + " is ready");
}

document.addEventListener("DOMContentLoaded", init${componentName});
`;
  }

  if (fileType === "jsx") {
    const normalizedName = String(fileName || "").toLowerCase();

    if (normalizedName === "main.jsx" || normalizedName === "main.tsx") {
      return `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
    }

    const appName = normalizedName === "app.jsx" || normalizedName === "app.tsx" ? "App" : componentName;

    return `export default function ${appName}() {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">React + Vite</p>
        <h1>${title}</h1>
        <p>Build this component with your own layout and interactions.</p>
      </section>
    </main>
  );
}
`;
  }

  if (fileType === "vue") {
    return `<template>
  <main class="page">
    <section class="hero">
      <p class="eyebrow">Vue + Vite</p>
      <h1>${title}</h1>
      <p>Build this Vue component with your own layout and interactions.</p>
    </section>
  </main>
</template>

<script setup>
const title = "${title}";
</script>

<style scoped>
.page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 48px 20px;
}

.hero {
  width: min(900px, 100%);
  padding: 48px;
  border-radius: 24px;
  background: #ffffff;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
}

.eyebrow {
  margin: 0 0 12px;
  color: #42b883;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
</style>
`;
  }

  if (fileType === "json") {
    return `{
  "name": "${String(title).toLowerCase().replace(/\s+/g, "-")}",
  "description": "Generated by Dynamic Page Builder",
  "createdWith": "dynamic-page-builder"
}
`;
  }

  if (fileType === "md") {
    return `# ${title}

Write your notes, documentation, or project content here.

## Overview

- Add your main details
- Keep it clear and organized
- Update this file as your project grows
`;
  }

  return "";
}

function renderFileTemplatePreview() {
  if (!fileTemplatePreviewEl) return;

  const fileName = fileNameInputEl?.value?.trim() || getDefaultFileNameForCurrentContext();
  const type = inferFileTypeFromName(fileName, selectedModalFileType);
  const template = getFileTemplate(fileName, type);

  fileTemplatePreviewEl.textContent = template || "This file will be created empty.";
}

function setModalFileType(type) {
  selectedModalFileType = FILE_TYPE_OPTIONS.some((option) => option.type === type)
    ? type
    : "html";

  renderFileTypeCards();
  renderFileTemplatePreview();
}

function setupFileCreationModal() {
  if (fileModalEl) return;

  injectProjectModalStyles();

  fileModalEl = document.createElement("div");
  fileModalEl.id = "fileCreationModal";
  fileModalEl.className = "project-modal-backdrop";
  fileModalEl.setAttribute("aria-hidden", "true");

  fileModalEl.innerHTML = `
    <section class="project-modal" role="dialog" aria-modal="true" aria-labelledby="fileModalTitle">
      <header class="project-modal-header">
        <div>
          <p class="project-modal-kicker">New file</p>
          <h2 id="fileModalTitle" class="project-modal-title">Create a new file</h2>
          <p class="project-modal-subtitle">
            Choose a file type and starter template. The builder will create the file inside your selected folder
            and open it in the Monaco editor.
          </p>
        </div>
        <button id="fileModalCloseBtn" class="project-modal-close" type="button" aria-label="Close file modal">×</button>
      </header>

      <div class="project-modal-body">
        <div>
          <div class="project-modal-field">
            <div class="project-modal-label-row">
              <span class="project-modal-label">Selected folder</span>
              <span class="project-modal-help">Target location</span>
            </div>
            <div id="fileFolderText" class="file-modal-folder-pill">Root</div>
          </div>

          <div class="project-modal-field">
            <div class="project-modal-label-row">
              <label class="project-modal-label" for="fileNameInput">File name</label>
              <span class="project-modal-help">Example: index.html</span>
            </div>
            <input
              id="fileNameInput"
              class="project-modal-input"
              type="text"
              autocomplete="off"
              placeholder="Enter file name"
            />
          </div>

          <div class="project-modal-field">
            <div class="project-modal-label-row">
              <span class="project-modal-label">File type</span>
              <span class="project-modal-help">Template-aware</span>
            </div>
            <div id="fileTypeCards" class="file-type-grid"></div>
          </div>
        </div>

        <aside class="project-preview-panel">
          <div class="project-preview-head">
            <span class="project-preview-title">Starter template</span>
            <span class="project-preview-tag">Preview</span>
          </div>
          <pre id="fileTemplatePreview" class="file-template-preview"></pre>
        </aside>
      </div>

      <footer class="project-modal-footer">
        <div id="fileModalStatus" class="project-modal-status"></div>
        <div class="project-modal-actions">
          <button id="fileCancelBtn" class="project-modal-secondary" type="button">Cancel</button>
          <button id="fileCreateConfirmBtn" class="project-modal-primary" type="button">Create File</button>
        </div>
      </footer>
    </section>
  `;

  document.body.appendChild(fileModalEl);

  fileNameInputEl = document.getElementById("fileNameInput");
  fileFolderTextEl = document.getElementById("fileFolderText");
  fileTypeCardsEl = document.getElementById("fileTypeCards");
  fileTemplatePreviewEl = document.getElementById("fileTemplatePreview");
  fileModalStatusEl = document.getElementById("fileModalStatus");
  fileCreateConfirmBtnEl = document.getElementById("fileCreateConfirmBtn");
  fileCancelBtnEl = document.getElementById("fileCancelBtn");
  fileCloseBtnEl = document.getElementById("fileModalCloseBtn");

  renderFileTypeCards();
  renderFileTemplatePreview();

  fileNameInputEl?.addEventListener("input", () => {
    setFileModalStatus("");
    const inferredType = inferFileTypeFromName(fileNameInputEl.value.trim(), selectedModalFileType);
    if (inferredType !== selectedModalFileType) {
      selectedModalFileType = inferredType;
      renderFileTypeCards();
    }
    renderFileTemplatePreview();
  });

  fileNameInputEl?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      createFileFromModal();
    }
  });

  fileTypeCardsEl?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const card = target.closest("[data-file-type]");
    if (!(card instanceof HTMLElement)) return;

    const type = card.getAttribute("data-file-type");
    if (type) {
      setModalFileType(type);
      setFileModalStatus("");
    }
  });

  fileCreateConfirmBtnEl?.addEventListener("click", createFileFromModal);
  fileCancelBtnEl?.addEventListener("click", closeFileCreationModal);
  fileCloseBtnEl?.addEventListener("click", closeFileCreationModal);

  fileModalEl.addEventListener("click", (event) => {
    if (event.target === fileModalEl) {
      closeFileCreationModal();
    }
  });
}

function openFileCreationModal() {
  if (!selectedProjectRoot) {
    setStatus("Create or select a project first.", "bad");
    return;
  }

  setupFileCreationModal();

  const defaultName = getDefaultFileNameForCurrentContext();
  selectedModalFileType = inferFileTypeFromName(defaultName, "html");
  isCreatingFile = false;

  if (fileNameInputEl) fileNameInputEl.value = defaultName;
  if (fileFolderTextEl) fileFolderTextEl.textContent = selectedFolderPath || selectedProjectRoot || "Root";
  if (fileCreateConfirmBtnEl) fileCreateConfirmBtnEl.disabled = false;

  renderFileTypeCards();
  renderFileTemplatePreview();
  setFileModalStatus("");

  fileModalEl?.classList.add("open");
  fileModalEl?.setAttribute("aria-hidden", "false");

  setTimeout(() => {
    fileNameInputEl?.focus();
    fileNameInputEl?.select();
  }, 40);
}

function closeFileCreationModal() {
  if (isCreatingFile) return;

  fileModalEl?.classList.remove("open");
  fileModalEl?.setAttribute("aria-hidden", "true");
}

function validateFileName(name) {
  const value = String(name || "").trim();

  if (!value) return "File name is required.";
  if (value.length < 3) return "File name must include a name and extension.";
  if (value.length > 90) return "File name must be shorter than 90 characters.";
  if (value === "." || value === "..") return "Invalid file name.";
  if (/[/\\]/.test(value)) return "Create folders separately, then create files inside them.";
  if (!/^[a-zA-Z0-9._-]+$/.test(value)) {
    return "Use only letters, numbers, dots, hyphens, and underscores.";
  }
  if (!value.includes(".")) return "Please include a file extension like .html, .css, .js, .jsx, .vue, .json, or .md.";

  return "";
}

async function createFileFromModal() {
  if (!fileNameInputEl || !fileCreateConfirmBtnEl) return;

  const name = fileNameInputEl.value.trim();
  const validationMessage = validateFileName(name);

  if (validationMessage) {
    setFileModalStatus(validationMessage, "bad");
    fileNameInputEl.focus();
    return;
  }

  const baseFolder = selectedFolderPath || selectedProjectRoot;
  const templateType = inferFileTypeFromName(name, selectedModalFileType);
  const templateContent = getFileTemplate(name, templateType);

  isCreatingFile = true;
  fileCreateConfirmBtnEl.disabled = true;
  fileCreateConfirmBtnEl.textContent = "Creating...";
  setFileModalStatus("Creating file and applying starter template...");

  try {
    const data = await fetchJson("/api/nodes/create-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentPath: baseFolder,
        name,
      }),
    });

    const node = data?.node;

    if (node?.path && templateContent) {
      await fetchJson("/api/nodes/save-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: node.path,
          content: templateContent,
        }),
      });
    }

    setFileModalStatus("File created successfully.", "ok");
    setStatus("File created successfully.", "ok");

    await loadNodes();

    if (node?.path) {
      const createdNode = getNodeByPath(node.path);
      if (createdNode) {
        openFile(createdNode);
      }
    }

    closeFileCreationModal();
  } catch (error) {
    setFileModalStatus(error?.message || error, "bad");
  } finally {
    isCreatingFile = false;
    fileCreateConfirmBtnEl.disabled = false;
    fileCreateConfirmBtnEl.textContent = "Create File";
  }
}

function createFileFromPrompt() {
  startInlineCreate("file");
}

function updateInlineRenameValueFromInput() {
  const input = nodesTreeEl?.querySelector('[data-inline-rename-input="true"]');

  if (input instanceof HTMLInputElement) {
    inlineRenameValue = input.value;
  }
}

function cancelInlineRename() {
  if (!inlineRenamePath || isInlineRenaming) return;

  resetInlineRenameState();
  renderExplorer();
  setStatus("");
}

function validateRenameName(target, newName) {
  const value = String(newName || "").trim();

  if (!target) return "Select a file or folder to rename.";

  if (target.kind === "folder") {
    return validateFolderName(value);
  }

  return validateFileName(value);
}

function startInlineRename() {
  const target = getActionTarget();

  if (!target) {
    setStatus("Select a file or folder to rename.", "bad");
    return;
  }

  resetInlineCreateState();

  inlineRenamePath = target.path;
  inlineRenameValue = target.name || "";
  inlineRenameError = "";
  isInlineRenaming = false;

  selectedFolderPath = target.parentPath || selectedProjectRoot;
  selectedFilePath = target.kind === "file" ? target.path : "";
  expandAncestors(target.path);

  renderExplorer();
  setStatus("Type the new name in the Explorer and press Enter.");
}

async function confirmInlineRename() {
  if (!inlineRenamePath || isInlineRenaming) return;

  updateInlineRenameValueFromInput();

  const target = getNodeByPath(inlineRenamePath);
  const newName = String(inlineRenameValue || "").trim();

  if (!target) {
    inlineRenameError = "The selected item no longer exists.";
    renderExplorer();
    return;
  }

  if (newName === target.name) {
    resetInlineRenameState();
    renderExplorer();
    setStatus("");
    return;
  }

  const validationMessage = validateRenameName(target, newName);

  if (validationMessage) {
    inlineRenameError = validationMessage;
    renderExplorer();
    return;
  }

  isInlineRenaming = true;
  inlineRenameError = "";
  setStatus(target.kind === "folder" ? "Renaming folder..." : "Renaming file...");

  try {
    const data = await fetchJson("/api/nodes/rename", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: target.path,
        newName,
      }),
    });

    const renamedNode = data?.node;
    collapsedFolders.clear();
    resetInlineRenameState();

    if (renamedNode?.kind === "file") {
      selectedFilePath = renamedNode.path;
      selectedFolderPath = renamedNode.parentPath || selectedProjectRoot;
    } else if (renamedNode?.kind === "folder") {
      selectedFilePath = "";
      selectedFolderPath = renamedNode.path;
    }

    setStatus(`${target.kind === "folder" ? "Folder" : "File"} renamed successfully.`, "ok");
    await loadNodes();

    if (renamedNode?.kind === "file") {
      const freshNode = getNodeByPath(renamedNode.path);

      if (freshNode) {
        openFile(freshNode);
      }
    } else {
      clearEditor();
      renderExplorer();
      renderPreview();
    }
  } catch (error) {
    isInlineRenaming = false;
    inlineRenameError = error?.message || String(error);
    renderExplorer();
    setStatus(error?.message || error, "bad");
  }
}

function renameSelectedNodeFromPrompt() {
  startInlineRename();
}

async function deleteSelectedNode() {
  const target = getActionTarget();

  if (!target) {
    setStatus("Select a file or folder to delete.", "bad");
    return;
  }

  const label = target.kind === "folder" ? "folder" : "file";
  const confirmed = window.confirm(`Delete this ${label}?\n\n${target.path}`);

  if (!confirmed) return;

  try {
    await fetchJson("/api/nodes/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: target.path,
      }),
    });

    selectedFilePath = "";
    selectedFolderPath = target.parentPath || selectedProjectRoot;
    collapsedFolders.clear();

    setStatus(`${label} deleted successfully.`, "ok");
    await loadNodes();
    clearEditor();
    renderExplorer();
    renderPreview();
  } catch (error) {
    setStatus(error?.message || error, "bad");
  }
}

async function saveCurrentFile() {
  if (!selectedFilePath || !saveBtn) return;

  saveBtn.disabled = true;
  const oldText = saveBtn.textContent;
  saveBtn.textContent = "Saving...";

  try {
    const content = getEditorValue();

    await fetchJson("/api/nodes/save-file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: selectedFilePath,
        content,
      }),
    });

    cachedNodes = cachedNodes.map((node) =>
      node.path === selectedFilePath
        ? {
            ...node,
            content,
            updatedAt: new Date().toISOString(),
          }
        : node
    );

    renderPreview();

    const publishedUrl = getPublishedUrl();

    if (publishedUrl && statusEl) {
      statusEl.innerHTML = `
        <span class="ok">File saved successfully.</span>
        <a
          href="${escapeAttribute(publishedUrl)}"
          target="_blank"
          style="color:#93c5fd; text-decoration:none; font-weight:700;"
        >
          Open published page
        </a>
      `;
    } else {
      setStatus("File saved successfully.", "ok");
    }
  } catch (error) {
    setStatus(error?.message || error, "bad");
  } finally {
    saveBtn.disabled = !selectedFilePath;
    saveBtn.textContent = oldText;
  }
}

function bindEvents() {
  projectsListEl?.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) return;

    const dropdown = target.closest("[data-project-dropdown]");

    if (target.closest("[data-project-dropdown-toggle]")) {
      if (dropdown instanceof HTMLElement) {
        const shouldOpen = !dropdown.classList.contains("open");

        document
          .querySelectorAll("[data-project-dropdown].open")
          .forEach((openDropdown) => {
            openDropdown.classList.remove("open");
            openDropdown.closest(".section-card")?.classList.remove("project-dropdown-open");
          });

        dropdown.classList.toggle("open", shouldOpen);
        dropdown.closest(".section-card")?.classList.toggle("project-dropdown-open", shouldOpen);
      }
      return;
    }

    const projectBtn = target.closest("[data-project-id]");

    if (!(projectBtn instanceof HTMLElement)) return;

    const projectId = projectBtn.getAttribute("data-project-id");
    const project = projectId ? getProjectById(projectId) : null;

    if (project) {
      selectProject(project);

      if (dropdown instanceof HTMLElement) {
        dropdown.classList.remove("open");
        dropdown.closest(".section-card")?.classList.remove("project-dropdown-open");
      }
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) return;
    if (target.closest("[data-project-dropdown]")) return;

    document
      .querySelectorAll("[data-project-dropdown].open")
      .forEach((dropdown) => {
        dropdown.classList.remove("open");
        dropdown.closest(".section-card")?.classList.remove("project-dropdown-open");
      });
  });

  nodesTreeEl?.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) return;

    if (target.closest("[data-inline-create]")) return;
    if (target.closest("[data-inline-rename]")) return;

    const folderBtn = target.closest("[data-folder-path]");

    if (folderBtn instanceof HTMLElement) {
      const folderPath = folderBtn.getAttribute("data-folder-path");

      if (folderPath) {
        selectFolder(folderPath);
      }

      return;
    }

    const fileBtn = target.closest("[data-file-path]");

    if (!(fileBtn instanceof HTMLElement)) return;

    const filePath = fileBtn.getAttribute("data-file-path");
    const node = filePath ? getNodeByPath(filePath) : null;

    if (node) {
      openFile(node);
    }
  });

  nodesTreeEl?.addEventListener("input", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) return;

    if (target.getAttribute("data-inline-create-input") === "true") {
      inlineCreateValue = target.value;
      inlineCreateError = "";
      return;
    }

    if (target.getAttribute("data-inline-rename-input") === "true") {
      inlineRenameValue = target.value;
      inlineRenameError = "";
    }
  });

  nodesTreeEl?.addEventListener("keydown", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) return;

    const isCreateInput = target.getAttribute("data-inline-create-input") === "true";
    const isRenameInput = target.getAttribute("data-inline-rename-input") === "true";

    if (!isCreateInput && !isRenameInput) return;

    if (event.key === "Enter") {
      event.preventDefault();

      if (isCreateInput) {
        confirmInlineCreate();
        return;
      }

      confirmInlineRename();
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();

      if (isCreateInput) {
        cancelInlineCreate();
        return;
      }

      cancelInlineRename();
    }
  });

  newProjectBtn?.addEventListener("click", createProjectFromPrompt);
  renameProjectBtn?.addEventListener("click", renameSelectedProjectFromPrompt);
  deleteProjectBtn?.addEventListener("click", deleteSelectedProject);
  refreshProjectsBtn?.addEventListener("click", refreshWorkspace);

  newFolderBtn?.addEventListener("click", createFolderFromPrompt);
  newFileBtn?.addEventListener("click", createFileFromPrompt);
  renameBtn?.addEventListener("click", renameSelectedNodeFromPrompt);
  deleteBtn?.addEventListener("click", deleteSelectedNode);
  refreshBtn?.addEventListener("click", refreshWorkspace);

  saveBtn?.addEventListener("click", saveCurrentFile);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      cancelInlineCreate();
      closeProjectCreationModal();
      closeFileCreationModal();
      return;
    }

    const isSaveShortcut =
      (event.ctrlKey || event.metaKey) && String(event.key || "").toLowerCase() === "s";

    if (!isSaveShortcut) return;

    event.preventDefault();

    if (selectedFilePath) {
      saveCurrentFile();
    }
  });
}

async function initBuilder() {
  if (
    !projectsListEl ||
    !nodesTreeEl ||
    !selectedProjectTextEl ||
    !selectedFolderTextEl ||
    !selectedPathInputEl ||
    !editorHostEl ||
    !editorEmptyEl ||
    !saveBtn ||
    !statusEl ||
    !editorModeEl ||
    !fileTypeBadgeEl ||
    !languageBadgeEl ||
    !previewFrame ||
    !newProjectBtn ||
    !renameProjectBtn ||
    !deleteProjectBtn ||
    !refreshProjectsBtn ||
    !newFileBtn ||
    !newFolderBtn ||
    !renameBtn ||
    !deleteBtn ||
    !refreshBtn ||
    !publishedUrlRowEl ||
    !publishedUrlLinkEl
  ) {
    console.error("Builder elements not found");
    return;
  }

  injectVsCodePolishStyles();
  setupActionButtonIcons();
  setupFallbackEditor();
  bindEvents();
  clearEditor();
  renderPreview();

  await refreshWorkspace();

  setupMonacoEditor();
}

initBuilder();
