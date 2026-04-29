import type { APIRoute } from "astro";
import fs from "fs/promises";
import path from "path";
import { startPreviewServer } from "../../lib/preview-server.js";
import { syncProjectPreviewWorkspace } from "../../lib/preview-workspace.js";

export const prerender = false;

type ProjectType = "html-site" | "react-vite" | "vue-vite";

type BuilderNode = {
  path: string;
  name: string;
  parentPath: string;
  kind: "folder" | "file";
  fileType?: string;
  content?: string;
};

type ProjectRecord = {
  id: string;
  name: string;
  rootPath: string;
  type?: ProjectType;
};

const dataDir = path.join(process.cwd(), "data");
const nodesPath = path.join(dataDir, "nodes.json");
const projectsPath = path.join(dataDir, "projects.json");

function htmlResponse(html: string, status = 200) {
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeStyleContent(value: unknown) {
  return String(value ?? "").replace(/<\/style/gi, "<\\/style");
}

function safeScriptContent(value: unknown) {
  return String(value ?? "").replace(/<\/script/gi, "<\\/script");
}

function sanitizePath(input: string) {
  return String(input || "")
    .split("/")
    .map((part) =>
      part
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^\.+|\.+$/g, "")
        .replace(/^[-_]+|[-_]+$/g, "")
    )
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
}

function getExtension(fileName: string) {
  const name = String(fileName || "").toLowerCase();
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1) : "";
}

function detectFileType(fileName: string, fallback?: string) {
  const ext = getExtension(fileName);

  if (ext === "html" || ext === "htm") return "html";
  if (ext === "css" || ext === "scss" || ext === "less") return "css";
  if (ext === "js" || ext === "mjs" || ext === "cjs") return "js";
  if (ext === "jsx") return "jsx";
  if (ext === "ts") return "ts";
  if (ext === "tsx") return "tsx";
  if (ext === "vue") return "vue";
  if (ext === "json") return "json";
  if (ext === "md" || ext === "mdx") return "md";

  if (fallback) return fallback;

  return "txt";
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function readProjects() {
  const projects = await readJsonFile<ProjectRecord[]>(projectsPath, []);
  return Array.isArray(projects) ? projects : [];
}

async function readNodes() {
  const nodes = await readJsonFile<BuilderNode[]>(nodesPath, []);
  return Array.isArray(nodes) ? nodes : [];
}

function isFrameworkProject(project?: ProjectRecord | null) {
  return project?.type === "react-vite" || project?.type === "vue-vite";
}

function getNodeByPath(nodes: BuilderNode[], nodePath: string) {
  return nodes.find((node) => node.path === nodePath);
}

function getFilesInFolder(nodes: BuilderNode[], folderPath: string) {
  return nodes.filter((node) => node.kind === "file" && node.parentPath === folderPath);
}

function getFolderChain(projectRoot: string, folderPath: string) {
  if (!projectRoot || !folderPath) return [];

  if (!(folderPath === projectRoot || folderPath.startsWith(`${projectRoot}/`))) {
    return [];
  }

  const rootParts = projectRoot.split("/").filter(Boolean);
  const folderParts = folderPath.split("/").filter(Boolean);

  const chain: string[] = [];

  for (let i = rootParts.length; i <= folderParts.length; i += 1) {
    chain.push(folderParts.slice(0, i).join("/"));
  }

  return chain;
}

function collectHtmlAssets(nodes: BuilderNode[], projectRoot: string, previewFolderPath: string) {
  const chain = getFolderChain(projectRoot, previewFolderPath);
  const seen = new Set<string>();

  const cssNodes: BuilderNode[] = [];
  const jsNodes: BuilderNode[] = [];

  for (const folderPath of chain) {
    const folderFiles = getFilesInFolder(nodes, folderPath);

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

  return {
    cssNodes,
    jsNodes,
  };
}

function injectIntoHead(html: string, content: string) {
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

function injectBeforeBodyEnd(html: string, content: string) {
  const source = String(html || "");

  if (source.match(/<\/body>/i)) {
    return source.replace(/<\/body>/i, `${content}\n</body>`);
  }

  return `${source}\n${content}`;
}

function buildHtmlProjectDocument(options: {
  nodes: BuilderNode[];
  projectRoot: string;
  requestedPath: string;
}) {
  const { nodes, projectRoot } = options;
  const requestedPath = sanitizePath(options.requestedPath || projectRoot);

  const exactNode = getNodeByPath(nodes, requestedPath);
  const htmlFileNode = getNodeByPath(nodes, `${requestedPath}.html`);

  let htmlNode: BuilderNode | null = null;
  let previewFolderPath = requestedPath;

  if (exactNode?.kind === "file" && detectFileType(exactNode.name, exactNode.fileType) === "html") {
    htmlNode = exactNode;
    previewFolderPath = exactNode.parentPath || projectRoot;
  } else if (
    htmlFileNode?.kind === "file" &&
    detectFileType(htmlFileNode.name, htmlFileNode.fileType) === "html"
  ) {
    htmlNode = htmlFileNode;
    previewFolderPath = htmlFileNode.parentPath || projectRoot;
  } else {
    const folderFiles = getFilesInFolder(nodes, requestedPath);

    htmlNode =
      folderFiles.find(
        (node) => detectFileType(node.name, node.fileType) === "html" && node.name === "index.html"
      ) ||
      folderFiles.find((node) => detectFileType(node.name, node.fileType) === "html") ||
      null;

    previewFolderPath = requestedPath;
  }

  const title = previewFolderPath || projectRoot || "Published Page";

  if (!htmlNode || !String(htmlNode.content || "").trim()) {
    return buildNotFoundPage(
      "HTML page not found",
      `No HTML file was found for: /site/${requestedPath}`
    );
  }

  const { cssNodes, jsNodes } = collectHtmlAssets(nodes, projectRoot, previewFolderPath);

  const cssContent = cssNodes.map((node) => String(node.content || "")).join("\n\n");
  const jsContent = jsNodes.map((node) => String(node.content || "")).join("\n\n");
  const htmlContent = String(htmlNode.content || "");

  const baseHref = `/site/${previewFolderPath}/`;

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

  const looksLikeFullDocument =
    /<html[\s>]/i.test(htmlContent) || /<!doctype/i.test(htmlContent);

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

function buildFrameworkPublishedPage(options: {
  project: ProjectRecord;
  viteUrl: string;
}) {
  const { project, viteUrl } = options;
  const projectTypeLabel =
    project.type === "vue-vite" ? "Vue + Vite Published Preview" : "React + Vite Published Preview";

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(project.name)} | Published Preview</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, system-ui, Arial, sans-serif;
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        width: 100%;
        min-height: 100%;
        margin: 0;
        background: #0f172a;
      }

      body {
        overflow: hidden;
      }

      .published-shell {
        width: 100vw;
        height: 100vh;
        display: grid;
        grid-template-rows: 44px minmax(0, 1fr);
        background: #0f172a;
      }

      .published-bar {
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 0 16px;
        border-bottom: 1px solid rgba(148, 163, 184, 0.18);
        background: rgba(15, 23, 42, 0.96);
        color: #e5e7eb;
      }

      .published-title {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
        font-weight: 800;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .published-dot {
        width: 9px;
        height: 9px;
        border-radius: 999px;
        background: #22c55e;
        box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.14);
      }

      .published-meta {
        color: #94a3b8;
        font-size: 12px;
        font-weight: 700;
      }

      iframe {
        width: 100%;
        height: 100%;
        border: 0;
        background: white;
      }
    </style>
  </head>

  <body>
    <main class="published-shell">
      <header class="published-bar">
        <div class="published-title">
          <span class="published-dot"></span>
          <span>${escapeHtml(project.name)}</span>
        </div>
        <div class="published-meta">${escapeHtml(projectTypeLabel)}</div>
      </header>

      <iframe
        src="${escapeHtml(viteUrl)}"
        title="${escapeHtml(project.name)} published preview"
        allow="cross-origin-isolated"
      ></iframe>
    </main>
  </body>
</html>`;
}

function buildNotFoundPage(title: string, message: string) {
  return `
<!DOCTYPE html>
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
        padding: 24px;
        background: #0f172a;
        color: #e5e7eb;
        font-family: system-ui, Arial, sans-serif;
      }

      .card {
        width: min(760px, 100%);
        padding: 24px;
        border: 1px solid rgba(148, 163, 184, 0.24);
        border-radius: 18px;
        background: rgba(15, 23, 42, 0.86);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.32);
      }

      h1 {
        margin: 0 0 10px;
        color: #ffffff;
        font-size: 24px;
      }

      p {
        margin: 0;
        color: #94a3b8;
        line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
    </div>
  </body>
</html>`;
}

function buildErrorPage(title: string, error: unknown) {
  const message = error instanceof Error ? error.stack || error.message : String(error);

  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        padding: 28px;
        background: #0f172a;
        color: #fee2e2;
        font-family: Consolas, Menlo, Monaco, monospace;
      }

      .error {
        border: 1px solid rgba(248, 113, 113, 0.45);
        border-radius: 18px;
        background: rgba(127, 29, 29, 0.4);
        padding: 24px;
      }

      h1 {
        margin: 0 0 18px;
        font-family: system-ui, Arial, sans-serif;
        color: #fecaca;
        font-size: 22px;
      }

      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.55;
      }
    </style>
  </head>
  <body>
    <section class="error">
      <h1>${escapeHtml(title)}</h1>
      <pre>${escapeHtml(message)}</pre>
    </section>
  </body>
</html>`;
}

export const GET: APIRoute = async ({ params }) => {
  try {
    const requestedPath = sanitizePath(params.path || "");

    if (!requestedPath) {
      return htmlResponse(
        buildNotFoundPage("Project not found", "Missing project path."),
        404
      );
    }

    const rootPath = requestedPath.split("/").filter(Boolean)[0];

    if (!rootPath) {
      return htmlResponse(
        buildNotFoundPage("Project not found", "Missing project root."),
        404
      );
    }

    const [projects, nodes] = await Promise.all([readProjects(), readNodes()]);

    const project = projects.find(
      (item) => item.rootPath === rootPath || item.id === rootPath
    );

    if (!project) {
      return htmlResponse(
        buildNotFoundPage("Project not found", `No project found for: ${rootPath}`),
        404
      );
    }

    if (isFrameworkProject(project)) {
      const workspace = await syncProjectPreviewWorkspace({
        projectRoot: project.rootPath,
        clean: true,
      });

      const server = await startPreviewServer({
        projectRoot: workspace.projectRoot,
        workspaceDir: workspace.workspaceDir,
        projectType: workspace.projectType,
      });

      return htmlResponse(
        buildFrameworkPublishedPage({
          project,
          viteUrl: server.url,
        })
      );
    }

    const html = buildHtmlProjectDocument({
      nodes,
      projectRoot: project.rootPath,
      requestedPath,
    });

    return htmlResponse(html);
  } catch (error) {
    return htmlResponse(buildErrorPage("Published preview error", error), 500);
  }
};