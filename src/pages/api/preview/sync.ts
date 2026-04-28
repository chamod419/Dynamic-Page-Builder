import type { APIRoute } from "astro";
import { startPreviewServer } from "../../../lib/preview-server.js";
import {
  syncProjectPreviewWorkspace,
  type PreviewFileOverride,
} from "../../../lib/preview-workspace.js";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function normalizeOverride(input: any): PreviewFileOverride | null {
  if (!input || !input.path) return null;

  return {
    path: String(input.path),
    content: String(input.content || ""),
  };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));

    const projectRoot = String(body?.projectRoot || "");
    const currentFile = normalizeOverride(body?.currentFile);

    if (!projectRoot.trim()) {
      return json(
        {
          ok: false,
          error: "Missing projectRoot.",
        },
        400
      );
    }

    const workspace = await syncProjectPreviewWorkspace({
      projectRoot,
      overrides: currentFile ? [currentFile] : [],
      clean: false,
    });

    const server = await startPreviewServer({
      projectRoot: workspace.projectRoot,
      workspaceDir: workspace.workspaceDir,
      projectType: workspace.projectType,
    });

    return json({
      ok: true,
      url: server.url,
      reused: server.reused,
      projectRoot: workspace.projectRoot,
      projectType: workspace.projectType,
      workspaceDir: workspace.workspaceDir,
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      500
    );
  }
};