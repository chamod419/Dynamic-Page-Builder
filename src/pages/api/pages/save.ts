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

function normalizeExistingPath(page: any) {
  return sanitizePath(page?.path || page?.slug || "");
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

async function writePages(pages: any[]) {
  await ensureStore();
  await fs.writeFile(dataPath, JSON.stringify(pages, null, 2), "utf-8");
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const bodyText = await request.text();

    let body: any;
    try {
      body = JSON.parse(bodyText || "{}");
    } catch {
      return json({ error: "Invalid JSON body", bodyText }, 400);
    }

    const pagePath = sanitizePath(body.path || body.slug || "");
    const html = String(body.html || "").trim();

    if (!pagePath) return json({ error: "Invalid path" }, 400);
    if (!html) return json({ error: "HTML is required" }, 400);

    const pages = await readPages();
    const now = new Date().toISOString();
    const pageName = getPageName(pagePath);

    const idx = pages.findIndex((page: any) => normalizeExistingPath(page) === pagePath);

    const obj = {
      path: pagePath,
      name: pageName,
      slug: pageName,
      type: "html",
      html,
      updatedAt: now,
    };

    if (idx >= 0) {
      pages[idx] = { ...pages[idx], ...obj };
    } else {
      pages.push({ ...obj, createdAt: now });
    }

    await writePages(pages);

    return json(
      {
        ok: true,
        url: `/p/${pagePath}`,
        savedTo: dataPath,
        path: pagePath,
      },
      200
    );
  } catch (e: any) {
    return json({ error: e?.message || "Server error", stack: e?.stack }, 500);
  }
};