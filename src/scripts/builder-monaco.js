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

function injectVsCodePolishStyles() {
  if (document.getElementById("builder-vscode-polish-style")) return;

  const style = document.createElement("style");
  style.id = "builder-vscode-polish-style";

  style.textContent = `

        .toolbar {
      display: flex !important;
      align-items: center !important;
      gap: 7px !important;
      flex-wrap: wrap !important;
      justify-content: flex-end !important;
    }

    .icon-btn {
      min-width: auto !important;
      height: 34px !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 7px !important;
      padding: 0 12px !important;
      border-radius: 8px !important;
      border: 1px solid #3c3c3c !important;
      background: #2d2d30 !important;
      color: #d4d4d4 !important;
      font-size: 12px !important;
      font-weight: 700 !important;
      line-height: 1 !important;
      cursor: pointer !important;
      box-shadow:
        inset 0 1px 0 rgba(255,255,255,0.04),
        0 1px 2px rgba(0,0,0,0.25) !important;
      transition:
        background 0.12s ease,
        border-color 0.12s ease,
        color 0.12s ease,
        transform 0.12s ease !important;
    }

    .icon-btn:hover {
      background: #333337 !important;
      border-color: #505050 !important;
      color: #ffffff !important;
    }

    .icon-btn:active {
      transform: translateY(1px) !important;
    }

    .icon-btn:disabled {
      opacity: 0.45 !important;
      cursor: not-allowed !important;
      transform: none !important;
    }

    .icon-btn.action-create {
      color: #dbeafe !important;
    }

    .icon-btn.action-rename {
      color: #fef3c7 !important;
    }

    .icon-btn.action-delete {
      color: #fecaca !important;
    }

    .icon-btn.action-refresh {
      color: #bfdbfe !important;
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
      display: inline-block !important;
      white-space: nowrap !important;
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

    .icon-folder {
      color: #dcb67a !important;
      font-size: 15px !important;
    }

    .icon-html {
      color: #e44d26 !important;
    }

    .icon-css {
      color: #42a5f5 !important;
    }

    .icon-js {
      color: #f7df1e !important;
    }

    .icon-react {
      color: #61dafb !important;
      font-size: 13px !important;
    }

    .icon-vue {
      color: #42b883 !important;
    }

    .icon-json {
      color: #f2c94c !important;
    }

    .icon-md {
      color: #9cdcfe !important;
    }

    .icon-astro {
      color: #ff5d01 !important;
    }

    .icon-config {
      color: #c586c0 !important;
    }

    .icon-text {
      color: #c5c5c5 !important;
    }

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

    .tok-comment {
      color: #6a9955;
      font-style: italic;
    }

    .tok-keyword {
      color: #c586c0;
    }

    .tok-string {
      color: #ce9178;
    }

    .tok-number {
      color: #b5cea8;
    }

    .tok-tag {
      color: #569cd6;
    }

    .tok-attr {
      color: #9cdcfe;
    }

    .tok-punct {
      color: #808080;
    }

    .tok-function {
      color: #dcdcaa;
    }

    .tok-type {
      color: #4ec9b0;
    }

    .tok-property {
      color: #9cdcfe;
    }

    .tok-css-value {
      color: #ce9178;
    }

    .tok-selector {
      color: #d7ba7d;
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

  if (fileType === "html") return "html";
  if (fileType === "css") return "css";
  if (fileType === "js" || fileType === "jsx") return "javascript";
  if (fileType === "ts" || fileType === "tsx") return "typescript";
  if (fileType === "vue") return "html";
  if (fileType === "json") return "json";
  if (fileType === "md") return "markdown";
  if (fileType === "astro") return "html";

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
  button.innerHTML = `${iconSvg(iconName)}<span class="btn-label">${escapeHtml(label)}</span>`;
}

function setupActionButtonIcons() {
  setActionButtonIcon(newProjectBtn, "project", "Project", "action-create");
  setActionButtonIcon(renameProjectBtn, "rename", "Rename", "action-rename");
  setActionButtonIcon(deleteProjectBtn, "delete", "Delete", "action-delete");
  setActionButtonIcon(refreshProjectsBtn, "refresh", "Refresh", "action-refresh");

  setActionButtonIcon(newFileBtn, "file", "File", "action-create");
  setActionButtonIcon(newFolderBtn, "folder", "Folder", "action-create");
  setActionButtonIcon(renameBtn, "rename", "Rename", "action-rename");
  setActionButtonIcon(deleteBtn, "delete", "Delete", "action-delete");
  setActionButtonIcon(refreshBtn, "refresh", "Refresh", "action-refresh");
}


function getNodeIconInfo(node) {
  if (!node) {
    return { className: "vscode-icon icon-text", text: "•" };
  }

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
      const opener = match[2];
      const tagName = match[3];
      const attrs = match[4] || "";
      const closer = match[5];

      result += `<span class="tok-punct">${escapeHtml(opener)}</span>`;
      result += `<span class="tok-tag">${escapeHtml(tagName)}</span>`;
      result += highlightAttributes(attrs);
      result += `<span class="tok-punct">${escapeHtml(closer)}</span>`;
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
  const lines = String(code || "").split("\n");

  return lines
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

    globalThis.MonacoEnvironment = {
      getWorker(_workerId, label) {
        if (label === "json") return new jsonWorkerModule.default();
        if (label === "css" || label === "scss" || label === "less") return new cssWorkerModule.default();
        if (label === "html" || label === "handlebars" || label === "razor") return new htmlWorkerModule.default();
        if (label === "typescript" || label === "javascript") return new tsWorkerModule.default();

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
        { token: "string", foreground: "CE9178" },
        { token: "number", foreground: "B5CEA8" },
        { token: "type", foreground: "4EC9B0" },
        { token: "class", foreground: "4EC9B0" },
        { token: "function", foreground: "DCDCAA" },
        { token: "variable", foreground: "9CDCFE" },
        { token: "tag", foreground: "569CD6" },
        { token: "attribute.name", foreground: "9CDCFE" },
        { token: "attribute.value", foreground: "CE9178" },
        { token: "delimiter", foreground: "808080" },
        { token: "property", foreground: "9CDCFE" },
      ],
      colors: {
        "editor.background": "#1e1e1e",
        "editor.foreground": "#d4d4d4",
        "editorLineNumber.foreground": "#858585",
        "editorLineNumber.activeForeground": "#c6c6c6",
        "editorCursor.foreground": "#ffffff",
        "editor.selectionBackground": "#264f78",
        "editor.inactiveSelectionBackground": "#3a3d41",
        "editor.lineHighlightBackground": "#2a2d2e",
        "editorGutter.background": "#1e1e1e",
        "editorIndentGuide.background1": "#404040",
        "editorIndentGuide.activeBackground1": "#707070",
      },
    });

    monacoApi.languages.typescript.javascriptDefaults.setCompilerOptions({
      allowNonTsExtensions: true,
      allowJs: true,
      checkJs: false,
      jsx: monacoApi.languages.typescript.JsxEmit.React,
      target: monacoApi.languages.typescript.ScriptTarget.ES2020,
      module: monacoApi.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monacoApi.languages.typescript.ModuleResolutionKind.NodeJs,
    });

    monacoApi.languages.typescript.typescriptDefaults.setCompilerOptions({
      allowNonTsExtensions: true,
      jsx: monacoApi.languages.typescript.JsxEmit.React,
      target: monacoApi.languages.typescript.ScriptTarget.ES2020,
      module: monacoApi.languages.typescript.ModuleKind.ESNext,
      moduleResolution: monacoApi.languages.typescript.ModuleResolutionKind.NodeJs,
    });

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
      },
      wordWrap: "on",
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      cursorBlinking: "smooth",
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
      folding: true,
      showFoldingControls: "mouseover",
      quickSuggestions: true,
      suggestOnTriggerCharacters: true,
      formatOnPaste: true,
      formatOnType: true,
      colorDecorators: true,
      links: true,
      lineNumbers: "on",
      lineNumbersMinChars: 4,
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
      if (model.getLanguageId() !== activeEditorLanguage) {
        monacoApi.editor.setModelLanguage(model, activeEditorLanguage);
      }

      if (model.getValue() !== activeEditorValue) {
        model.setValue(activeEditorValue);
      }
    }

    monacoEditor.setModel(model);
    monacoEditor.updateOptions({ readOnly: activeEditorReadOnly });
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

  projectsListEl.innerHTML = cachedProjects
    .map((project) => {
      const activeClass = project.id === selectedProjectId ? "active" : "";
      const typeClass = getProjectTypeClass(project.type);
      const projectIconText = getProjectIconText(project.type);

      return `
        <button
          class="project-item ${activeClass}"
          type="button"
          data-project-id="${escapeHtml(project.id)}"
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
}

function renderTree(parentPath, depth = 0) {
  const children = sortChildren(getChildren(parentPath));

  return children
    .map((node) => {
      if (node.kind === "folder") {
        const isCollapsed = collapsedFolders.has(node.path);
        const folderActiveClass =
          node.path === selectedFolderPath && !selectedFilePath ? "folder-active" : "";

        return `
          <div class="tree-node">
            <button
              class="tree-row ${folderActiveClass}"
              type="button"
              data-folder-path="${escapeHtml(node.path)}"
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
          data-file-path="${escapeHtml(node.path)}"
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

  if (!projectChildren.length) {
    nodesTreeEl.innerHTML = '<div class="empty-text">No files or folders in this project yet.</div>';
    return;
  }

  nodesTreeEl.innerHTML = renderTree(selectedProjectRoot, 0);
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

function extractBalancedReturnBody(content) {
  const source = String(content || "");
  const returnIndex = source.indexOf("return");

  if (returnIndex === -1) return "";

  const openIndex = source.indexOf("(", returnIndex);
  if (openIndex === -1) return "";

  let depth = 0;

  for (let i = openIndex; i < source.length; i += 1) {
    const char = source[i];

    if (char === "(") depth += 1;

    if (char === ")") {
      depth -= 1;

      if (depth === 0) {
        return source.slice(openIndex + 1, i).trim();
      }
    }
  }

  return "";
}

function normalizeJsxForPreview(markup) {
  return String(markup || "")
    .replace(/<>/g, "")
    .replace(/<\/>/g, "")
    .replace(/\bclassName=/g, "class=")
    .replace(/\bhtmlFor=/g, "for=")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\{`([^`]*)`\}/g, "$1")
    .replace(/\{"([^"]*)"\}/g, "$1")
    .replace(/\{'([^']*)'\}/g, "$1")
    .replace(/\{true\}/g, "true")
    .replace(/\{false\}/g, "false")
    .replace(/\{null\}/g, "")
    .replace(/\{undefined\}/g, "")
    .replace(/\{[\s\S]*?\}/g, "");
}

function extractReactPreviewMarkup() {
  const appNode = findFileInProject(["app.jsx", "app.tsx", "App.jsx", "App.tsx"]);
  if (!appNode) return "";

  const content = getWorkingContent(appNode);
  const returnedMarkup = extractBalancedReturnBody(content);

  if (!returnedMarkup) return "";

  return normalizeJsxForPreview(returnedMarkup);
}

function extractVuePreviewMarkup() {
  const appNode = findFileInProject(["app.vue", "App.vue"]);
  if (!appNode) return "";

  const content = getWorkingContent(appNode);
  const templateMatch = String(content).match(/<template[^>]*>([\s\S]*?)<\/template>/i);

  if (!templateMatch) return "";

  return templateMatch[1].trim();
}

function getFrameworkPreviewMarkup(project) {
  if (project?.type === "react-vite") {
    return extractReactPreviewMarkup();
  }

  if (project?.type === "vue-vite") {
    return extractVuePreviewMarkup();
  }

  return "";
}

function buildFrameworkPreviewDocument(project) {
  const previewFolderPath = selectedProjectRoot;
  const rootHtmlNode = getNodeByPath(`${selectedProjectRoot}/index.html`);
  const { cssNodes } = collectAssetNodesForPreview(previewFolderPath);

  const cssContent = cssNodes.map((node) => getWorkingContent(node)).join("\n\n");
  const frameworkMarkup = getFrameworkPreviewMarkup(project);

  const projectLabel = getProjectTypeLabel(project?.type);
  const title = project?.name || selectedProjectRoot || "Framework Preview";
  const rootHtmlContent = rootHtmlNode ? getWorkingContent(rootHtmlNode) : "";

  if (frameworkMarkup.trim()) {
    return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <style>
${safeStyleContent(cssContent)}
    </style>
  </head>
  <body>
    <div id="app">
      ${frameworkMarkup}
    </div>
  </body>
</html>`;
  }

  if (rootHtmlContent.trim()) {
    return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <style>
${safeStyleContent(cssContent)}
    </style>
  </head>
  <body>
    ${rootHtmlContent}
    <div style="font-family: system-ui, Arial, sans-serif; margin: 24px; padding: 18px; border: 1px dashed #cbd5e1; border-radius: 12px; color: #64748b; background: #f8fafc;">
      <strong>${escapeHtml(projectLabel)} preview note:</strong>
      Component markup could not be extracted automatically yet. Open App.jsx or App.vue and use simple return/template markup for this lightweight preview.
    </div>
  </body>
</html>`;
  }

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
      No root HTML file found for this ${escapeHtml(projectLabel)} project.<br />
      Create <code>index.html</code> inside <code>${escapeHtml(selectedProjectRoot || "project root")}</code>.
    </div>
  </body>
</html>`;
}

function buildPreviewDocument() {
  const selectedProject = getSelectedProject();

  if (isFrameworkProject(selectedProject)) {
    return buildFrameworkPreviewDocument(selectedProject);
  }

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

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <base href="${escapeHtml(baseHref)}" />
    <style>
${safeStyleContent(cssContent)}
    </style>
  </head>
  <body>
    ${htmlContent}
    <script>
${safeScriptContent(jsContent)}
    <\/script>
  </body>
</html>`;
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

async function createProjectFromPrompt() {
  const name = window.prompt("Create new project\n\nProject name:");
  if (!name) return;

  const typePrompt = window.prompt(
    "Choose project type:\n\n1 = HTML Site\n2 = React + Vite\n3 = Vue + Vite",
    "1"
  );

  if (!typePrompt) return;

  let type = "html-site";
  const normalized = String(typePrompt).trim().toLowerCase();

  if (normalized === "2" || normalized === "react" || normalized === "react-vite") {
    type = "react-vite";
  } else if (normalized === "3" || normalized === "vue" || normalized === "vue-vite") {
    type = "vue-vite";
  }

  try {
    const data = await fetchJson("/api/projects/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type }),
    });

    const project = data?.project;

    if (project?.id) {
      selectedProjectId = project.id;
      selectedProjectRoot = project.rootPath;
      selectedFolderPath = project.rootPath;
      selectedFilePath = "";
    }

    setStatus(`Project created successfully (${getProjectTypeLabel(type)}).`, "ok");
    await refreshWorkspace();
  } catch (error) {
    setStatus(error?.message || error, "bad");
  }
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

async function createFolderFromPrompt() {
  if (!selectedProjectRoot) {
    setStatus("Create or select a project first.", "bad");
    return;
  }

  const baseFolder = selectedFolderPath || selectedProjectRoot;
  const name = window.prompt(`Create new folder inside "${baseFolder}"\n\nFolder name:`);

  if (!name) return;

  try {
    const data = await fetchJson("/api/nodes/create-folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentPath: baseFolder,
        name,
      }),
    });

    const node = data?.node;

    if (node?.path) {
      selectedFolderPath = node.path;
      selectedFilePath = "";
      collapsedFolders.delete(node.path);
    }

    setStatus("Folder created successfully.", "ok");
    await loadNodes();
  } catch (error) {
    setStatus(error?.message || error, "bad");
  }
}

async function createFileFromPrompt() {
  if (!selectedProjectRoot) {
    setStatus("Create or select a project first.", "bad");
    return;
  }

  const baseFolder = selectedFolderPath || selectedProjectRoot;
  const selectedProject = getProjectById(selectedProjectId);
  const defaultFileName = getDefaultFileNameForProject(selectedProject?.type);

  const name = window.prompt(
    `Create new file inside "${baseFolder}"\n\nFile name:`,
    defaultFileName
  );

  if (!name) return;

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

    setStatus("File created successfully.", "ok");
    await loadNodes();

    if (node?.path) {
      const createdNode = getNodeByPath(node.path);

      if (createdNode) {
        openFile(createdNode);
      }
    }
  } catch (error) {
    setStatus(error?.message || error, "bad");
  }
}

async function renameSelectedNodeFromPrompt() {
  const target = getActionTarget();

  if (!target) {
    setStatus("Select a file or folder to rename.", "bad");
    return;
  }

  const label = target.kind === "folder" ? "folder" : "file";
  const newName = window.prompt(
    `Rename ${label}\n\nCurrent name: ${target.name}\nNew name:`,
    target.name
  );

  if (!newName || newName === target.name) return;

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

    if (renamedNode?.kind === "file") {
      selectedFilePath = renamedNode.path;
      selectedFolderPath = renamedNode.parentPath || selectedProjectRoot;
    } else if (renamedNode?.kind === "folder") {
      selectedFilePath = "";
      selectedFolderPath = renamedNode.path;
    }

    setStatus(`${label} renamed successfully.`, "ok");
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
    setStatus(error?.message || error, "bad");
  }
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

    const publishedUrl = getPublishedUrl();

    if (publishedUrl && statusEl) {
      statusEl.innerHTML = `<span class="ok">File saved successfully.</span> <a href="${escapeHtml(
        publishedUrl
      )}" target="_blank" style="color:#93c5fd; text-decoration:none;">Open published page</a>`;
    } else {
      setStatus("File saved successfully.", "ok");
    }

    renderPreview();
    await loadNodes();
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

    const projectBtn = target.closest("[data-project-id]");

    if (!(projectBtn instanceof HTMLElement)) return;

    const projectId = projectBtn.getAttribute("data-project-id");
    const project = projectId ? getProjectById(projectId) : null;

    if (project) {
      selectProject(project);
    }
  });

  nodesTreeEl?.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) return;

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