import type { APIRoute } from "astro";
import {
  readNodes,
  readProjects,
  sanitizeNodePath,
  syncProjectPreviewWorkspace,
  isFrameworkProject,
  type BuilderNode,
  type ProjectType,
} from "../../lib/preview-workspace.js";
import { startPreviewServer } from "../../lib/preview-server.js";

export const prerender = false;

function htmlResponse(content: string, status = 200) {
  return new Response(content, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function escapeHtml(value: unknown) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeStyleContent(value: unknown) {
  return String(value || "").replace(/<\/style/gi, "<\\/style");
}

function safeScriptContent(value: unknown) {
  return String(value || "").replace(/<\/script/gi, "<\\/script");
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
  if (ext === "svelte") return "svelte";
  if (ext === "json") return "json";
  if (ext === "md" || ext === "mdx") return "md";
  if (ext === "astro") return "astro";

  return fallback || "txt";
}

function inferProjectType(projectRoot: string, nodes: BuilderNode[]): ProjectType {
  const projectNodes = nodes.filter(
    (node) => node.path === projectRoot || node.path.startsWith(`${projectRoot}/`)
  );

  const hasReactFile = projectNodes.some((node) => {
    if (node.kind !== "file") return false;

    const type = detectFileType(node.name, node.fileType);
    return type === "jsx" || type === "tsx";
  });

  if (hasReactFile) return "react-vite";

  const hasVueFile = projectNodes.some((node) => {
    if (node.kind !== "file") return false;

    return detectFileType(node.name, node.fileType) === "vue";
  });

  if (hasVueFile) return "vue-vite";

  const hasSvelteFile = projectNodes.some((node) => {
    if (node.kind !== "file") return false;

    return detectFileType(node.name, node.fileType) === "svelte";
  });

  if (hasSvelteFile) return "svelte-vite";

  return "html-site";
}

function getChildrenFiles(nodes: BuilderNode[], folderPath: string) {
  return nodes.filter(
    (node) => node.kind === "file" && node.parentPath === folderPath
  );
}

function getFolderChain(projectRoot: string, folderPath: string) {
  if (!projectRoot || !folderPath) return [];

  const safeProjectRoot = sanitizeNodePath(projectRoot);
  const safeFolderPath = sanitizeNodePath(folderPath);

  if (
    safeFolderPath !== safeProjectRoot &&
    !safeFolderPath.startsWith(`${safeProjectRoot}/`)
  ) {
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

function collectHtmlAssets(
  nodes: BuilderNode[],
  projectRoot: string,
  folderPath: string
) {
  const chain = getFolderChain(projectRoot, folderPath);
  const seen = new Set<string>();

  const cssNodes: BuilderNode[] = [];
  const jsNodes: BuilderNode[] = [];

  for (const currentFolder of chain) {
    const folderFiles = getChildrenFiles(nodes, currentFolder);

    const candidates =
      currentFolder === folderPath
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

  return {
    cssContent: cssNodes.map((node) => String(node.content || "")).join("\n\n"),
    jsContent: jsNodes.map((node) => String(node.content || "")).join("\n\n"),
  };
}

function injectIntoHead(html: string, content: string) {
  const source = String(html || "");

  if (source.match(/<head[^>]*>/i)) {
    return source.replace(/<head[^>]*>/i, (match) => `${match}\n${content}`);
  }

  if (source.match(/<html[^>]*>/i)) {
    return source.replace(
      /<html[^>]*>/i,
      (match) => `${match}\n<head>\n${content}\n</head>`
    );
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

function notFoundShell(path: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Page not found</title>
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
        width: min(680px, 100%);
        border: 1px solid rgba(148, 163, 184, 0.28);
        border-radius: 18px;
        background: rgba(15, 23, 42, 0.88);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
        padding: 24px;
      }

      h1 {
        margin: 0 0 10px;
        color: #f8fafc;
      }

      p {
        margin: 0;
        color: #94a3b8;
        line-height: 1.6;
      }

      code {
        color: #93c5fd;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Page not found</h1>
      <p>No HTML page found for <code>/site/${escapeHtml(path)}</code>.</p>
    </div>
  </body>
</html>`;
}

function buildHtmlSiteResponse(options: {
  requestedPath: string;
  projectRoot: string;
  nodes: BuilderNode[];
}) {
  const { requestedPath, projectRoot, nodes } = options;

  const safeRequestedPath = sanitizeNodePath(requestedPath);
  const projectNodes = nodes.filter(
    (node) => node.path === projectRoot || node.path.startsWith(`${projectRoot}/`)
  );

  const directNode = projectNodes.find((node) => node.path === safeRequestedPath);

  let htmlNode: BuilderNode | null = null;
  let folderPath = safeRequestedPath;

  if (directNode?.kind === "file") {
    const type = detectFileType(directNode.name, directNode.fileType);

    if (type === "html") {
      htmlNode = directNode;
      folderPath = directNode.parentPath || projectRoot;
    }
  }

  if (!htmlNode) {
    htmlNode =
      projectNodes.find(
        (node) =>
          node.kind === "file" &&
          node.path === `${safeRequestedPath}/index.html`
      ) || null;

    folderPath = safeRequestedPath;
  }

  if (!htmlNode) {
    htmlNode =
      projectNodes.find(
        (node) =>
          node.kind === "file" &&
          node.path === `${safeRequestedPath}.html`
      ) || null;

    if (htmlNode) {
      folderPath = htmlNode.parentPath || projectRoot;
    }
  }

  if (!htmlNode && safeRequestedPath === projectRoot) {
    htmlNode =
      projectNodes.find(
        (node) =>
          node.kind === "file" &&
          node.path === `${projectRoot}/index.html`
      ) || null;

    folderPath = projectRoot;
  }

  if (!htmlNode) {
    return htmlResponse(notFoundShell(safeRequestedPath), 404);
  }

  const htmlContent = String(htmlNode.content || "");
  const { cssContent, jsContent } = collectHtmlAssets(nodes, projectRoot, folderPath);

  const baseHref = `/site/${folderPath}/`;

  const headAssets = `
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<base href="${escapeHtml(baseHref)}" />
<style>
${safeStyleContent(cssContent)}
</style>`;

  const scriptAsset = `
<script>
${safeScriptContent(jsContent)}
</script>`;

  const looksLikeFullDocument =
    /<html[\s>]/i.test(htmlContent) || /<!doctype/i.test(htmlContent);

  if (looksLikeFullDocument) {
    return htmlResponse(
      injectBeforeBodyEnd(injectIntoHead(htmlContent, headAssets), scriptAsset)
    );
  }

  return htmlResponse(`<!DOCTYPE html>
<html lang="en">
  <head>
    ${headAssets}
  </head>
  <body>
    ${htmlContent}
    ${scriptAsset}
  </body>
</html>`);
}

function frameworkShell(url: string, label: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(label)}</title>
    <style>
      html,
      body {
        width: 100%;
        height: 100%;
        margin: 0;
        background: #ffffff;
        overflow: hidden;
      }

      iframe {
        width: 100vw;
        height: 100vh;
        display: block;
        border: 0;
        background: #ffffff;
      }
    </style>
  </head>
  <body>
    <iframe
      src="${escapeHtml(url)}"
      title="${escapeHtml(label)}"
    ></iframe>
  </body>
</html>`;
}

function errorShell(title: string, message: string) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
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
        width: min(900px, 100%);
        border: 1px solid rgba(248, 113, 113, 0.38);
        border-radius: 18px;
        background: rgba(127, 29, 29, 0.24);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
        padding: 24px;
      }

      h1 {
        margin: 0 0 12px;
        color: #fecaca;
      }

      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        color: #fee2e2;
        background: rgba(0, 0, 0, 0.24);
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

export const GET: APIRoute = async ({ params }) => {
  try {
    const requestedPath = sanitizeNodePath(String(params.path || ""));

    if (!requestedPath) {
      return htmlResponse(
        errorShell("Missing path", "No site path was provided."),
        400
      );
    }

    const [nodes, projects] = await Promise.all([readNodes(), readProjects()]);

    const parts = requestedPath.split("/").filter(Boolean);
    const projectRoot = parts[0];

    if (!projectRoot) {
      return htmlResponse(
        errorShell("Missing project", "Project root was not found."),
        400
      );
    }

    const project =
      projects.find(
        (item) => item.rootPath === projectRoot || item.id === projectRoot
      ) || null;

    if (!project) {
      return htmlResponse(
        errorShell("Project not found", `Project "${projectRoot}" was not found.`),
        404
      );
    }

    const projectType = project.type || inferProjectType(projectRoot, nodes);

    if (isFrameworkProject(projectType)) {
      const workspace = await syncProjectPreviewWorkspace({
        projectRoot,
        clean: false,
      });

      const preview = await startPreviewServer({
        projectRoot: workspace.projectRoot,
        workspaceDir: workspace.workspaceDir,
        projectType: workspace.projectType,
      });

      const extraPath = parts.slice(1).join("/");
      const basePreviewUrl = preview.url.replace(/\/$/, "");

      const targetUrl = extraPath
        ? `${basePreviewUrl}/${extraPath}`
        : basePreviewUrl;

      return htmlResponse(
        frameworkShell(targetUrl, `${project.name || projectRoot} preview`)
      );
    }

    return buildHtmlSiteResponse({
      requestedPath,
      projectRoot,
      nodes,
    });
  } catch (error: any) {
    return htmlResponse(
      errorShell("Published preview error", error?.message || String(error)),
      500
    );
  }
};