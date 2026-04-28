import { createServer, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import vue from "@vitejs/plugin-vue";
import type { ProjectType } from "./preview-workspace.js";

type PreviewServerRecord = {
  projectRoot: string;
  workspaceDir: string;
  projectType: ProjectType;
  server: ViteDevServer;
  url: string;
};

type PreviewServerStore = Map<string, PreviewServerRecord>;

const globalStore = globalThis as typeof globalThis & {
  __DPB_PREVIEW_SERVERS__?: PreviewServerStore;
};

function getStore(): PreviewServerStore {
  if (!globalStore.__DPB_PREVIEW_SERVERS__) {
    globalStore.__DPB_PREVIEW_SERVERS__ = new Map();
  }

  return globalStore.__DPB_PREVIEW_SERVERS__;
}

function getPlugins(projectType: ProjectType) {
  if (projectType === "react-vite") {
    return [react()];
  }

  if (projectType === "vue-vite") {
    return [vue()];
  }

  return [];
}

function getServerUrl(server: ViteDevServer) {
  const localUrl = server.resolvedUrls?.local?.[0];

  if (localUrl) {
    return localUrl.replace(/\/$/, "");
  }

  const address = server.httpServer?.address();

  if (address && typeof address === "object") {
    return `http://127.0.0.1:${address.port}`;
  }

  throw new Error("Vite preview server started, but no local URL was resolved.");
}

function sameServer(
  existing: PreviewServerRecord,
  options: {
    workspaceDir: string;
    projectType: ProjectType;
  }
) {
  return (
    existing.workspaceDir === options.workspaceDir &&
    existing.projectType === options.projectType
  );
}

export async function startPreviewServer(options: {
  projectRoot: string;
  workspaceDir: string;
  projectType: ProjectType;
}) {
  const store = getStore();
  const existing = store.get(options.projectRoot);

  if (existing && sameServer(existing, options)) {
    return {
      url: existing.url,
      reused: true,
    };
  }

  if (existing) {
    await existing.server.close();
    store.delete(options.projectRoot);
  }

  const server = await createServer({
    root: options.workspaceDir,
    configFile: false,
    plugins: getPlugins(options.projectType),
    appType: "spa",
    server: {
      host: "127.0.0.1",
      port: 5178,
      strictPort: false,
      hmr: true,
      watch: {
        ignored: ["**/node_modules/**"],
      },
      fs: {
        strict: false,
      },
    },
    optimizeDeps: {
      force: false,
      include:
        options.projectType === "react-vite"
          ? [
              "react",
              "react-dom",
              "react-dom/client",
              "framer-motion",
              "lucide-react",
              "axios",
              "three",
              "gsap",
            ]
          : options.projectType === "vue-vite"
            ? ["vue", "axios", "three", "gsap"]
            : [],
    },
    resolve: {
      dedupe:
        options.projectType === "react-vite"
          ? ["react", "react-dom"]
          : options.projectType === "vue-vite"
            ? ["vue"]
            : [],
    },
    clearScreen: false,
  });

  await server.listen();

  const url = getServerUrl(server);

  store.set(options.projectRoot, {
    projectRoot: options.projectRoot,
    workspaceDir: options.workspaceDir,
    projectType: options.projectType,
    server,
    url,
  });

  return {
    url,
    reused: false,
  };
}

export async function restartPreviewServer(options: {
  projectRoot: string;
  workspaceDir: string;
  projectType: ProjectType;
}) {
  const store = getStore();
  const existing = store.get(options.projectRoot);

  if (existing) {
    await existing.server.close();
    store.delete(options.projectRoot);
  }

  return startPreviewServer(options);
}

export async function closePreviewServer(projectRoot: string) {
  const store = getStore();
  const existing = store.get(projectRoot);

  if (!existing) return;

  await existing.server.close();
  store.delete(projectRoot);
}

export async function closeAllPreviewServers() {
  const store = getStore();

  const servers = Array.from(store.values());

  await Promise.all(
    servers.map(async (record) => {
      await record.server.close();
    })
  );

  store.clear();
}