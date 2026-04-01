import type { APIRoute } from "astro";
import { listProjects } from "../../../lib/project-store.ts";

export const prerender = false;

const json = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const GET: APIRoute = async () => {
  try {
    const projects = await listProjects();

    return json(
      {
        ok: true,
        projects,
      },
      200
    );
  } catch (error: any) {
    return json(
      {
        error: error?.message || "Failed to load projects",
      },
      500
    );
  }
};