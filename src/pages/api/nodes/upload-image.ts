import type { APIRoute } from "astro";
import {
  readNodes,
  writeNodes,
  sanitizeNodePath,
  sanitizeNodePart,
} from "../../../lib/node-store.ts";

export const prerender = false;

const json = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const ALLOWED_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp"];

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const parentPath = formData.get("parentPath");

    if (!file || !(file instanceof File)) {
      return json({ error: "No file provided" }, 400);
    }

    if (!parentPath || typeof parentPath !== "string") {
      return json({ error: "parentPath is required" }, 400);
    }

    // File name sanitize
    const rawName = file.name;
    const ext = rawName.split(".").pop()?.toLowerCase() || "";

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return json(
        { error: `File type .${ext} is not allowed. Use: ${ALLOWED_EXTENSIONS.join(", ")}` },
        400
      );
    }

    
    const safeParentPath = sanitizeNodePath(parentPath);
    const safeName = sanitizeNodePart(rawName.replace(/\.[^.]+$/, "")) + "." + ext;

    if (!safeName || safeName === "." + ext) {
      return json({ error: "Invalid file name" }, 400);
    }

    const safePath = safeParentPath
      ? `${safeParentPath}/${safeName}`
      : safeName;

    const nodes = await readNodes();

    if (safeParentPath) {
      const parent = nodes.find((n) => n.path === safeParentPath);
      if (!parent) {
        return json({ error: `Folder not found: ${safeParentPath}` }, 404);
      }
      if (parent.kind !== "folder") {
        return json({ error: "Parent path is not a folder" }, 400);
      }
    }

    // Duplicate check - same name file already exists  overwrite
    const existingIdx = nodes.findIndex((n) => n.path === safePath);

 
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${file.type || "image/" + ext};base64,${base64}`;

    const now = new Date().toISOString();

    const imageNode = {
      path: safePath,
      name: safeName,
      parentPath: safeParentPath,
      kind: "file" as const,
      fileType: "txt" as const, 
      content: dataUrl,         
      createdAt: existingIdx >= 0 ? nodes[existingIdx].createdAt : now,
      updatedAt: now,
    };

    if (existingIdx >= 0) {
      nodes[existingIdx] = imageNode;
    } else {
      nodes.push(imageNode);
    }

    await writeNodes(nodes);

    return json({
      ok: true,
      node: imageNode,
    });
  } catch (error: any) {
    return json({ error: error?.message || "Upload failed" }, 500);
  }
};