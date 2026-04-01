import type { APIRoute } from "astro";
import fs from "fs/promises";
import path from "path";

export const prerender = false;

type BuilderNode = {
  path: string;
  name: string;
  parentPath: string;
  kind: "folder" | "file";
  fileType?: "html" | "css" | "js" | "txt";
  content?: string;
  createdAt?: string;
  updatedAt?: string;
};

const nodesPath = path.join(process.cwd(), "data", "nodes.json");

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

function detectFileType(fileName: string, fallback?: string) {
  const ext = String(fileName || "").split(".").pop()?.toLowerCase();

  if (ext === "html") return "html";
  if (ext === "css") return "css";
  if (ext === "js") return "js";

  if (fallback === "html" || fallback === "css" || fallback === "js" || fallback === "txt") {
    return fallback;
  }

  return "txt";
}

function normalizeNode(raw: any): BuilderNode | null {
  const safePath = sanitizeNodePath(raw?.path || "");
  if (!safePath) return null;

  const kind = raw?.kind === "folder" ? "folder" : "file";

  if (kind === "folder") {
    return {
      path: safePath,
      name: raw?.name || getNodeName(safePath),
      parentPath: getParentPath(safePath),
      kind: "folder",
      createdAt: raw?.createdAt,
      updatedAt: raw?.updatedAt,
    };
  }

  return {
    path: safePath,
    name: raw?.name || getNodeName(safePath),
    parentPath: getParentPath(safePath),
    kind: "file",
    fileType: detectFileType(raw?.name || getNodeName(safePath), raw?.fileType),
    content: String(raw?.content || ""),
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

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
  for (let i = rootParts.length; i <= folderParts.length; i++) {
    chain.push(folderParts.slice(0, i).join("/"));
  }

  return chain;
}

function collectAssetNodes(nodes: BuilderNode[], projectRoot: string, pageFolderPath: string) {
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

export const GET: APIRoute = async ({ params }) => {
  const requestedPath = sanitizeNodePath(String(params.path || ""));
  const nodes = await readNodes();

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

  if (!htmlNode || !pageFolderPath) {
    return new Response(
      renderNotFound("No HTML page was found for this published route.", requestedPath),
      { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const { cssNodes, jsNodes } = collectAssetNodes(nodes, projectRootFolder.path, pageFolderPath);

  const cssContent = cssNodes.map((node) => String(node.content || "")).join("\n\n");
  const jsContent = jsNodes.map((node) => safeScriptContent(String(node.content || ""))).join("\n\n");
  const htmlContent = String(htmlNode.content || "");

  const pageTitle = pageFolderPath || requestedPath || "Site";
  const baseHref = pageFolderPath ? `/site/${pageFolderPath}/` : "/site/";

  const doc = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(pageTitle)}</title>
    <base href="${escapeHtml(baseHref)}" />
    <style>${cssContent}</style>
  </head>
  <body>
    ${htmlContent}
    <script>${jsContent}<\/script>
  </body>
</html>`;

  return new Response(doc, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
};