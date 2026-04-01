import fs from "fs/promises";
import path from "path";
import { createFolder, readNodes, sanitizeNodePart, writeNodes } from "./node-store.ts";

export interface ProjectRecord {
  id: string;
  name: string;
  rootPath: string;
  createdAt: string;
  updatedAt: string;
}

const dataDir = path.join(process.cwd(), "data");
const projectsPath = path.join(dataDir, "projects.json");

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

export async function createProject(input: { name: string }) {
  const displayName = String(input.name || "").trim();
  const rootPath = sanitizeNodePart(displayName);

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

  const storedProjects = await readProjectsOnly();
  const now = new Date().toISOString();

  const project: ProjectRecord = {
    id: rootPath,
    name: displayName,
    rootPath,
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
    deletedNodeCount,
  };
}