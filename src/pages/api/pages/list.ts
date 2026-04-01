import type { APIRoute } from "astro";
import fs from "fs/promises";
import path from "path";

export const prerender = false;

const dataDir = path.join(process.cwd(), "data");
const dataPath = path.join(dataDir, "pages.json");

const json = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function sanitizeSegment(input: string) {
  return (input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function sanitizePath(input: string) {
  return String(input || "")
    .split("/")
    .map((part) => sanitizeSegment(part))
    .filter(Boolean)
    .join("/");
}

function getPageName(pagePath: string) {
  const parts = pagePath.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataPath);
  } catch {
    await fs.writeFile(dataPath, "[]", "utf-8");
  }
}

async function readPages(): Promise<any[]> {
  await ensureStore();

  try {
    const raw = await fs.readFile(dataPath, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    await fs.writeFile(dataPath, "[]", "utf-8");
    return [];
  }
}

export const GET: APIRoute = async () => {
  try {
    const rawPages = await readPages();

    const pages = rawPages
      .map((page: any) => {
        const pagePath = sanitizePath(page?.path || page?.slug || "");
        if (!pagePath) return null;

        return {
          ...page,
          path: pagePath,
          name: page?.name || getPageName(pagePath),
          slug: getPageName(pagePath),
        };
      })
      .filter(Boolean);

    pages.sort((a: any, b: any) => {
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    return json({ ok: true, pages }, 200);
  } catch (e: any) {
    return json({ error: e?.message || "Failed to load pages" }, 500);
  }
};