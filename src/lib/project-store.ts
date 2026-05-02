import fs from "fs/promises";
import path from "path";
import {
  createFolder,
  readNodes,
  sanitizeNodePart,
  writeNodes,
  detectFileType,
  type BuilderNode,
} from "./node-store.ts";

export type ProjectType = "html-site" | "react-vite" | "vue-vite" | "svelte-vite";

export interface ProjectRecord {
  id: string;
  name: string;
  rootPath: string;
  type: ProjectType;
  createdAt: string;
  updatedAt: string;
}

const dataDir = path.join(process.cwd(), "data");
const projectsPath = path.join(dataDir, "projects.json");

function normalizeProjectType(input: string): ProjectType {
  const value = String(input || "").trim().toLowerCase();

  if (value === "react-vite") return "react-vite";
  if (value === "vue-vite") return "vue-vite";
  if (value === "svelte-vite") return "svelte-vite";

  return "html-site";
}

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(projectsPath);
  } catch {
    await fs.writeFile(projectsPath, "[]", "utf-8");
  }
}

function normalizeProject(raw: any): ProjectRecord | null {
  const rootPath = sanitizeNodePart(raw?.rootPath || raw?.id || raw?.name || "");
  if (!rootPath) return null;

  const displayName = String(raw?.name || rootPath).trim() || rootPath;
  const now = new Date().toISOString();

  return {
    id: rootPath,
    name: displayName,
    rootPath,
    type: normalizeProjectType(raw?.type || "html-site"),
    createdAt: raw?.createdAt || now,
    updatedAt: raw?.updatedAt || raw?.createdAt || now,
  };
}

async function readProjectsOnly(): Promise<ProjectRecord[]> {
  await ensureStore();

  try {
    const raw = await fs.readFile(projectsPath, "utf-8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => normalizeProject(item))
      .filter(Boolean) as ProjectRecord[];
  } catch {
    await fs.writeFile(projectsPath, "[]", "utf-8");
    return [];
  }
}

function sortProjects(projects: ProjectRecord[]) {
  return [...projects].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt).getTime();
    return bTime - aTime;
  });
}

async function inferProjectsFromNodes(): Promise<ProjectRecord[]> {
  const nodes = await readNodes();
  const now = new Date().toISOString();

  const rootFolders = nodes.filter(
    (node) => node.kind === "folder" && !node.parentPath
  );

  return rootFolders.map((node) => ({
    id: node.path,
    name: node.name || node.path,
    rootPath: node.path,
    type: "html-site",
    createdAt: node.createdAt || now,
    updatedAt: node.updatedAt || node.createdAt || now,
  }));
}

function replacePrefix(value: string, oldPrefix: string, newPrefix: string) {
  if (value === oldPrefix) return newPrefix;

  if (value.startsWith(`${oldPrefix}/`)) {
    return `${newPrefix}${value.slice(oldPrefix.length)}`;
  }

  return value;
}

function buildFileNode(
  rootPath: string,
  relativePath: string,
  content: string,
  now: string
): BuilderNode {
  const safeRelativePath = relativePath
    .split("/")
    .map((part) => sanitizeNodePart(part))
    .filter(Boolean)
    .join("/");

  const fullPath = `${rootPath}/${safeRelativePath}`;
  const parts = fullPath.split("/").filter(Boolean);
  const name = parts[parts.length - 1] || "";
  const parentPath = parts.slice(0, -1).join("/");

  return {
    path: fullPath,
    name,
    parentPath,
    kind: "file",
    fileType: detectFileType(name),
    content,
    createdAt: now,
    updatedAt: now,
  };
}

function buildFolderNode(
  rootPath: string,
  relativePath: string,
  now: string
): BuilderNode {
  const safeRelativePath = relativePath
    .split("/")
    .map((part) => sanitizeNodePart(part))
    .filter(Boolean)
    .join("/");

  const fullPath = `${rootPath}/${safeRelativePath}`;
  const parts = fullPath.split("/").filter(Boolean);
  const name = parts[parts.length - 1] || "";
  const parentPath = parts.slice(0, -1).join("/");

  return {
    path: fullPath,
    name,
    parentPath,
    kind: "folder",
    createdAt: now,
    updatedAt: now,
  };
}

function buildReactStarterNodes(rootPath: string, now: string): BuilderNode[] {
  return [
    buildFolderNode(rootPath, "public", now),
    buildFolderNode(rootPath, "src", now),
    buildFolderNode(rootPath, "src/components", now),
    buildFolderNode(rootPath, "src/data", now),

    buildFileNode(
      rootPath,
      "package.json",
      `{
  "name": "${rootPath}",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^5.2.0",
    "vite": "^6.4.1",
    "react": "^19.2.5",
    "react-dom": "^19.2.5",
    "framer-motion": "^12.38.0",
    "lucide-react": "^1.11.0",
    "axios": "^1.15.2"
  },
  "devDependencies": {}
}
`,
      now
    ),

    buildFileNode(
      rootPath,
      "index.html",
      `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React Vite App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,
      now
    ),

    buildFileNode(
      rootPath,
      "vite.config.js",
      `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
`,
      now
    ),

    buildFileNode(
      rootPath,
      "src/main.jsx",
      `import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`,
      now
    ),

    buildFileNode(
      rootPath,
      "src/app.jsx",
      `import { Sparkles } from "lucide-react";
import Hero from "./components/hero.jsx";

export default function App() {
  return (
    <main className="app">
      <Hero />
      <section className="section">
        <span className="badge">
          <Sparkles size={16} />
          React + Vite
        </span>
        <h2>Framework-aware project preview is ready.</h2>
        <p>
          This starter project was generated by Dynamic Page Builder.
          You can now create components, import files, and use npm packages.
        </p>
      </section>
    </main>
  );
}
`,
      now
    ),

    buildFileNode(
      rootPath,
      "src/components/hero.jsx",
      `export default function Hero() {
  return (
    <section className="hero">
      <p className="eyebrow">React Project</p>
      <h1>Build premium React interfaces inside your builder.</h1>
      <p>
        This project supports component imports, live preview, and real Vite workflow.
      </p>
    </section>
  );
}
`,
      now
    ),

    buildFileNode(
      rootPath,
      "src/index.css",
      `:root {
  font-family: Inter, system-ui, Arial, sans-serif;
  background: #0f172a;
  color: #f8fafc;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

.app {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.24), transparent 34%),
    radial-gradient(circle at top right, rgba(168, 85, 247, 0.18), transparent 30%),
    #0f172a;
}

.hero,
.section {
  width: min(1000px, calc(100% - 40px));
  margin: 0 auto;
}

.hero {
  padding: 120px 0 60px;
}

.eyebrow,
.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(56, 189, 248, 0.12);
  color: #7dd3fc;
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

h1 {
  max-width: 820px;
  margin: 0;
  font-size: clamp(44px, 7vw, 84px);
  line-height: 0.95;
  letter-spacing: -0.07em;
}

h2 {
  margin: 0;
  font-size: clamp(32px, 4vw, 52px);
  letter-spacing: -0.05em;
}

p {
  max-width: 720px;
  color: #cbd5e1;
  font-size: 18px;
  line-height: 1.7;
}

.section {
  padding: 40px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 90px rgba(0, 0, 0, 0.26);
}
`,
      now
    ),
  ];
}

function buildVueStarterNodes(rootPath: string, now: string): BuilderNode[] {
  return [
    buildFolderNode(rootPath, "public", now),
    buildFolderNode(rootPath, "src", now),
    buildFolderNode(rootPath, "src/components", now),
    buildFolderNode(rootPath, "src/data", now),

    buildFileNode(
      rootPath,
      "package.json",
      `{
  "name": "${rootPath}",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@vitejs/plugin-vue": "^5.2.4",
    "vite": "^6.4.1",
    "vue": "^3.5.33",
    "gsap": "^3.15.0",
    "axios": "^1.15.2"
  },
  "devDependencies": {}
}
`,
      now
    ),

    buildFileNode(
      rootPath,
      "index.html",
      `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vue Vite App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`,
      now
    ),

    buildFileNode(
      rootPath,
      "vite.config.js",
      `import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
});
`,
      now
    ),

    buildFileNode(
      rootPath,
      "src/main.js",
      `import { createApp } from "vue";
import App from "./app.vue";
import "./style.css";

createApp(App).mount("#app");
`,
      now
    ),

    buildFileNode(
      rootPath,
      "src/app.vue",
      `<template>
  <main class="app">
    <Hero />

    <section class="section">
      <span class="badge">Vue + Vite</span>
      <h2>Framework-aware Vue preview is ready.</h2>
      <p>
        This starter project was generated by Dynamic Page Builder.
        You can create Vue components, use props, and import npm packages.
      </p>
    </section>
  </main>
</template>

<script setup>
import Hero from "./components/hero.vue";
</script>
`,
      now
    ),

    buildFileNode(
      rootPath,
      "src/components/hero.vue",
      `<template>
  <section class="hero">
    <p class="eyebrow">Vue Project</p>
    <h1>Build elegant Vue interfaces inside your builder.</h1>
    <p>
      This project supports Vue Single File Components, live preview, and real Vite workflow.
    </p>
  </section>
</template>

<script setup>
</script>
`,
      now
    ),

    buildFileNode(
      rootPath,
      "src/style.css",
      `:root {
  font-family: Inter, system-ui, Arial, sans-serif;
  background: #052e2b;
  color: #f8fafc;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

.app {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(66, 184, 131, 0.28), transparent 34%),
    radial-gradient(circle at top right, rgba(56, 189, 248, 0.18), transparent 30%),
    #052e2b;
}

.hero,
.section {
  width: min(1000px, calc(100% - 40px));
  margin: 0 auto;
}

.hero {
  padding: 120px 0 60px;
}

.eyebrow,
.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 18px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(66, 184, 131, 0.16);
  color: #86efac;
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

h1 {
  max-width: 820px;
  margin: 0;
  font-size: clamp(44px, 7vw, 84px);
  line-height: 0.95;
  letter-spacing: -0.07em;
}

h2 {
  margin: 0;
  font-size: clamp(32px, 4vw, 52px);
  letter-spacing: -0.05em;
}

p {
  max-width: 720px;
  color: #ccfbf1;
  font-size: 18px;
  line-height: 1.7;
}

.section {
  padding: 40px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 90px rgba(0, 0, 0, 0.26);
}
`,
      now
    ),
  ];
}

function buildSvelteStarterNodes(rootPath: string, now: string): BuilderNode[] {
  return [
    buildFolderNode(rootPath, "public", now),
    buildFolderNode(rootPath, "src", now),

    buildFileNode(
      rootPath,
      "package.json",
      `{
  "name": "${rootPath}",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "svelte": "^5.0.0"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^5.0.3",
    "vite": "^6.4.1"
  }
}
`,
      now
    ),

    buildFileNode(
      rootPath,
      "index.html",
      `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Svelte Vite App</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
`,
      now
    ),

    buildFileNode(
      rootPath,
      "vite.config.js",
      `import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [svelte()],
});
`,
      now
    ),

    buildFileNode(
      rootPath,
      "src/main.js",
      `import { mount } from "svelte";
import App from "./app.svelte";
import "./style.css";

const app = mount(App, {
  target: document.getElementById("app"),
});

export default app;
`,
      now
    ),

    buildFileNode(
      rootPath,
      "src/app.svelte",
      `<script>
  let count = 0;
</script>

<main class="page">
  <section class="card">
    <h1>Svelte + Vite Project</h1>
    <p>This starter project was generated by the builder.</p>

    <button onclick={() => count += 1}>
      Count is {count}
    </button>
  </section>
</main>
`,
      now
    ),

    buildFileNode(
      rootPath,
      "src/style.css",
      `:root {
  font-family: Inter, system-ui, Arial, sans-serif;
  background: #f5f7fb;
  color: #0f172a;
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
  padding: 24px;
}

.card {
  width: min(720px, 100%);
  background: #ffffff;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
  text-align: center;
}

h1 {
  margin: 0 0 12px;
  font-size: 36px;
}

p {
  margin: 0 0 24px;
  color: #475569;
  font-size: 18px;
  line-height: 1.6;
}

button {
  border: 0;
  border-radius: 10px;
  background: #ff3e00;
  color: white;
  padding: 12px 18px;
  font-weight: 700;
  cursor: pointer;
}

button:hover {
  background: #d73500;
}
`,
      now
    ),
  ];
}

function buildHtmlStarterNodes(rootPath: string, now: string): BuilderNode[] {
  return [
    buildFileNode(
      rootPath,
      "index.html",
      `<div class="page">
  <h1>HTML Website Project</h1>
  <p>This starter project was generated by the builder.</p>
</div>`,
      now
    ),

    buildFileNode(
      rootPath,
      "style.css",
      `body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #f4f7fb;
  color: #0f172a;
}

.page {
  max-width: 900px;
  margin: 80px auto;
  background: white;
  padding: 32px;
  border-radius: 16px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
}`,
      now
    ),

    buildFileNode(
      rootPath,
      "script.js",
      `console.log("HTML site loaded successfully");`,
      now
    ),
  ];
}

function buildStarterNodes(rootPath: string, type: ProjectType): BuilderNode[] {
  const now = new Date().toISOString();

  if (type === "react-vite") {
    return buildReactStarterNodes(rootPath, now);
  }

  if (type === "vue-vite") {
    return buildVueStarterNodes(rootPath, now);
  }

  if (type === "svelte-vite") {
    return buildSvelteStarterNodes(rootPath, now);
  }

  return buildHtmlStarterNodes(rootPath, now);
}

export async function readProjects(): Promise<ProjectRecord[]> {
  const storedProjects = await readProjectsOnly();
  const inferredProjects = await inferProjectsFromNodes();

  const map = new Map<string, ProjectRecord>();

  for (const project of inferredProjects) {
    map.set(project.id, project);
  }

  for (const project of storedProjects) {
    map.set(project.id, project);
  }

  return sortProjects([...map.values()]);
}

export async function writeProjects(projects: ProjectRecord[]) {
  const sorted = sortProjects(projects);
  await ensureStore();
  await fs.writeFile(projectsPath, JSON.stringify(sorted, null, 2), "utf-8");
}

export async function listProjects() {
  return readProjects();
}

export async function createProject(input: { name: string; type?: string }) {
  const displayName = String(input.name || "").trim();
  const rootPath = sanitizeNodePart(displayName);
  const type = normalizeProjectType(input.type || "html-site");

  if (!displayName) {
    throw new Error("Project name is required");
  }

  if (!rootPath) {
    throw new Error("Invalid project name");
  }

  const projects = await readProjects();

  const duplicateProject = projects.find(
    (project) => project.id === rootPath || project.rootPath === rootPath
  );

  if (duplicateProject) {
    throw new Error("A project with this name already exists");
  }

  const nodes = await readNodes();
  const pathConflict = nodes.find((node) => node.path === rootPath);

  if (pathConflict) {
    throw new Error("A file or folder already exists with this project path");
  }

  await createFolder({
    parentPath: "",
    name: rootPath,
  });

  const nodesAfterRoot = await readNodes();
  const starterNodes = buildStarterNodes(rootPath, type);

  await writeNodes([...nodesAfterRoot, ...starterNodes]);

  const storedProjects = await readProjectsOnly();
  const now = new Date().toISOString();

  const project: ProjectRecord = {
    id: rootPath,
    name: displayName,
    rootPath,
    type,
    createdAt: now,
    updatedAt: now,
  };

  storedProjects.push(project);
  await writeProjects(storedProjects);

  return project;
}

export async function renameProject(input: { projectId: string; newName: string }) {
  const currentProjects = await readProjects();

  const target = currentProjects.find(
    (project) => project.id === input.projectId || project.rootPath === input.projectId
  );

  if (!target) {
    throw new Error("Project not found");
  }

  const displayName = String(input.newName || "").trim();
  const newRootPath = sanitizeNodePart(displayName);

  if (!displayName) {
    throw new Error("New project name is required");
  }

  if (!newRootPath) {
    throw new Error("Invalid new project name");
  }

  const duplicateProject = currentProjects.find(
    (project) =>
      project.id !== target.id &&
      project.rootPath !== target.rootPath &&
      (project.id === newRootPath || project.rootPath === newRootPath)
  );

  if (duplicateProject) {
    throw new Error("Another project already exists with this name");
  }

  const nodes = await readNodes();

  const targetRootFolder = nodes.find(
    (node) => node.kind === "folder" && node.path === target.rootPath
  );

  if (!targetRootFolder) {
    throw new Error("Project root folder not found");
  }

  if (newRootPath !== target.rootPath) {
    const pathConflict = nodes.find(
      (node) => node.path === newRootPath || node.path.startsWith(`${newRootPath}/`)
    );

    if (pathConflict) {
      throw new Error("A file or folder already exists with the new project path");
    }
  }

  const now = new Date().toISOString();

  const renamedNodes = nodes.map((node) => {
    if (node.path === target.rootPath || node.path.startsWith(`${target.rootPath}/`)) {
      return {
        ...node,
        path: replacePrefix(node.path, target.rootPath, newRootPath),
        parentPath: node.parentPath
          ? replacePrefix(node.parentPath, target.rootPath, newRootPath)
          : node.parentPath,
        name: node.path === target.rootPath ? newRootPath : node.name,
        updatedAt: now,
      };
    }

    return node;
  });

  await writeNodes(renamedNodes);

  const storedProjects = await readProjectsOnly();

  const filteredStoredProjects = storedProjects.filter(
    (project) => project.id !== target.id && project.rootPath !== target.rootPath
  );

  const renamedProject: ProjectRecord = {
    id: newRootPath,
    name: displayName,
    rootPath: newRootPath,
    type: target.type || "html-site",
    createdAt: target.createdAt,
    updatedAt: now,
  };

  filteredStoredProjects.push(renamedProject);
  await writeProjects(filteredStoredProjects);

  return renamedProject;
}

export async function deleteProject(input: { projectId: string }) {
  const currentProjects = await readProjects();

  const target = currentProjects.find(
    (project) => project.id === input.projectId || project.rootPath === input.projectId
  );

  if (!target) {
    throw new Error("Project not found");
  }

  const nodes = await readNodes();

  const remainingNodes = nodes.filter(
    (node) => node.path !== target.rootPath && !node.path.startsWith(`${target.rootPath}/`)
  );

  const deletedNodeCount = nodes.length - remainingNodes.length;

  await writeNodes(remainingNodes);

  const storedProjects = await readProjectsOnly();

  const remainingProjects = storedProjects.filter(
    (project) => project.id !== target.id && project.rootPath !== target.rootPath
  );

  await writeProjects(remainingProjects);

  return {
    id: target.id,
    name: target.name,
    rootPath: target.rootPath,
    type: target.type,
    deletedNodeCount,
  };
}