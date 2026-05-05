import type { APIRoute } from "astro";
import { readNodes } from "../../../../lib/node-store.ts";

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  try {
    const imagePath = params.path || "";
    const nodes = await readNodes();

    // Path match කරන node eka හොයන්න
    // "/hospital-logo.png" -> "test-03/public/hospital-logo.png" වගේ
    const imageNode = nodes.find((n) => {
      if (n.kind !== "file") return false;
      const name = n.name.toLowerCase();
      const searchName = imagePath.split("/").pop()?.toLowerCase() || "";
      return name === searchName && n.content?.startsWith("data:");
    });

    if (!imageNode?.content) {
      return new Response("Image not found", { status: 404 });
    }

    // data URL parse කරන්න
    // "data:image/png;base64,XXXX"
    const match = imageNode.content.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return new Response("Invalid image data", { status: 500 });
    }

    const mimeType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, "base64");

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: any) {
    return new Response(error?.message || "Error", { status: 500 });
  }
};