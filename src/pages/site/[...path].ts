import type { APIRoute } from "astro";
import fs from "fs/promises";
import path from "path";

export const prerender = false;

type ProjectType = "html-site" | "react-vite" | "vue-vite";

type BuilderNode = {
  path: string;
  name: string;
  parentPath: string;
  kind: "folder" | "file";
  fileType?: string;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ProjectRecord = {
  id: string;
  name: string;
  rootPath: string;
  type?: ProjectType;
  createdAt?: string;
  updatedAt?: string;
};

const dataDir = path.join(process.cwd(), "data");
const nodesPath = path.join(dataDir, "nodes.json");
const projectsPath = path.join(dataDir, "projects.json");

function sanitizeNodePart(input: string) {
  const value = String(input || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+|\.+$/g, "")
    .replace(/^[-_]+|[-_]+$/g, "");

  if (value === "." || value === "..") return "";
  return value;
}

function sanitizeNodePath(input: string) {
  return String(input || "")
    .split("/")
    .map((part) => sanitizeNodePart(part))
    .filter(Boolean)
    .join("/");
}

function getNodeName(nodePath: string) {
  const parts = sanitizeNodePath(nodePath).split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

function getParentPath(nodePath: string) {
  const parts = sanitizeNodePath(nodePath).split("/").filter(Boolean);
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join("/");
}

function getFileExtension(fileName: string) {
  const name = String(fileName || "").toLowerCase();
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1) : "";
}

function detectFileType(fileName: string, fallback?: string) {
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

  const allowed = ["html", "css", "js", "jsx", "ts", "tsx", "vue", "json", "md", "txt"];
  return allowed.includes(String(fallback || "")) ? String(fallback) : "txt";
}

function normalizeNode(raw: any): BuilderNode | null {
  const safePath = sanitizeNodePath(raw?.path || "");
  if (!safePath) return null;

  const kind = raw?.kind === "folder" ? "folder" : "file";
  const name = raw?.name || getNodeName(safePath);

  if (kind === "folder") {
    return {
      path: safePath,
      name,
      parentPath: getParentPath(safePath),
      kind: "folder",
      createdAt: raw?.createdAt,
      updatedAt: raw?.updatedAt,
    };
  }

  return {
    path: safePath,
    name,
    parentPath: getParentPath(safePath),
    kind: "file",
    fileType: detectFileType(name, raw?.fileType),
    content: String(raw?.content || ""),
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
  };
}

function normalizeProject(raw: any): ProjectRecord | null {
  const rootPath = sanitizeNodePart(raw?.rootPath || raw?.id || raw?.name || "");
  if (!rootPath) return null;

  const type = String(raw?.type || "html-site") as ProjectType;
  const safeType: ProjectType =
    type === "react-vite" || type === "vue-vite" || type === "html-site"
      ? type
      : "html-site";

  return {
    id: rootPath,
    name: String(raw?.name || rootPath),
    rootPath,
    type: safeType,
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
  };
}

async function readNodes(): Promise<BuilderNode[]> {
  try {
    const raw = await fs.readFile(nodesPath, "utf-8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => normalizeNode(item))
      .filter(Boolean) as BuilderNode[];
  } catch {
    return [];
  }
}

async function readProjects(): Promise<ProjectRecord[]> {
  try {
    const raw = await fs.readFile(projectsPath, "utf-8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => normalizeProject(item))
      .filter(Boolean) as ProjectRecord[];
  } catch {
    return [];
  }
}

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeStyleContent(value: string) {
  return String(value || "").replace(/<\/style/gi, "<\\/style");
}

function safeScriptContent(value: string) {
  return String(value || "").replace(/<\/script/gi, "<\\/script");
}

function renderNotFound(message: string, requestedPath: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Not Found</title>
    <style>
      body {
        font-family: system-ui, Arial, sans-serif;
        background: #f8fafc;
        margin: 0;
        padding: 40px 16px;
        color: #0f172a;
      }
      .card {
        max-width: 900px;
        margin: 0 auto;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 14px;
        padding: 24px;
      }
      .muted {
        color: #64748b;
      }
      code {
        background: #e2e8f0;
        padding: 2px 6px;
        border-radius: 6px;
      }
      a {
        color: #2563eb;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>404 - Page not found</h1>
      <p>${escapeHtml(message)}</p>
      <p class="muted">Requested path: <code>${escapeHtml(requestedPath || "/")}</code></p>
      <p><a href="/builder">Go to builder</a></p>
    </div>
  </body>
</html>`;
}

function renderRuntimeError(title: string, message: string) {
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
      .error-card {
        width: min(900px, 100%);
        border: 1px solid rgba(248, 113, 113, 0.35);
        border-radius: 18px;
        background: rgba(127, 29, 29, 0.22);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
        padding: 24px;
      }
      h1 {
        margin: 0 0 10px;
        color: #fecaca;
      }
      pre {
        white-space: pre-wrap;
        word-break: break-word;
        background: rgba(0, 0, 0, 0.28);
        border-radius: 12px;
        padding: 16px;
        color: #fee2e2;
      }
      a {
        color: #93c5fd;
      }
    </style>
  </head>
  <body>
    <div class="error-card">
      <h1>${escapeHtml(title)}</h1>
      <pre>${escapeHtml(message)}</pre>
      <p><a href="/builder">Back to Builder</a></p>
    </div>
  </body>
</html>`;
}

function getFolderChain(projectRoot: string, folderPath: string) {
  const safeProjectRoot = sanitizeNodePath(projectRoot);
  const safeFolderPath = sanitizeNodePath(folderPath);

  if (!safeProjectRoot || !safeFolderPath) return [];
  if (!(safeFolderPath === safeProjectRoot || safeFolderPath.startsWith(`${safeProjectRoot}/`))) {
    return [];
  }

  const rootParts = safeProjectRoot.split("/").filter(Boolean);
  const folderParts = safeFolderPath.split("/").filter(Boolean);

  const chain: string[] = [];

  for (let i = rootParts.length; i <= folderParts.length; i += 1) {
    chain.push(folderParts.slice(0, i).join("/"));
  }

  return chain;
}

function collectHtmlAssetNodes(nodes: BuilderNode[], projectRoot: string, pageFolderPath: string) {
  const chain = getFolderChain(projectRoot, pageFolderPath);
  const seen = new Set<string>();
  const cssNodes: BuilderNode[] = [];
  const jsNodes: BuilderNode[] = [];

  for (const folderPath of chain) {
    const folderFiles = nodes.filter(
      (node) => node.kind === "file" && node.parentPath === folderPath
    );

    const candidates =
      folderPath === pageFolderPath
        ? folderFiles.filter((node) => {
            const type = detectFileType(node.name, node.fileType);
            return type === "css" || type === "js";
          })
        : folderFiles.filter(
            (node) => node.name === "style.css" || node.name === "script.js"
          );

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

function collectProjectCssNodes(nodes: BuilderNode[], projectRoot: string) {
  const seen = new Set<string>();

  return nodes.filter((node) => {
    if (node.kind !== "file") return false;
    if (!(node.path === projectRoot || node.path.startsWith(`${projectRoot}/`))) return false;
    if (detectFileType(node.name, node.fileType) !== "css") return false;
    if (seen.has(node.path)) return false;

    seen.add(node.path);
    return true;
  });
}

function findFile(nodes: BuilderNode[], filePath: string) {
  const safePath = sanitizeNodePath(filePath);

  return nodes.find(
    (node) => node.kind === "file" && node.path === safePath
  );
}

function findProjectFile(nodes: BuilderNode[], projectRoot: string, candidates: string[]) {
  for (const candidate of candidates) {
    const node = findFile(nodes, `${projectRoot}/${candidate}`);
    if (node) return node;
  }

  return undefined;
}

function inferProjectType(project: ProjectRecord | undefined, nodes: BuilderNode[], projectRoot: string): ProjectType {
  if (project?.type === "react-vite" || project?.type === "vue-vite" || project?.type === "html-site") {
    return project.type;
  }

  const hasReactFiles = Boolean(
    findProjectFile(nodes, projectRoot, [
      "src/main.jsx",
      "src/main.tsx",
      "src/app.jsx",
      "src/app.tsx",
    ])
  );

  if (hasReactFiles) return "react-vite";

  const hasVueFiles = Boolean(
    findProjectFile(nodes, projectRoot, [
      "src/main.js",
      "src/main.ts",
      "src/app.vue",
    ])
  );

  if (hasVueFiles) return "vue-vite";

  return "html-site";
}

function removeHtmlScripts(html: string) {
  return String(html || "").replace(/<script[\s\S]*?<\/script>/gi, "");
}

function injectIntoHead(html: string, content: string) {
  const source = String(html || "");

  if (source.match(/<\/head>/i)) {
    return source.replace(/<\/head>/i, `${content}\n</head>`);
  }

  if (source.match(/<html[^>]*>/i)) {
    return source.replace(/<html[^>]*>/i, (match) => `${match}\n<head>${content}</head>`);
  }

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    ${content}
  </head>
  <body>
    ${source}
  </body>
</html>`;
}

function injectBeforeBodyEnd(html: string, content: string) {
  const source = String(html || "");

  if (source.match(/<\/body>/i)) {
    return source.replace(/<\/body>/i, `${content}\n</body>`);
  }

  return `${source}\n${content}`;
}

function ensureMountElement(html: string, mountId: string) {
  const mountRegex = new RegExp(`<div\\b([^>]*\\bid=(["'])${mountId}\\2[^>]*)>[\\s\\S]*?<\\/div>`, "i");

  if (mountRegex.test(html)) {
    return html.replace(mountRegex, `<div id="${mountId}"></div>`);
  }

  return injectBeforeBodyEnd(html, `<div id="${mountId}"></div>`);
}

function getHtmlRouteTarget(nodes: BuilderNode[], requestedPath: string) {
  const exactFolder = nodes.find(
    (node) => node.kind === "folder" && node.path === requestedPath
  );

  const exactHtmlFile = nodes.find(
    (node) =>
      node.kind === "file" &&
      node.path === `${requestedPath}.html` &&
      detectFileType(node.name, node.fileType) === "html"
  );

  const directHtmlFile = nodes.find(
    (node) =>
      node.kind === "file" &&
      node.path === requestedPath &&
      detectFileType(node.name, node.fileType) === "html"
  );

  let pageFolderPath = "";
  let htmlNode: BuilderNode | undefined;

  if (directHtmlFile) {
    htmlNode = directHtmlFile;
    pageFolderPath = directHtmlFile.parentPath;
  } else if (exactHtmlFile) {
    htmlNode = exactHtmlFile;
    pageFolderPath = exactHtmlFile.parentPath;
  } else if (exactFolder) {
    pageFolderPath = exactFolder.path;

    const folderFiles = nodes.filter(
      (node) => node.kind === "file" && node.parentPath === pageFolderPath
    );

    htmlNode =
      folderFiles.find(
        (node) =>
          detectFileType(node.name, node.fileType) === "html" &&
          node.name === "index.html"
      ) ||
      folderFiles.find(
        (node) => detectFileType(node.name, node.fileType) === "html"
      );
  }

  return { pageFolderPath, htmlNode };
}

function buildHtmlPublishedDocument(nodes: BuilderNode[], projectRoot: string, requestedPath: string) {
  const { pageFolderPath, htmlNode } = getHtmlRouteTarget(nodes, requestedPath);

  if (!htmlNode || !pageFolderPath) {
    return {
      status: 404,
      html: renderNotFound("No HTML page was found for this published route.", requestedPath),
    };
  }

  const { cssNodes, jsNodes } = collectHtmlAssetNodes(nodes, projectRoot, pageFolderPath);

  const cssContent = cssNodes.map((node) => String(node.content || "")).join("\n\n");
  const jsContent = jsNodes.map((node) => safeScriptContent(String(node.content || ""))).join("\n\n");
  const htmlContent = String(htmlNode.content || "");

  const pageTitle = pageFolderPath || requestedPath || "Site";
  const baseHref = pageFolderPath ? `/site/${pageFolderPath}/` : "/site/";

  const looksLikeFullDocument = /<html[\s>]/i.test(htmlContent) || /<!doctype/i.test(htmlContent);

  const headAssets = `
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(pageTitle)}</title>
<base href="${escapeHtml(baseHref)}" />
<style>${safeStyleContent(cssContent)}</style>`;

  const scriptAsset = `<script>${jsContent}<\/script>`;

  if (looksLikeFullDocument) {
    return {
      status: 200,
      html: injectBeforeBodyEnd(injectIntoHead(htmlContent, headAssets), scriptAsset),
    };
  }

  return {
    status: 200,
    html: `<!DOCTYPE html>
<html lang="en">
  <head>
    ${headAssets}
  </head>
  <body>
    ${htmlContent}
    ${scriptAsset}
  </body>
</html>`,
  };
}

function buildVirtualFiles(nodes: BuilderNode[], projectRoot: string) {
  const files: Record<string, string> = {};

  for (const node of nodes) {
    if (node.kind !== "file") continue;
    if (!(node.path === projectRoot || node.path.startsWith(`${projectRoot}/`))) continue;

    const type = detectFileType(node.name, node.fileType);

    if (["js", "jsx", "ts", "tsx"].includes(type)) {
      files[node.path] = String(node.content || "");
    }
  }

  return files;
}

function getReactRuntimeScript(projectRoot: string, entryPath: string, appPath: string, virtualFiles: Record<string, string>) {
  const safeFiles = safeScriptContent(JSON.stringify(virtualFiles));
  const safeEntryPath = safeScriptContent(JSON.stringify(entryPath));
  const safeAppPath = safeScriptContent(JSON.stringify(appPath));
  const safeProjectRoot = safeScriptContent(JSON.stringify(projectRoot));

  return `
<script>
(function () {
  const FILES = ${safeFiles};
  const ENTRY_PATH = ${safeEntryPath};
  const APP_PATH = ${safeAppPath};
  const PROJECT_ROOT = ${safeProjectRoot};
  const cache = {};

  function showError(title, error) {
    const root = document.getElementById("root") || document.body;
    const message = error && (error.stack || error.message) ? (error.stack || error.message) : String(error || "Unknown error");

    root.innerHTML =
      '<div style="font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; margin: 24px; padding: 20px; border-radius: 16px; border: 1px solid rgba(248,113,113,.45); background: #450a0a; color: #fee2e2;">' +
      '<div style="font-family: system-ui, Arial, sans-serif; font-size: 18px; font-weight: 800; margin-bottom: 12px;">' + escapeHtml(title) + '</div>' +
      '<pre style="white-space: pre-wrap; word-break: break-word; margin: 0;">' + escapeHtml(message) + '</pre>' +
      '</div>';
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizePath(value) {
    const parts = String(value || "").split("/");
    const result = [];

    for (const part of parts) {
      if (!part || part === ".") continue;
      if (part === "..") {
        result.pop();
        continue;
      }
      result.push(part.toLowerCase());
    }

    return result.join("/");
  }

  function dirname(filePath) {
    const parts = normalizePath(filePath).split("/");
    parts.pop();
    return parts.join("/");
  }

  function namedToDestructuring(value) {
    return String(value || "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const pieces = part.split(/\\s+as\\s+/i).map((item) => item.trim());
        return pieces.length === 2 ? pieces[0] + ": " + pieces[1] : pieces[0];
      })
      .join(", ");
  }

  function resolveLocalPath(specifier, fromPath) {
    const base = normalizePath(dirname(fromPath) + "/" + specifier);

    const candidates = [
      base,
      base + ".jsx",
      base + ".js",
      base + ".tsx",
      base + ".ts",
      base + "/index.jsx",
      base + "/index.js",
      base + "/index.tsx",
      base + "/index.ts",
    ];

    for (const candidate of candidates) {
      if (FILES[candidate] !== undefined) return candidate;
    }

    throw new Error('Cannot resolve import "' + specifier + '" from "' + fromPath + '"');
  }

  function rewriteImportClause(clause, specifier, filePath, index) {
    const trimmedClause = String(clause || "").trim();

    if (specifier === "react") {
      if (trimmedClause === "React") return "";
      if (trimmedClause.startsWith("{")) {
        return "const " + trimmedClause.replace(/\\bas\\b/g, ":") + " = React;";
      }
      if (trimmedClause.includes("{")) {
        const named = trimmedClause.match(/\\{([\\s\\S]+)\\}/);
        return named ? "const { " + namedToDestructuring(named[1]) + " } = React;" : "";
      }
      return "";
    }

    if (specifier === "react-dom/client" || specifier === "react-dom") {
      if (trimmedClause.startsWith("{")) {
        return "const " + trimmedClause.replace(/\\bas\\b/g, ":") + " = ReactDOM;";
      }
      return "";
    }

    if (specifier.endsWith(".css")) {
      return "";
    }

    if (!specifier.startsWith(".")) {
      throw new Error('External package import "' + specifier + '" is not supported in published preview yet.');
    }

    const moduleVar = "__mod_" + index;

    if (trimmedClause.startsWith("{")) {
      const named = trimmedClause.slice(1, -1);
      return "const " + moduleVar + " = __import('" + specifier + "');\\nconst { " + namedToDestructuring(named) + " } = " + moduleVar + ";";
    }

    if (trimmedClause.startsWith("* as ")) {
      const namespaceName = trimmedClause.replace("* as ", "").trim();
      return "const " + namespaceName + " = __import('" + specifier + "');";
    }

    if (trimmedClause.includes(",")) {
      const defaultName = trimmedClause.split(",")[0].trim();
      const namedMatch = trimmedClause.match(/\\{([\\s\\S]+)\\}/);
      const named = namedMatch ? namedMatch[1] : "";

      return "const " + moduleVar + " = __import('" + specifier + "');\\n" +
        "const " + defaultName + " = " + moduleVar + ".default || " + moduleVar + ";\\n" +
        "const { " + namedToDestructuring(named) + " } = " + moduleVar + ";";
    }

    return "const " + moduleVar + " = __import('" + specifier + "');\\nconst " + trimmedClause + " = " + moduleVar + ".default || " + moduleVar + ";";
  }

  function rewriteExports(source) {
    let output = String(source || "");

    output = output.replace(/export\\s+default\\s+function\\s+([A-Za-z_$][\\w$]*)\\s*\\(/g, "module.exports.default = function $1(");
    output = output.replace(/export\\s+default\\s+function\\s*\\(/g, "module.exports.default = function (");
    output = output.replace(/export\\s+default\\s+class\\s+([A-Za-z_$][\\w$]*)/g, "module.exports.default = class $1");
    output = output.replace(/export\\s+default\\s+([^;]+);?/g, "module.exports.default = $1;");

    output = output.replace(/export\\s+function\\s+([A-Za-z_$][\\w$]*)\\s*\\(/g, "exports.$1 = function $1(");
    output = output.replace(/export\\s+const\\s+([A-Za-z_$][\\w$]*)\\s*=/g, "const $1 = exports.$1 = ");
    output = output.replace(/export\\s+let\\s+([A-Za-z_$][\\w$]*)\\s*=/g, "let $1 = exports.$1 = ");
    output = output.replace(/export\\s+var\\s+([A-Za-z_$][\\w$]*)\\s*=/g, "var $1 = exports.$1 = ");

    output = output.replace(/export\\s*\\{([^}]+)\\};?/g, function (_full, names) {
      return String(names)
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const pieces = part.split(/\\s+as\\s+/i).map((item) => item.trim());
          const localName = pieces[0];
          const exportedName = pieces[1] || pieces[0];
          return "exports." + exportedName + " = " + localName + ";";
        })
        .join("\\n");
    });

    return output;
  }

  function transformSource(source, filePath) {
    let importIndex = 0;

    let output = String(source || "");

    output = output.replace(/^\\s*import\\s+["'][^"']+\\.css["'];?\\s*$/gm, "");
    output = output.replace(/^\\s*import\\s+["']([^"']+)["'];?\\s*$/gm, function (_full, specifier) {
      if (specifier.endsWith(".css")) return "";
      if (specifier.startsWith(".")) return "__import('" + specifier + "');";
      return "";
    });

    output = output.replace(/^\\s*import\\s+([\\s\\S]+?)\\s+from\\s+["']([^"']+)["'];?\\s*$/gm, function (_full, clause, specifier) {
      importIndex += 1;
      return rewriteImportClause(clause, specifier, filePath, importIndex);
    });

    output = rewriteExports(output);

    try {
      return Babel.transform(output, {
        presets: [["react", { runtime: "classic" }]],
        sourceType: "script",
        filename: filePath,
      }).code;
    } catch (error) {
      throw new Error("Babel transform failed in " + filePath + ": " + (error.message || error));
    }
  }

  function requireModule(filePath) {
    const resolvedPath = normalizePath(filePath);

    if (cache[resolvedPath]) return cache[resolvedPath].exports;

    const source = FILES[resolvedPath];

    if (source === undefined) {
      throw new Error("Module not found: " + resolvedPath);
    }

    const module = { exports: {} };
    cache[resolvedPath] = module;

    function localImport(specifier) {
      if (specifier === "react") return React;
      if (specifier === "react-dom" || specifier === "react-dom/client") return ReactDOM;
      const dependencyPath = resolveLocalPath(specifier, resolvedPath);
      return requireModule(dependencyPath);
    }

    const code = transformSource(source, resolvedPath);

    try {
      const runner = new Function("React", "ReactDOM", "module", "exports", "__import", code);
      runner(React, ReactDOM, module, module.exports, localImport);
    } catch (error) {
      throw new Error("Runtime error in " + resolvedPath + ": " + (error.stack || error.message || error));
    }

    return module.exports;
  }

  function start() {
    try {
      if (!window.React || !window.ReactDOM || !window.Babel) {
        throw new Error("React preview runtime failed to load. Check your internet connection because the published React preview uses CDN runtime scripts.");
      }

      const rootEl = document.getElementById("root");

      if (!rootEl) {
        throw new Error('React mount element <div id="root"></div> was not found.');
      }

      if (FILES[ENTRY_PATH]) {
        requireModule(ENTRY_PATH);
      }

      if (!rootEl.childNodes.length && FILES[APP_PATH]) {
        const appExports = requireModule(APP_PATH);
        const App = appExports.default || appExports.App;

        if (!App) {
          throw new Error("App component was not exported from " + APP_PATH);
        }

        ReactDOM.createRoot(rootEl).render(React.createElement(App));
      }

      if (!rootEl.childNodes.length) {
        throw new Error("React rendered no content. Check " + ENTRY_PATH + " and " + APP_PATH + ".");
      }
    } catch (error) {
      showError("React published preview error", error);
      console.error(error);
    }
  }

  start();
})();
<\/script>`;
}

function buildReactPublishedDocument(nodes: BuilderNode[], projectRoot: string) {
  const rootHtmlNode = findFile(nodes, `${projectRoot}/index.html`);
  const rootHtmlContent = rootHtmlNode?.content || "";

  const cssNodes = collectProjectCssNodes(nodes, projectRoot);
  const cssContent = cssNodes.map((node) => String(node.content || "")).join("\n\n");

  const entryNode = findProjectFile(nodes, projectRoot, [
    "src/main.jsx",
    "src/main.tsx",
    "src/main.js",
    "src/main.ts",
  ]);

  const appNode = findProjectFile(nodes, projectRoot, [
    "src/app.jsx",
    "src/app.tsx",
    "src/App.jsx",
    "src/App.tsx",
  ]);

  if (!entryNode && !appNode) {
    return {
      status: 404,
      html: renderRuntimeError(
        "React entry file missing",
        "Could not find src/main.jsx or src/app.jsx inside this React project."
      ),
    };
  }

  const virtualFiles = buildVirtualFiles(nodes, projectRoot);
  const entryPath = entryNode?.path || appNode!.path;
  const appPath = appNode?.path || entryPath;

  const headAssets = `
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(projectRoot)}</title>
<base href="/site/${escapeHtml(projectRoot)}/" />
<style>${safeStyleContent(cssContent)}</style>
<script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>`;

  const runtimeScript = getReactRuntimeScript(projectRoot, entryPath, appPath, virtualFiles);

  const baseHtml = rootHtmlContent.trim()
    ? ensureMountElement(removeHtmlScripts(rootHtmlContent), "root")
    : `<!DOCTYPE html>
<html lang="en">
  <head></head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

  return {
    status: 200,
    html: injectBeforeBodyEnd(injectIntoHead(baseHtml, headAssets), runtimeScript),
  };
}

function extractVueTemplate(content: string) {
  const match = String(content || "").match(/<template[^>]*>([\s\S]*?)<\/template>/i);
  return match ? match[1].trim() : "";
}

function extractVueStyles(content: string) {
  const matches = [...String(content || "").matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
  return matches.map((match) => match[1].trim()).join("\n\n");
}

function buildVuePublishedDocument(nodes: BuilderNode[], projectRoot: string) {
  const rootHtmlNode = findFile(nodes, `${projectRoot}/index.html`);
  const rootHtmlContent = rootHtmlNode?.content || "";

  const appNode = findProjectFile(nodes, projectRoot, [
    "src/app.vue",
    "src/App.vue",
  ]);

  if (!appNode) {
    return {
      status: 404,
      html: renderRuntimeError(
        "Vue App.vue missing",
        "Could not find src/App.vue inside this Vue project."
      ),
    };
  }

  const cssNodes = collectProjectCssNodes(nodes, projectRoot);
  const cssContent = cssNodes.map((node) => String(node.content || "")).join("\n\n");
  const vueTemplate = extractVueTemplate(String(appNode.content || ""));
  const vueStyles = extractVueStyles(String(appNode.content || ""));

  const finalCss = [cssContent, vueStyles].filter(Boolean).join("\n\n");

  const headAssets = `
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(projectRoot)}</title>
<base href="/site/${escapeHtml(projectRoot)}/" />
<style>${safeStyleContent(finalCss)}</style>
<script src="https://unpkg.com/vue@3/dist/vue.global.js"><\/script>`;

  const runtimeScript = `
<script>
(function () {
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showError(error) {
    const root = document.getElementById("app") || document.body;
    const message = error && (error.stack || error.message) ? (error.stack || error.message) : String(error || "Unknown error");

    root.innerHTML =
      '<div style="font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; margin: 24px; padding: 20px; border-radius: 16px; border: 1px solid rgba(248,113,113,.45); background: #450a0a; color: #fee2e2;">' +
      '<div style="font-family: system-ui, Arial, sans-serif; font-size: 18px; font-weight: 800; margin-bottom: 12px;">Vue published preview error</div>' +
      '<pre style="white-space: pre-wrap; word-break: break-word; margin: 0;">' + escapeHtml(message) + '</pre>' +
      '</div>';
  }

  try {
    if (!window.Vue) {
      throw new Error("Vue runtime failed to load. Check your internet connection because the published Vue preview uses a CDN runtime script.");
    }

    const rootEl = document.getElementById("app");

    if (!rootEl) {
      throw new Error('Vue mount element <div id="app"></div> was not found.');
    }

    const template = ${safeScriptContent(JSON.stringify(vueTemplate || "<div></div>"))};

    Vue.createApp({
      template
    }).mount("#app");
  } catch (error) {
    showError(error);
    console.error(error);
  }
})();
<\/script>`;

  const baseHtml = rootHtmlContent.trim()
    ? ensureMountElement(removeHtmlScripts(rootHtmlContent), "app")
    : `<!DOCTYPE html>
<html lang="en">
  <head></head>
  <body>
    <div id="app"></div>
  </body>
</html>`;

  return {
    status: 200,
    html: injectBeforeBodyEnd(injectIntoHead(baseHtml, headAssets), runtimeScript),
  };
}

export const GET: APIRoute = async ({ params }) => {
  const requestedPath = sanitizeNodePath(String(params.path || ""));
  const nodes = await readNodes();
  const projects = await readProjects();

  if (!requestedPath) {
    return new Response(
      renderNotFound("No route path was provided.", requestedPath),
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const firstSegment = requestedPath.split("/")[0] || "";

  const projectRootFolder = nodes.find(
    (node) => node.kind === "folder" && node.path === firstSegment
  );

  if (!projectRootFolder) {
    return new Response(
      renderNotFound("Project root was not found.", requestedPath),
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const project = projects.find(
    (item) => item.rootPath === firstSegment || item.id === firstSegment
  );

  const projectType = inferProjectType(project, nodes, firstSegment);

  let result: { status: number; html: string };

  if (projectType === "react-vite") {
    result = buildReactPublishedDocument(nodes, firstSegment);
  } else if (projectType === "vue-vite") {
    result = buildVuePublishedDocument(nodes, firstSegment);
  } else {
    result = buildHtmlPublishedDocument(nodes, firstSegment, requestedPath);
  }

  return new Response(result.html, {
    status: result.status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
};