import type { APIRoute } from "astro";
import { createFile } from "../../../lib/node-store.ts";

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

    const node = await createFile({
      parentPath: body.parentPath || "",
      name: body.name || "",
    });

    return json(
      {
        ok: true,
        node,
      },
      200
    );
  } catch (error: any) {
    return json(
      {
        error: error?.message || "Failed to create file",
      },
      400
    );
  }
};