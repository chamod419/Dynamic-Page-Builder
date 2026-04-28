import fs from "fs/promises";
import path from "path";

export type ProjectType = "html-site" | "react-vite" | "vue-vite";

export type BuilderNode = {
  path: string;
  name: string;
  parentPath: string;
  kind: "folder" | "file";
  fileType?: string;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ProjectRecord = {
  id: string;
  name: string;
  rootPath: string;
  type?: ProjectType;
  createdAt?: string;
  updatedAt?: string;
};

export type PreviewFileOverride = {
  path: string;
  content: string;
};

export type PreviewWorkspaceResult = {
  project: ProjectRecord;
  projectRoot: string;
  projectType: ProjectType;
  workspaceDir: string;
};

const dataDir = path.join(process.cwd(), "data");
const nodesPath = path.join(dataDir, "nodes.json");
const projectsPath = path.join(dataDir, "projects.json");
const previewRootDir = path.join(process.cwd(), ".dpb-preview");

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

  return allowedFallbacks.includes(String(fallback || "")) ? String(fallback) : "txt";
}

function normalizeNode(raw: any): BuilderNode | null {
  const safePath = sanitizeNodePath(raw?.path || "");

  if (!safePath) return null;

  const kind = raw?.kind === "folder" ? "folder" : "file";
  const name = String(raw?.name || getNodeName(safePath));

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

  const rawType = String(raw?.type || "html-site");

  const safeType: ProjectType =
    rawType === "react-vite" || rawType === "vue-vite" || rawType === "html-site"
      ? rawType
      : "html-site";

  return {
    id: String(raw?.id || rootPath),
    name: String(raw?.name || rootPath),
    rootPath,
    type: safeType,
    createdAt: raw?.createdAt,
    updatedAt: raw?.updatedAt,
  };
}

async function readJsonFile(filePath: string) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function readNodes(): Promise<BuilderNode[]> {
  const parsed = await readJsonFile(nodesPath);

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => normalizeNode(item))
    .filter(Boolean) as BuilderNode[];
}

export async function readProjects(): Promise<ProjectRecord[]> {
  const parsed = await readJsonFile(projectsPath);

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item) => normalizeProject(item))
    .filter(Boolean) as ProjectRecord[];
}

export function isFrameworkProject(projectType: ProjectType) {
  return projectType === "react-vite" || projectType === "vue-vite";
}

function inferProjectType(project: ProjectRecord, nodes: BuilderNode[]): ProjectType {
  if (
    project.type === "react-vite" ||
    project.type === "vue-vite" ||
    project.type === "html-site"
  ) {
    return project.type;
  }

  const hasReactFiles = nodes.some((node) => {
    if (node.kind !== "file") return false;
    if (!node.path.startsWith(`${project.rootPath}/`)) return false;

    const type = detectFileType(node.name, node.fileType);
    return type === "jsx" || type === "tsx";
  });

  if (hasReactFiles) return "react-vite";

  const hasVueFiles = nodes.some((node) => {
    if (node.kind !== "file") return false;
    if (!node.path.startsWith(`${project.rootPath}/`)) return false;

    return detectFileType(node.name, node.fileType) === "vue";
  });

  if (hasVueFiles) return "vue-vite";

  return "html-site";
}

function getWorkspaceDir(projectRoot: string) {
  const safeRoot = sanitizeNodePart(projectRoot);

  if (!safeRoot) {
    throw new Error("Invalid project root.");
  }

  return path.join(previewRootDir, safeRoot);
}

function assertInsideWorkspace(workspaceDir: string, targetPath: string) {
  const relative = path.relative(workspaceDir, targetPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Unsafe file path detected while syncing preview workspace.");
  }
}

function applyOverrides(nodes: BuilderNode[], overrides: PreviewFileOverride[] = []) {
  const overrideMap = new Map<string, string>();

  for (const override of overrides) {
    const safePath = sanitizeNodePath(override?.path || "");

    if (!safePath) continue;

    overrideMap.set(safePath, String(override?.content || ""));
  }

  return nodes.map((node) => {
    if (node.kind !== "file") return node;
    if (!overrideMap.has(node.path)) return node;

    return {
      ...node,
      content: overrideMap.get(node.path) || "",
    };
  });
}

async function writeTextFile(workspaceDir: string, relativePath: string, content: string) {
  const safeRelativePath = sanitizeNodePath(relativePath);

  if (!safeRelativePath) return;

  const absolutePath = path.join(workspaceDir, safeRelativePath);

  assertInsideWorkspace(workspaceDir, absolutePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content, "utf-8");
}

function getPackageJson(project: ProjectRecord, projectType: ProjectType) {
  const isReact = projectType === "react-vite";
  const isVue = projectType === "vue-vite";

  return JSON.stringify(
    {
      name: project.rootPath,
      private: true,
      version: "0.0.0",
      type: "module",
      scripts: {
        dev: "vite --host 127.0.0.1",
        build: "vite build",
        preview: "vite preview",
      },
      dependencies: {
        ...(isReact
          ? {
              react: "^19.2.5",
              "react-dom": "^19.2.5",
              "framer-motion": "^12.38.0",
              "lucide-react": "^1.11.0",
            }
          : {}),
        ...(isVue
          ? {
              vue: "^3.5.33",
            }
          : {}),
        axios: "^1.15.2",
        gsap: "^3.15.0",
        three: "^0.184.0",
      },
      devDependencies: {
        vite: "^6.4.1",
        "@vitejs/plugin-react": "^5.2.0",
        "@vitejs/plugin-vue": "^5.2.4",
        typescript: "^5.9.3",
      },
    },
    null,
    2
  );
}

function getViteConfig(projectType: ProjectType) {
  if (projectType === "react-vite") {
    return `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1"
  }
});
`;
  }

  if (projectType === "vue-vite") {
    return `import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    host: "127.0.0.1"
  }
});
`;
  }

  return `import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "127.0.0.1"
  }
});
`;
}

function hasConfigFile(nodes: BuilderNode[], projectRoot: string) {
  const configNames = ["vite.config.js", "vite.config.mjs", "vite.config.ts"];

  return nodes.some((node) => {
    if (node.kind !== "file") return false;
    if (node.parentPath !== projectRoot) return false;

    return configNames.includes(node.name);
  });
}

function hasPackageJson(nodes: BuilderNode[], projectRoot: string) {
  return nodes.some((node) => {
    if (node.kind !== "file") return false;
    return node.path === `${projectRoot}/package.json`;
  });
}

async function ensurePreviewSupportFiles(
  workspaceDir: string,
  project: ProjectRecord,
  projectType: ProjectType,
  projectNodes: BuilderNode[]
) {
  if (!hasPackageJson(projectNodes, project.rootPath)) {
    await writeTextFile(workspaceDir, "package.json", getPackageJson(project, projectType));
  }

  if (!hasConfigFile(projectNodes, project.rootPath)) {
    await writeTextFile(workspaceDir, "vite.config.mjs", getViteConfig(projectType));
  }
}

async function writeProjectNodesToWorkspace(
  workspaceDir: string,
  projectRoot: string,
  projectNodes: BuilderNode[]
) {
  for (const node of projectNodes) {
    if (node.kind !== "file") continue;

    const relativePath =
      node.path === projectRoot ? node.name : node.path.replace(`${projectRoot}/`, "");

    await writeTextFile(workspaceDir, relativePath, String(node.content || ""));
  }
}

export async function syncProjectPreviewWorkspace(options: {
  projectRoot: string;
  overrides?: PreviewFileOverride[];
  clean?: boolean;
}): Promise<PreviewWorkspaceResult> {
  const projectRoot = sanitizeNodePart(options.projectRoot || "");

  if (!projectRoot) {
    throw new Error("Missing projectRoot.");
  }

  const [nodes, projects] = await Promise.all([readNodes(), readProjects()]);

  const project = projects.find(
    (item) => item.rootPath === projectRoot || item.id === projectRoot
  );

  if (!project) {
    throw new Error(`Project "${projectRoot}" was not found.`);
  }

  const projectNodes = applyOverrides(
    nodes.filter(
      (node) => node.path === projectRoot || node.path.startsWith(`${projectRoot}/`)
    ),
    options.overrides || []
  );

  const projectType = inferProjectType(project, projectNodes);

  if (!isFrameworkProject(projectType)) {
    throw new Error("Real Vite preview is only used for React + Vite and Vue + Vite projects.");
  }

  const workspaceDir = getWorkspaceDir(projectRoot);

  if (options.clean !== false) {
    await fs.rm(workspaceDir, { recursive: true, force: true });
  }

  await fs.mkdir(workspaceDir, { recursive: true });

  await writeProjectNodesToWorkspace(workspaceDir, projectRoot, projectNodes);
  await ensurePreviewSupportFiles(workspaceDir, project, projectType, projectNodes);

  return {
    project,
    projectRoot,
    projectType,
    workspaceDir,
  };
}