import fs from "fs/promises";
import path from "path";

export type NodeKind = "folder" | "file";
export type FileType = "html" | "css" | "js" | "txt";

export interface BuilderNode {
  path: string;
  name: string;
  parentPath: string;
  kind: NodeKind;
  fileType?: FileType;
  content?: string;
  createdAt: string;
  updatedAt: string;
}

const dataDir = path.join(process.cwd(), "data");
const nodesPath = path.join(dataDir, "nodes.json");

export const NODES_STORE_PATH = nodesPath;

export function sanitizeNodePart(input: string) {
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

export function sanitizeNodePath(input: string) {
  return String(input || "")
    .split("/")
    .map((part) => sanitizeNodePart(part))
    .filter(Boolean)
    .join("/");
}

export function getNodeName(nodePath: string) {
  const parts = sanitizeNodePath(nodePath).split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

export function getParentPath(nodePath: string) {
  const parts = sanitizeNodePath(nodePath).split("/").filter(Boolean);
  if (parts.length <= 1) return "";
  return parts.slice(0, -1).join("/");
}

export function detectFileType(fileName: string, fallback?: string): FileType {
  const ext = String(fileName || "").split(".").pop()?.toLowerCase();

  if (ext === "html") return "html";
  if (ext === "css") return "css";
  if (ext === "js") return "js";

  if (fallback === "html" || fallback === "css" || fallback === "js" || fallback === "txt") {
    return fallback;
  }

  return "txt";
}

export function getDefaultFileContent(fileName: string) {
  const fileType = detectFileType(fileName);

  if (fileType === "html") {
    return `<div class="page">
  <h1>New Page</h1>
  <p>Start editing this HTML file.</p>
</div>`;
  }

  if (fileType === "css") {
    return `body {
  font-family: system-ui, sans-serif;
}

.page {
  padding: 24px;
}`;
  }

  if (fileType === "js") {
    return `console.log("Hello from script.js");`;
  }

  return "";
}

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(nodesPath);
  } catch {
    await fs.writeFile(nodesPath, "[]", "utf-8");
  }
}

function sortNodes(a: BuilderNode, b: BuilderNode) {
  if (a.parentPath === b.parentPath && a.kind !== b.kind) {
    return a.kind === "folder" ? -1 : 1;
  }

  return a.path.localeCompare(b.path);
}

function normalizeRawNode(raw: any): BuilderNode | null {
  const safePath = sanitizeNodePath(raw?.path || "");
  if (!safePath) return null;

  const name = sanitizeNodePart(raw?.name || getNodeName(safePath)) || getNodeName(safePath);
  if (!name) return null;

  const kind: NodeKind = raw?.kind === "folder" ? "folder" : "file";
  const parentPath = getParentPath(safePath);
  const now = new Date().toISOString();

  if (kind === "folder") {
    return {
      path: safePath,
      name,
      parentPath,
      kind: "folder",
      createdAt: raw?.createdAt || now,
      updatedAt: raw?.updatedAt || raw?.createdAt || now,
    };
  }

  return {
    path: safePath,
    name,
    parentPath,
    kind: "file",
    fileType: detectFileType(name, raw?.fileType),
    content: String(raw?.content || ""),
    createdAt: raw?.createdAt || now,
    updatedAt: raw?.updatedAt || raw?.createdAt || now,
  };
}

export async function readNodes(): Promise<BuilderNode[]> {
  await ensureStore();

  try {
    const raw = await fs.readFile(nodesPath, "utf-8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => normalizeRawNode(item))
      .filter(Boolean)
      .sort(sortNodes) as BuilderNode[];
  } catch {
    await fs.writeFile(nodesPath, "[]", "utf-8");
    return [];
  }
}

export async function writeNodes(nodes: BuilderNode[]) {
  await ensureStore();
  const sorted = [...nodes].sort(sortNodes);
  await fs.writeFile(nodesPath, JSON.stringify(sorted, null, 2), "utf-8");
}

export async function listNodes() {
  return readNodes();
}

function assertParentFolderExists(nodes: BuilderNode[], parentPath: string) {
  if (!parentPath) return;

  const parent = nodes.find((node) => node.path === parentPath);

  if (!parent) {
    throw new Error("Parent folder not found");
  }

  if (parent.kind !== "folder") {
    throw new Error("Parent path is not a folder");
  }
}

function assertNodeDoesNotExist(nodes: BuilderNode[], nodePath: string) {
  const exists = nodes.some((node) => node.path === nodePath);

  if (exists) {
    throw new Error("A node already exists at this path");
  }
}

function replacePrefix(value: string, oldPrefix: string, newPrefix: string) {
  if (value === oldPrefix) return newPrefix;
  if (value.startsWith(`${oldPrefix}/`)) {
    return `${newPrefix}${value.slice(oldPrefix.length)}`;
  }
  return value;
}

async function createNode(input: { parentPath?: string; name: string; kind: NodeKind }) {
  const nodes = await readNodes();

  const safeParentPath = sanitizeNodePath(input.parentPath || "");
  const safeName = sanitizeNodePart(input.name);
  const safePath = safeParentPath ? `${safeParentPath}/${safeName}` : safeName;

  if (!safeName) {
    throw new Error("Invalid node name");
  }

  if (!safePath) {
    throw new Error("Invalid node path");
  }

  assertParentFolderExists(nodes, safeParentPath);
  assertNodeDoesNotExist(nodes, safePath);

  const now = new Date().toISOString();

  if (input.kind === "folder") {
    const folderNode: BuilderNode = {
      path: safePath,
      name: safeName,
      parentPath: safeParentPath,
      kind: "folder",
      createdAt: now,
      updatedAt: now,
    };

    nodes.push(folderNode);
    await writeNodes(nodes);
    return folderNode;
  }

  const fileNode: BuilderNode = {
    path: safePath,
    name: safeName,
    parentPath: safeParentPath,
    kind: "file",
    fileType: detectFileType(safeName),
    content: getDefaultFileContent(safeName),
    createdAt: now,
    updatedAt: now,
  };

  nodes.push(fileNode);
  await writeNodes(nodes);
  return fileNode;
}

export async function createFolder(input: { parentPath?: string; name: string }) {
  return createNode({
    parentPath: input.parentPath || "",
    name: input.name,
    kind: "folder",
  });
}

export async function createFile(input: { parentPath?: string; name: string }) {
  if (!String(input.name || "").includes(".")) {
    throw new Error("File name must include an extension like index.html or style.css");
  }

  return createNode({
    parentPath: input.parentPath || "",
    name: input.name,
    kind: "file",
  });
}

export async function saveFileContent(input: { path: string; content: string }) {
  const safePath = sanitizeNodePath(input.path || "");
  if (!safePath) {
    throw new Error("Invalid file path");
  }

  const nodes = await readNodes();
  const idx = nodes.findIndex((node) => node.path === safePath);

  if (idx < 0) {
    throw new Error("File not found");
  }

  if (nodes[idx].kind !== "file") {
    throw new Error("Selected path is not a file");
  }

  const updatedNode: BuilderNode = {
    ...nodes[idx],
    content: String(input.content || ""),
    updatedAt: new Date().toISOString(),
  };

  nodes[idx] = updatedNode;
  await writeNodes(nodes);

  return updatedNode;
}

export async function renameNode(input: { path: string; newName: string }) {
  const safePath = sanitizeNodePath(input.path || "");
  const safeName = sanitizeNodePart(input.newName);

  if (!safePath) {
    throw new Error("Invalid node path");
  }

  if (!safeName) {
    throw new Error("Invalid new name");
  }

  const nodes = await readNodes();
  const idx = nodes.findIndex((node) => node.path === safePath);

  if (idx < 0) {
    throw new Error("Node not found");
  }

  const target = nodes[idx];

  if (!target.parentPath) {
    throw new Error("Project root rename is not supported yet");
  }

  const newPath = `${target.parentPath}/${safeName}`;

  if (newPath !== safePath) {
    const conflict = nodes.find((node) => node.path === newPath);
    if (conflict) {
      throw new Error("Another node already exists with this name");
    }
  }

  const now = new Date().toISOString();

  if (target.kind === "file") {
    const updatedNode: BuilderNode = {
      ...target,
      name: safeName,
      path: newPath,
      fileType: detectFileType(safeName, target.fileType),
      updatedAt: now,
    };

    nodes[idx] = updatedNode;
    await writeNodes(nodes);
    return updatedNode;
  }

  const renamedNodes = nodes.map((node) => {
    if (node.path === safePath || node.path.startsWith(`${safePath}/`)) {
      const updatedPath = replacePrefix(node.path, safePath, newPath);
      const updatedParentPath = node.parentPath
        ? replacePrefix(node.parentPath, safePath, newPath)
        : node.parentPath;

      if (node.path === safePath) {
        return {
          ...node,
          name: safeName,
          path: updatedPath,
          parentPath: updatedParentPath,
          updatedAt: now,
        };
      }

      return {
        ...node,
        path: updatedPath,
        parentPath: updatedParentPath,
        updatedAt: now,
      };
    }

    return node;
  });

  await writeNodes(renamedNodes);
  return renamedNodes.find((node) => node.path === newPath)!;
}

export async function deleteNode(input: { path: string }) {
  const safePath = sanitizeNodePath(input.path || "");

  if (!safePath) {
    throw new Error("Invalid node path");
  }

  const nodes = await readNodes();
  const target = nodes.find((node) => node.path === safePath);

  if (!target) {
    throw new Error("Node not found");
  }

  if (!target.parentPath) {
    throw new Error("Project root delete is not supported yet");
  }

  const remainingNodes =
    target.kind === "folder"
      ? nodes.filter((node) => node.path !== safePath && !node.path.startsWith(`${safePath}/`))
      : nodes.filter((node) => node.path !== safePath);

  const deletedCount = nodes.length - remainingNodes.length;

  await writeNodes(remainingNodes);

  return {
    path: safePath,
    kind: target.kind,
    name: target.name,
    deletedCount,
    parentPath: target.parentPath,
  };
}