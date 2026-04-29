let cachedProjects = [];
let cachedNodes = [];

let selectedProjectId = "";
let selectedProjectRoot = "";
let selectedFolderPath = "";
let selectedFilePath = "";

const collapsedFolders = new Set();

let monacoApi = null;
let monacoEditor = null;

let activeEditorValue = "";
let activeEditorLanguage = "plaintext";
let activeEditorPath = "empty.txt";
let activeEditorReadOnly = true;

let previewSyncTimer = null;
let activePreviewUrl = "";
let activePreviewProjectRoot = "";
let isStartingPreview = false;

let inlineCreateMode = "";
let inlineCreateParentPath = "";
let inlineCreateValue = "";
let inlineCreateError = "";
let isInlineCreating = false;

let inlineRenamePath = "";
let inlineRenameValue = "";
let inlineRenameError = "";
let isInlineRenaming = false;

let projectModalEl = null;
let projectNameInputEl = null;
let projectTypeCardsEl = null;
let projectStructurePreviewEl = null;
let projectModalStatusEl = null;
let projectCreateConfirmBtnEl = null;
let selectedModalProjectType = "html-site";
let isCreatingProject = false;

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

const PROJECT_TYPE_OPTIONS = [
  {
    type: "html-site",
    icon: "H",
    title: "HTML Site",
    subtitle: "Static HTML, CSS, and JavaScript project.",
    accentClass: "html",
    structure: ["index.html", "style.css", "script.js"],
  },
  {
    type: "react-vite",
    icon: "R",
    title: "React + Vite",
    subtitle: "React project with real Vite preview support.",
    accentClass: "react",
    structure: ["index.html", "src/", "  main.jsx", "  app.jsx", "  index.css"],
  },
  {
    type: "vue-vite",
    icon: "V",
    title: "Vue + Vite",
    subtitle: "Vue SFC project with real Vite preview support.",
    accentClass: "vue",
    structure: ["index.html", "src/", "  main.js", "  app.vue", "  style.css"],
  },
];

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
  if (fileType === "js") return "builder-js";
  if (fileType === "jsx" || fileType === "tsx") return "builder-jsx";
  if (fileType === "ts") return "builder-js";

  if (fileType === "vue") return "builder-vue-lite";

  if (fileType === "json") return "json";
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

function isFrameworkProject(project) {
  return project?.type === "react-vite" || project?.type === "vue-vite";
}

function getSelectedProject() {
  return cachedProjects.find((project) => project.id === selectedProjectId) || null;
}

function getProjectById(projectId) {
  return cachedProjects.find((project) => project.id === projectId);
}

function getNodeByPath(nodePath) {
  return cachedNodes.find((node) => node.path === nodePath);
}

function isPathInsideProject(nodePath) {
  if (!selectedProjectRoot || !nodePath) return false;
  return nodePath === selectedProjectRoot || nodePath.startsWith(`${selectedProjectRoot}/`);
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

function injectVsCodePolishStyles() {
  if (document.getElementById("builder-vscode-polish-style")) return;

  const style = document.createElement("style");
  style.id = "builder-vscode-polish-style";

  style.textContent = `
    .explorer-context {
      display: none !important;
    }

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
    }

    .icon-btn:hover {
      background: #2a2d2e !important;
      border-color: #3a3d41 !important;
      color: #ffffff !important;
    }

    .icon-btn:disabled {
      opacity: 0.38 !important;
      cursor: not-allowed !important;
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

    .icon-btn.action-create:hover { color: #89d185 !important; }
    .icon-btn.action-rename:hover { color: #dcdcaa !important; }
    .icon-btn.action-delete:hover { color: #f48771 !important; }
    .icon-btn.action-refresh:hover { color: #75beff !important; }

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
      font-size: 13px;
      font-weight: 600;
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

    .monaco-editor,
    .monaco-editor-background,
    .monaco-editor .margin {
      background-color: #1e1e1e !important;
    }
  `;

  document.head.appendChild(style);
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

function setupBuilderCustomLanguages() {
  if (!monacoApi) return;

  const existingLanguages = monacoApi.languages.getLanguages();

  const hasBuilderHtml = existingLanguages.some(
    (language) => language.id === "builder-html"
  );

  const hasBuilderCss = existingLanguages.some(
    (language) => language.id === "builder-css"
  );

  const hasBuilderJs = existingLanguages.some(
    (language) => language.id === "builder-js"
  );

  const hasBuilderJsx = existingLanguages.some(
    (language) => language.id === "builder-jsx"
  );

  const hasBuilderVueLite = existingLanguages.some(
    (language) => language.id === "builder-vue-lite"
  );

  if (!hasBuilderHtml) {
    monacoApi.languages.register({
      id: "builder-html",
      extensions: [".html", ".htm", ".astro"],
      aliases: ["Builder HTML", "HTML"],
      mimetypes: ["text/html"],
    });

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
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
    });

    monacoApi.languages.setMonarchTokensProvider("builder-html", {
      defaultToken: "",
      tokenPostfix: ".html",

      tokenizer: {
        root: [
          [/<!DOCTYPE[^>]*>/i, "metatag"],
          [/<!--/, "comment", "@comment"],

          [/(<\/?)([a-zA-Z][\w:-]*)/, ["delimiter.angle", "tag.html"]],
          [/\/?>/, "delimiter.angle"],

          [
            /\b(class|className|id|src|href|alt|title|type|name|value|placeholder|content|charset|rel|target|lang|style)\b(?=\s*=)/,
            "attribute.name",
          ],
          [/\b([a-zA-Z_:][\w:.-]*)\b(?=\s*=)/, "attribute.name"],

          [/"/, "attribute.value", "@attrDouble"],
          [/'/, "attribute.value", "@attrSingle"],

          [/[^<"'=\s]+/, ""],
          [/\s+/, "white"],
          [/[=]/, "delimiter"],
        ],

        attrDouble: [
          [/[^"]+/, "attribute.value"],
          [/"/, "attribute.value", "@pop"],
        ],

        attrSingle: [
          [/[^']+/, "attribute.value"],
          [/'/, "attribute.value", "@pop"],
        ],

        comment: [
          [/[^-]+/, "comment"],
          [/-->/, "comment", "@pop"],
          [/-/, "comment"],
        ],
      },
    });
  }

  if (!hasBuilderCss) {
    monacoApi.languages.register({
      id: "builder-css",
      extensions: [".css", ".scss", ".less"],
      aliases: ["Builder CSS", "CSS"],
      mimetypes: ["text/css"],
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
      tokenPostfix: ".css",

      properties: [
        "color",
        "background",
        "background-color",
        "font-size",
        "font-weight",
        "font-family",
        "line-height",
        "margin",
        "padding",
        "border",
        "border-radius",
        "box-shadow",
        "display",
        "position",
        "top",
        "right",
        "bottom",
        "left",
        "width",
        "height",
        "min-height",
        "max-width",
        "grid",
        "flex",
        "gap",
        "align-items",
        "justify-content",
        "box-sizing",
        "overflow",
        "transform",
        "transition",
        "animation",
        "opacity",
        "z-index",
        "cursor",
      ],

      tokenizer: {
        root: [
          [/\/\*/, "comment", "@comment"],

          [/--[a-zA-Z0-9-_]+(?=\s*:)/, "css.variable"],

          [/[.#][a-zA-Z_][\w-]*/, "css.selector"],
          [/[a-zA-Z][\w-]*(?=\s*\{)/, "css.selector"],

          [/@[a-zA-Z-]+/, "css.keyword"],

          [
            /[a-zA-Z-]+(?=\s*:)/,
            {
              cases: {
                "@properties": "css.property",
                "@default": "css.property",
              },
            },
          ],

          [/#([0-9a-fA-F]{3,8})\b/, "css.hex"],
          [/\b\d+(\.\d+)?(px|rem|em|vh|vw|%|s|ms|deg)?\b/, "css.number"],

          [
            /\b(rgb|rgba|hsl|hsla|linear-gradient|radial-gradient|calc|clamp|min|max|var|url|translate|scale|rotate)\b(?=\()/,
            "css.function",
          ],

          [/!important\b/, "css.important"],

          [/"([^"\\]|\\.)*$/, "string.invalid"],
          [/'([^'\\]|\\.)*$/, "string.invalid"],
          [/"/, "string", "@stringDouble"],
          [/'/, "string", "@stringSingle"],

          [/[{}]/, "delimiter.bracket"],
          [/[()[\]]/, "delimiter.parenthesis"],
          [/[;:,.]/, "delimiter"],

          [/\s+/, "white"],
          [/[a-zA-Z_][\w-]*/, "identifier"],
        ],

        stringDouble: [
          [/[^\\"]+/, "string"],
          [/\\./, "string.escape"],
          [/"/, "string", "@pop"],
        ],

        stringSingle: [
          [/[^\\']+/, "string"],
          [/\\./, "string.escape"],
          [/'/, "string", "@pop"],
        ],

        comment: [
          [/[^\/*]+/, "comment"],
          [/\*\//, "comment", "@pop"],
          [/[\/*]/, "comment"],
        ],
      },
    });
  }

  if (!hasBuilderJs) {
    monacoApi.languages.register({
      id: "builder-js",
      extensions: [".js", ".mjs", ".cjs", ".ts"],
      aliases: ["Builder JavaScript", "JavaScript"],
      mimetypes: ["text/javascript"],
    });

    monacoApi.languages.setLanguageConfiguration("builder-js", {
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

    monacoApi.languages.setMonarchTokensProvider("builder-js", {
      defaultToken: "",
      tokenPostfix: ".js",

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
        "do",
        "switch",
        "case",
        "break",
        "continue",
        "try",
        "catch",
        "finally",
        "throw",
        "new",
        "class",
        "extends",
        "super",
        "this",
        "typeof",
        "instanceof",
        "async",
        "await",
        "true",
        "false",
        "null",
        "undefined",
        "in",
        "of",
        "as",
      ],

      frameworkNames: [
        "defineConfig",
        "react",
        "vue",
        "createApp",
        "createRoot",
        "React",
        "ReactDOM",
        "axios",
        "gsap",
        "THREE",
        "motion",
      ],

      operators: [
        "=",
        ">",
        "<",
        "!",
        "~",
        "?",
        ":",
        "==",
        "<=",
        ">=",
        "!=",
        "===",
        "!==",
        "&&",
        "||",
        "++",
        "--",
        "+",
        "-",
        "*",
        "/",
        "&",
        "|",
        "^",
        "%",
        "+=",
        "-=",
        "*=",
        "/=",
        "=>",
      ],

      symbols: /[=><!~?:&|+\-*\/\^%]+/,

      tokenizer: {
        root: [
          [/\b(import|from|export|default)\b/, "keyword.import"],

          [
            /[a-zA-Z_$][\w$]*/,
            {
              cases: {
                "@keywords": "keyword",
                "@frameworkNames": "type.react",
                "@default": "identifier",
              },
            },
          ],

          [/\b([A-Z][A-Za-z0-9_$]*)\b(?=\s*\()/, "function.component"],
          [/\b([a-zA-Z_$][\w$]*)\b(?=\s*\()/, "function"],
          [/\b([a-zA-Z_$][\w$]*)\b(?=\s*:)/, "property"],

          [/\d*\.\d+([eE][\-+]?\d+)?/, "number.float"],
          [/0[xX][0-9a-fA-F]+/, "number.hex"],
          [/\d+/, "number"],

          [/"([^"\\]|\\.)*$/, "string.invalid"],
          [/'([^'\\]|\\.)*$/, "string.invalid"],
          [/"/, "string", "@stringDouble"],
          [/'/, "string", "@stringSingle"],
          [/`/, "string.template", "@stringBacktick"],

          [/\/\*/, "comment", "@comment"],
          [/\/\/.*$/, "comment"],

          [/[{}]/, "delimiter.bracket"],
          [/[()[\]]/, "delimiter.parenthesis"],

          [
            /@symbols/,
            {
              cases: {
                "@operators": "operator",
                "@default": "",
              },
            },
          ],

          [/[;,.]/, "delimiter"],
          [/\s+/, "white"],
        ],

        stringDouble: [
          [/[^\\"]+/, "string"],
          [/\\./, "string.escape"],
          [/"/, "string", "@pop"],
        ],

        stringSingle: [
          [/[^\\']+/, "string"],
          [/\\./, "string.escape"],
          [/'/, "string", "@pop"],
        ],

        stringBacktick: [
          [/\$\{/, "delimiter.bracket", "@bracketCounting"],
          [/[^\\`$]+/, "string.template"],
          [/\\./, "string.escape"],
          [/`/, "string.template", "@pop"],
        ],

        bracketCounting: [
          [/\{/, "delimiter.bracket", "@bracketCounting"],
          [/\}/, "delimiter.bracket", "@pop"],
          { include: "root" },
        ],

        comment: [
          [/[^\/*]+/, "comment"],
          [/\*\//, "comment", "@pop"],
          [/[\/*]/, "comment"],
        ],
      },
    });
  }

  if (!hasBuilderVueLite) {
    monacoApi.languages.register({
      id: "builder-vue-lite",
      extensions: [".vue"],
      aliases: ["Builder Vue Lite", "Vue"],
      mimetypes: ["text/x-vue"],
    });
  
    monacoApi.languages.setLanguageConfiguration("builder-vue-lite", {
      comments: {
        lineComment: "//",
        blockComment: ["/*", "*/"],
      },
      brackets: [
        ["<", ">"],
        ["{", "}"],
        ["[", "]"],
        ["(", ")"],
      ],
      autoClosingPairs: [
        { open: "<", close: ">" },
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
        { open: "`", close: "`" },
      ],
    });
  
    monacoApi.languages.setMonarchTokensProvider("builder-vue-lite", {
      defaultToken: "",
      tokenPostfix: ".vue",
  
      keywords: [
        "import",
        "from",
        "export",
        "default",
        "const",
        "let",
        "var",
        "function",
        "return",
        "if",
        "else",
        "for",
        "while",
        "true",
        "false",
        "null",
        "undefined",
        "defineProps",
        "defineEmits",
        "ref",
        "reactive",
        "computed",
        "watch",
        "onMounted",
        "onUnmounted",
      ],
  
      vueGlobals: [
        "template",
        "script",
        "style",
        "setup",
        "scoped",
        "props",
        "emit",
        "v-if",
        "v-for",
        "v-model",
      ],
  
      operators: [
        "=",
        ">",
        "<",
        "!",
        "?",
        ":",
        "==",
        "===",
        "!=",
        "!==",
        "&&",
        "||",
        "+",
        "-",
        "*",
        "/",
        "=>",
      ],
  
      symbols: /[=><!?:&|+\-*\/]+/,
  
      tokenizer: {
        root: [
          [/<!--/, "comment", "@htmlComment"],
  
          // Vue SFC main blocks
          [/(<\/?)(template|script|style)\b/, ["delimiter.angle", "vue.section"]],
  
          // Vue component tags
          [/(<\/?)([A-Z][\w-]*)/, ["delimiter.angle", "tag.vue.component"]],
  
          // HTML tags
          [/(<\/?)([a-z][\w-]*)/, ["delimiter.angle", "tag.html"]],
  
          // Tag close
          [/\/?>/, "delimiter.angle"],
  
          // Vue directives: v-if, v-for, v-model
          [
            /\b(v-if|v-else|v-else-if|v-for|v-show|v-model|v-bind|v-on|v-slot|v-html|v-text)\b/,
            "vue.directive",
          ],
  
          // Vue shorthand directives: :key, :project, @click, @submit.prevent
          [/[:@][a-zA-Z][\w:.-]*/, "vue.directive"],
  
          // HTML/Vue attributes
          [
            /\b(class|id|src|href|alt|type|name|value|placeholder|style|ref|key|setup|scoped)\b(?=\s*=|\s|>|$)/,
            "attribute.name",
          ],
          [/\b([a-zA-Z_$][\w$-]*)\b(?=\s*=)/, "attribute.name"],
  
          // Vue mustache: {{ value }}
          [/\{\{/, "delimiter.bracket", "@mustache"],
  
          // JS import/export
          [/\b(import|from|export|default)\b/, "keyword.import"],
  
          // Function calls
          [/\b([A-Z][A-Za-z0-9_$]*)\b(?=\s*\()/, "function.component"],
          [/\b([a-zA-Z_$][\w$]*)\b(?=\s*\()/, "function"],
  
          // JS identifiers
          [
            /[a-zA-Z_$][\w$]*/,
            {
              cases: {
                "@keywords": "keyword",
                "@vueGlobals": "type.vue",
                "@default": "identifier",
              },
            },
          ],
  
          // CSS inside style block
          [/[.#][a-zA-Z_][\w-]*/, "css.selector"],
          [/--[a-zA-Z0-9-_]+(?=\s*:)/, "css.variable"],
          [/[a-zA-Z-]+(?=\s*:)/, "css.property"],
          [/#([0-9a-fA-F]{3,8})\b/, "css.hex"],
          [/\b\d+(\.\d+)?(px|rem|em|vh|vw|%|s|ms|deg)?\b/, "css.number"],
  
          // Numbers
          [/\d*\.\d+([eE][\-+]?\d+)?/, "number.float"],
          [/0[xX][0-9a-fA-F]+/, "number.hex"],
          [/\d+/, "number"],
  
          // Strings
          [/"([^"\\]|\\.)*$/, "string.invalid"],
          [/'([^'\\]|\\.)*$/, "string.invalid"],
          [/"/, "string", "@stringDouble"],
          [/'/, "string", "@stringSingle"],
          [/`/, "string.template", "@stringBacktick"],
  
          // JS comments
          [/\/\*/, "comment", "@comment"],
          [/\/\/.*$/, "comment"],
  
          // Brackets/operators
          [/[{}]/, "delimiter.bracket"],
          [/[()[\]]/, "delimiter.parenthesis"],
          [
            /@symbols/,
            {
              cases: {
                "@operators": "operator",
                "@default": "",
              },
            },
          ],
  
          [/[;,.]/, "delimiter"],
          [/\s+/, "white"],
        ],
  
        mustache: [
          [/\}\}/, "delimiter.bracket", "@pop"],
          [
            /[a-zA-Z_$][\w$]*/,
            {
              cases: {
                "@keywords": "keyword",
                "@default": "identifier",
              },
            },
          ],
          [/"([^"\\]|\\.)*"/, "string"],
          [/'([^'\\]|\\.)*'/, "string"],
          [/\d+/, "number"],
          [/[{}()[\]]/, "delimiter.bracket"],
          [/[;,.]/, "delimiter"],
          [/\s+/, "white"],
        ],
  
        stringDouble: [
          [/[^\\"]+/, "string"],
          [/\\./, "string.escape"],
          [/"/, "string", "@pop"],
        ],
  
        stringSingle: [
          [/[^\\']+/, "string"],
          [/\\./, "string.escape"],
          [/'/, "string", "@pop"],
        ],
  
        stringBacktick: [
          [/\$\{/, "delimiter.bracket", "@bracketCounting"],
          [/[^\\`$]+/, "string.template"],
          [/\\./, "string.escape"],
          [/`/, "string.template", "@pop"],
        ],
  
        bracketCounting: [
          [/\{/, "delimiter.bracket", "@bracketCounting"],
          [/\}/, "delimiter.bracket", "@pop"],
          { include: "root" },
        ],
  
        htmlComment: [
          [/[^-]+/, "comment"],
          [/-->/, "comment", "@pop"],
          [/-/, "comment"],
        ],
  
        comment: [
          [/[^\/*]+/, "comment"],
          [/\*\//, "comment", "@pop"],
          [/[\/*]/, "comment"],
        ],
      },
    });
  }
  
    if (!hasBuilderJsx) {
      monacoApi.languages.register({
        id: "builder-jsx",
        extensions: [".jsx", ".tsx"],
        aliases: ["Builder JSX", "React JSX", "JSX", "TSX"],
        mimetypes: ["text/jsx"],
      });
  
      monacoApi.languages.setLanguageConfiguration("builder-jsx", {
        comments: {
          lineComment: "//",
          blockComment: ["/*", "*/"],
        },
        brackets: [
          ["{", "}"],
          ["[", "]"],
          ["(", ")"],
          ["<", ">"],
        ],
        autoClosingPairs: [
          { open: "{", close: "}" },
          { open: "[", close: "]" },
          { open: "(", close: ")" },
          { open: "<", close: ">" },
          { open: '"', close: '"' },
          { open: "'", close: "'" },
          { open: "`", close: "`" },
        ],
      });
  
      monacoApi.languages.setMonarchTokensProvider("builder-jsx", {
        defaultToken: "",
        tokenPostfix: ".jsx",
  
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
          "true",
          "false",
          "null",
          "undefined",
          "async",
          "await",
        ],
  
        reactNames: [
          "React",
          "ReactDOM",
          "StrictMode",
          "Fragment",
          "useState",
          "useEffect",
          "useMemo",
          "useCallback",
          "useRef",
          "createRoot",
        ],
  
        operators: [
          "=",
          ">",
          "<",
          "!",
          "~",
          "?",
          ":",
          "==",
          "<=",
          ">=",
          "!=",
          "&&",
          "||",
          "++",
          "--",
          "+",
          "-",
          "*",
          "/",
          "&",
          "|",
          "^",
          "%",
          "=>",
        ],
  
        symbols: /[=><!~?:&|+\-*\/\^%]+/,
  
        tokenizer: {
          root: [
            [/(<\/?)([A-Z][\w.]*)/, ["delimiter.angle", "tag.react"]],
            [/(<\/?)([a-z][\w-]*)/, ["delimiter.angle", "tag.html"]],
            [/\/?>/, "delimiter.angle"],
  
            [
              /\b(className|htmlFor|onClick|onChange|onSubmit|style|key|ref|id|src|href|alt|type|value|placeholder|disabled|checked)\b(?=\s*=)/,
              "attribute.name",
            ],
            [/\b([a-zA-Z_$][\w$-]*)\b(?=\s*=)/, "attribute.name"],
  
            [/\b(import|from|export|default)\b/, "keyword.import"],
  
            [
              /[a-zA-Z_$][\w$]*/,
              {
                cases: {
                  "@keywords": "keyword",
                  "@reactNames": "type.react",
                  "@default": "identifier",
                },
              },
            ],
  
            [/\b([A-Z][A-Za-z0-9_$]*)\b(?=\s*\()/, "function.component"],
            [/\b([a-zA-Z_$][\w$]*)\b(?=\s*\()/, "function"],
  
            [/\d*\.\d+([eE][\-+]?\d+)?/, "number.float"],
            [/0[xX][0-9a-fA-F]+/, "number.hex"],
            [/\d+/, "number"],
  
            [/"([^"\\]|\\.)*$/, "string.invalid"],
            [/'([^'\\]|\\.)*$/, "string.invalid"],
            [/"/, "string", "@stringDouble"],
            [/'/, "string", "@stringSingle"],
            [/`/, "string.template", "@stringBacktick"],
  
            [/\/\*/, "comment", "@comment"],
            [/\/\/.*$/, "comment"],
  
            [/[{}]/, "delimiter.bracket"],
            [/[()[\]]/, "delimiter.parenthesis"],
  
            [
              /@symbols/,
              {
                cases: {
                  "@operators": "operator",
                  "@default": "",
                },
              },
            ],
  
            [/[;,.]/, "delimiter"],
            [/\s+/, "white"],
          ],
  
          stringDouble: [
            [/[^\\"]+/, "string"],
            [/\\./, "string.escape"],
            [/"/, "string", "@pop"],
          ],
  
          stringSingle: [
            [/[^\\']+/, "string"],
            [/\\./, "string.escape"],
            [/'/, "string", "@pop"],
          ],
  
          stringBacktick: [
            [/\$\{/, "delimiter.bracket", "@bracketCounting"],
            [/[^\\`$]+/, "string.template"],
            [/\\./, "string.escape"],
            [/`/, "string.template", "@pop"],
          ],
  
          bracketCounting: [
            [/\{/, "delimiter.bracket", "@bracketCounting"],
            [/\}/, "delimiter.bracket", "@pop"],
            { include: "root" },
          ],
  
          comment: [
            [/[^\/*]+/, "comment"],
            [/\*\//, "comment", "@pop"],
            [/[\/*]/, "comment"],
          ],
        },
      });
    }
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
    
    setupBuilderCustomLanguages();

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
    
        { token: "keyword", foreground: "C586C0" },
        { token: "keyword.import", foreground: "C586C0" },
    
        { token: "string", foreground: "CE9178" },
        { token: "string.template", foreground: "CE9178" },
        { token: "string.escape", foreground: "D7BA7D" },
        { token: "string.invalid", foreground: "F48771" },
    
        { token: "number", foreground: "B5CEA8" },
        { token: "number.float", foreground: "B5CEA8" },
        { token: "number.hex", foreground: "B5CEA8" },
    
        // HTML / JSX tags
        { token: "metatag", foreground: "569CD6" },
        { token: "delimiter.angle", foreground: "808080" },
        { token: "tag.html", foreground: "569CD6" },
        { token: "tag.react", foreground: "4EC9B0", fontStyle: "bold" },
        { token: "attribute.name", foreground: "9CDCFE" },
        { token: "attribute.value", foreground: "CE9178" },

        // CSS
        { token: "css.selector", foreground: "D7BA7D" },
        { token: "css.property", foreground: "9CDCFE" },
        { token: "css.variable", foreground: "4FC1FF" },
        { token: "css.hex", foreground: "CE9178" },
        { token: "css.number", foreground: "B5CEA8" },
        { token: "css.function", foreground: "DCDCAA" },
        { token: "css.keyword", foreground: "C586C0" },
        { token: "css.important", foreground: "F48771", fontStyle: "bold" },

        // JavaScript
        { token: "keyword.import", foreground: "C586C0" },
        { token: "type.react", foreground: "4EC9B0" },
        { token: "function.component", foreground: "4FC1FF", fontStyle: "bold" },
        { token: "function", foreground: "DCDCAA" },
        { token: "property", foreground: "9CDCFE" },
        { token: "identifier", foreground: "D4D4D4" },

        // Vue
        { token: "vue.section", foreground: "42B883", fontStyle: "bold" },
        { token: "tag.vue.component", foreground: "4EC9B0", fontStyle: "bold" },
        { token: "vue.directive", foreground: "C586C0", fontStyle: "bold" },
        { token: "type.vue", foreground: "42B883" },
    
        // JS / React
        { token: "identifier", foreground: "D4D4D4" },
        { token: "type.react", foreground: "4EC9B0" },
        { token: "function", foreground: "DCDCAA" },
        { token: "function.component", foreground: "4FC1FF", fontStyle: "bold" },
    
        // brackets/operators
        { token: "operator", foreground: "D4D4D4" },
        { token: "delimiter", foreground: "D4D4D4" },
        { token: "delimiter.bracket", foreground: "FFD700" },
        { token: "delimiter.parenthesis", foreground: "D4D4D4" },
    
        // fallback Monaco built-in tokens
        { token: "tag", foreground: "569CD6" },
        { token: "attribute.name.html", foreground: "9CDCFE" },
        { token: "attribute.value.html", foreground: "CE9178" },
        { token: "type", foreground: "4EC9B0" },
        { token: "variable", foreground: "9CDCFE" },
        { token: "property", foreground: "9CDCFE" },
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
      const compilerOptions = {
        allowNonTsExtensions: true,
        allowJs: true,
        checkJs: false,
        jsx: tsLanguage.JsxEmit.ReactJSX,
        target: tsLanguage.ScriptTarget.ES2020,
        module: tsLanguage.ModuleKind.ESNext,
        moduleResolution: tsLanguage.ModuleResolutionKind.NodeJs,
      };

      tsLanguage.javascriptDefaults.setCompilerOptions(compilerOptions);
      tsLanguage.typescriptDefaults.setCompilerOptions(compilerOptions);
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
    console.error("Monaco Editor failed to load.", error);
    setStatus("Monaco failed to load. Check browser console.", "bad");
  }
}

function setEditorContent(value, language, modelPath, readOnly) {
  activeEditorValue = String(value || "");
  activeEditorLanguage = language || "plaintext";
  activeEditorPath = modelPath || "empty.txt";
  activeEditorReadOnly = Boolean(readOnly);

  if (!monacoApi || !monacoEditor) return;

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
  monacoEditor.updateOptions({
    theme: "builderDarkPlus",
    readOnly: activeEditorReadOnly,
  });
}

function getEditorValue() {
  if (monacoEditor) return monacoEditor.getValue();
  return activeEditorValue;
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
    const project = getSelectedProject();

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

function resetInlineCreateState() {
  inlineCreateMode = "";
  inlineCreateParentPath = "";
  inlineCreateValue = "";
  inlineCreateError = "";
  isInlineCreating = false;
}

function resetInlineRenameState() {
  inlineRenamePath = "";
  inlineRenameValue = "";
  inlineRenameError = "";
  isInlineRenaming = false;
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

function getSuggestedFilesForCurrentContext() {
  const selectedProject = getSelectedProject();
  const baseFolder = selectedFolderPath || selectedProjectRoot || "";
  const relativeFolder =
    selectedProjectRoot && baseFolder.startsWith(selectedProjectRoot)
      ? baseFolder.slice(selectedProjectRoot.length).replace(/^\//, "")
      : "";

  if (selectedProject?.type === "react-vite") {
    if (relativeFolder === "src") {
      return ["app.jsx", "main.jsx", "index.css", "hero.jsx"];
    }

    if (relativeFolder === "src/components") {
      return ["Header.jsx", "Card.jsx", "Button.jsx"];
    }

    return ["index.html", "README.md"];
  }

  if (selectedProject?.type === "vue-vite") {
    if (relativeFolder === "src") {
      return ["app.vue", "main.js", "style.css", "Hero.vue"];
    }

    if (relativeFolder === "src/components") {
      return ["Header.vue", "Card.vue", "Button.vue"];
    }

    return ["index.html", "README.md"];
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

function renderInlineCreateRow(parentPath, depth = 0) {
  if (!inlineCreateMode || inlineCreateParentPath !== parentPath) return "";

  const isFolder = inlineCreateMode === "folder";
  const fileName = inlineCreateValue || (isFolder ? "new-folder" : getDefaultFileNameForCurrentContext());

  const tempNode = isFolder
    ? { kind: "folder", name: fileName }
    : { kind: "file", name: fileName, fileType: detectFileType(fileName, "html") };

  const helperText = isFolder
    ? "Enter creates folder • Esc cancels"
    : "Extension decides template automatically • Enter creates file";

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
        <span>
          <span class="inline-create-kbd">Enter</span> create
          <span class="inline-create-kbd">Esc</span> cancel
        </span>
        <span class="${inlineCreateError ? "inline-create-error" : ""}">
          ${escapeHtml(inlineCreateError || helperText)}
        </span>
      </div>
    </div>
  `;
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

function renderTree(parentPath, depth = 0) {
  const children = sortChildren(getChildren(parentPath));
  const inlineRow = renderInlineCreateRow(parentPath, depth);

  return (
    inlineRow +
    children
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
      .join("")
  );
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
  resetInlineRenameState();

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
  });
}

function selectFolder(folderPath) {
  resetInlineCreateState();
  resetInlineRenameState();

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
  resetInlineRenameState();

  selectedProjectId = project.id;
  selectedProjectRoot = project.rootPath;
  selectedFolderPath = project.rootPath;
  selectedFilePath = "";

  setStatus("");

  collapsedFolders.clear();
  collapsedFolders.delete(project.rootPath);

  window.clearTimeout(previewSyncTimer);
  activePreviewUrl = "";
  activePreviewProjectRoot = "";
  isStartingPreview = false;

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

function ensureMountElement(html, mountId) {
  const source = String(html || "");
  const mountRegex = new RegExp(`id=(['"])${mountId}\\1`, "i");

  if (mountRegex.test(source)) return source;

  return injectBeforeBodyEnd(source, `<div id="${mountId}"></div>`);
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

function buildPreviewLoadingDocument(project) {
  const label = project?.type === "vue-vite" ? "Vue + Vite" : "React + Vite";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Starting preview</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f8fafc;
        color: #0f172a;
        font-family: system-ui, Arial, sans-serif;
      }

      .card {
        width: min(460px, calc(100% - 32px));
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        background: white;
        box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
        padding: 24px;
      }

      .pill {
        display: inline-flex;
        margin-bottom: 12px;
        padding: 6px 10px;
        border-radius: 999px;
        background: #dbeafe;
        color: #2563eb;
        font-size: 12px;
        font-weight: 800;
      }

      h1 {
        margin: 0 0 8px;
        font-size: 22px;
      }

      p {
        margin: 0;
        color: #64748b;
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <span class="pill">${escapeHtml(label)}</span>
      <h1>Starting real Vite preview...</h1>
      <p>The builder is syncing your project files into a temporary Vite workspace.</p>
    </div>
  </body>
</html>`;
}

function buildPreviewErrorDocument(title, message) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #0f172a;
        color: #e5e7eb;
        font-family: system-ui, Arial, sans-serif;
        padding: 24px;
      }

      .card {
        width: min(780px, 100%);
        border: 1px solid rgba(248, 113, 113, 0.38);
        border-radius: 18px;
        background: rgba(127, 29, 29, 0.24);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
        padding: 24px;
      }

      h1 {
        margin: 0 0 10px;
        color: #fecaca;
        font-size: 22px;
      }

      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        color: #fee2e2;
        background: rgba(0, 0, 0, 0.28);
        border-radius: 12px;
        padding: 16px;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${escapeHtml(title)}</h1>
      <pre>${escapeHtml(message)}</pre>
    </div>
  </body>
</html>`;
}

function getCurrentPreviewOverride() {
  if (!selectedFilePath) return null;

  const selectedNode = getNodeByPath(selectedFilePath);

  if (!selectedNode || selectedNode.kind !== "file") return null;

  return {
    path: selectedFilePath,
    content: getEditorValue(),
  };
}

async function startRealVitePreview(project) {
  if (!previewFrame || !project?.rootPath || isStartingPreview) return;

  isStartingPreview = true;

  previewFrame.removeAttribute("src");
  previewFrame.srcdoc = buildPreviewLoadingDocument(project);

  try {
    const data = await fetchJson("/api/preview/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectRoot: project.rootPath,
        currentFile: getCurrentPreviewOverride(),
      }),
    });

    if (!data?.ok || !data?.url) {
      throw new Error(data?.error || "Vite preview server did not return a URL.");
    }

    activePreviewUrl = String(data.url);
    activePreviewProjectRoot = project.rootPath;

    previewFrame.removeAttribute("srcdoc");
    previewFrame.src = activePreviewUrl;

    updatePublishedLink();
  } catch (error) {
    activePreviewUrl = "";
    activePreviewProjectRoot = "";

    previewFrame.removeAttribute("src");
    previewFrame.srcdoc = buildPreviewErrorDocument(
      "Real Vite Preview Error",
      error?.message || String(error)
    );

    setStatus(error?.message || error, "bad");
  } finally {
    isStartingPreview = false;
  }
}

async function syncRealVitePreview(project) {
  if (!previewFrame || !project?.rootPath) return;

  if (!activePreviewUrl || activePreviewProjectRoot !== project.rootPath) {
    await startRealVitePreview(project);
    return;
  }

  try {
    const data = await fetchJson("/api/preview/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        projectRoot: project.rootPath,
        currentFile: getCurrentPreviewOverride(),
      }),
    });

    if (!data?.ok || !data?.url) {
      throw new Error(data?.error || "Preview sync failed.");
    }

    const newUrl = String(data.url);

    if (newUrl !== activePreviewUrl) {
      activePreviewUrl = newUrl;
      previewFrame.removeAttribute("srcdoc");
      previewFrame.src = activePreviewUrl;
    }
  } catch (error) {
    console.error("Preview sync failed", error);
    setStatus(error?.message || error, "bad");
  }
}

function scheduleRealVitePreviewSync(project) {
  window.clearTimeout(previewSyncTimer);

  previewSyncTimer = window.setTimeout(() => {
    syncRealVitePreview(project);
  }, 300);
}

function renderPreview() {
  if (!previewFrame) return;

  const project = getSelectedProject();

  if (isFrameworkProject(project)) {
    updatePublishedLink();

    if (!activePreviewUrl || activePreviewProjectRoot !== project.rootPath) {
      startRealVitePreview(project);
      return;
    }

    scheduleRealVitePreviewSync(project);
    return;
  }

  window.clearTimeout(previewSyncTimer);
  activePreviewUrl = "";
  activePreviewProjectRoot = "";
  isStartingPreview = false;

  previewFrame.removeAttribute("src");
  previewFrame.srcdoc = buildHtmlPreviewDocument();

  updatePublishedLink();
}

function getPublishedUrl() {
  if (!selectedProjectRoot) return "";

  const project = getSelectedProject();

  if (isFrameworkProject(project)) {
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
    }

    .project-type-card:hover {
      background: #2a2d2e;
      border-color: #4a4a4a;
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
    }

    .project-modal-secondary {
      border: 1px solid #3c3c3c;
      background: #252526;
      color: #d4d4d4;
    }

    .project-modal-primary {
      border: 1px solid #0e639c;
      background: #0e639c;
      color: #ffffff;
    }

    .project-modal-primary:disabled,
    .project-modal-secondary:disabled {
      opacity: 0.55;
      cursor: not-allowed;
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
            Choose a framework-aware starter. The builder will create the project folder,
            starter files, and open it inside your VS Code-like workspace.
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

  const projectCancelBtnEl = document.getElementById("projectCancelBtn");
  const projectCloseBtnEl = document.getElementById("projectModalCloseBtn");

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

function getFileTemplate(fileName) {
  const fileType = detectFileType(fileName, "txt");
  const title = toTitleFromFileName(fileName);
  const componentName = toComponentName(fileName);
  const selectedProject = getSelectedProject();

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
        <p class="eyebrow">${selectedProject?.name || "Dynamic Page Builder"}</p>
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
`;
  }

  if (fileType === "js") {
    const normalizedName = String(fileName || "").toLowerCase();

    if (normalizedName === "main.js" && selectedProject?.type === "vue-vite") {
      return `import { createApp } from "vue";
import App from "./app.vue";
import "./style.css";

createApp(App).mount("#app");
`;
    }

    return `console.log("${title} loaded");
`;
  }

  if (fileType === "jsx" || fileType === "tsx") {
    const normalizedName = String(fileName || "").toLowerCase();

    if (normalizedName === "main.jsx" || normalizedName === "main.tsx") {
      return `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app.jsx";
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
  "description": "Generated by Dynamic Page Builder"
}
`;
  }

  if (fileType === "md") {
    return `# ${title}

Write your notes, documentation, or project content here.
`;
  }

  return "";
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
  if (!value.includes(".")) {
    return "Please include a file extension like .html, .css, .js, .jsx, .vue, .json, or .md.";
  }

  return "";
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
  inlineCreateValue =
    inlineCreateMode === "folder"
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
      : "Type a file name in the Explorer and press Enter."
  );
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

    const templateContent = getFileTemplate(name);

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

function createFileFromPrompt() {
  startInlineCreate("file");
}

function createFolderFromPrompt() {
  startInlineCreate("folder");
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
      cancelInlineRename();
      closeProjectCreationModal();
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
  bindEvents();
  clearEditor();
  renderPreview();

  await refreshWorkspace();

  setupMonacoEditor();
}

initBuilder();