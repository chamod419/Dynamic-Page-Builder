import type { APIRoute } from "astro";
import { renameProject } from "../../../lib/project-store.ts";

export const prerender = false;

const json = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const POST: APIRoute = async ({ request }) => {
  try {
    const bodyText = await request.text();

    let body: any;
    try {
      body = JSON.parse(bodyText || "{}");
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const project = await renameProject({
      projectId: body.projectId || "",
      newName: body.newName || "",
    });

    return json(
      {
        ok: true,
        project,
      },
      200
    );
  } catch (error: any) {
    return json(
      {
        error: error?.message || "Failed to rename project",
      },
      400
    );
  }
};