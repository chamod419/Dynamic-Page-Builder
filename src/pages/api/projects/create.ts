import type { APIRoute } from "astro";
import { createProject } from "../../../lib/project-store.ts";

export const prerender = false;

type ProjectType = "html-site" | "react-vite" | "vue-vite" | "svelte-vite";

const ALLOWED_PROJECT_TYPES: ProjectType[] = [
  "html-site",
  "react-vite",
  "vue-vite",
  "svelte-vite",
];

const json = (obj: any, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

function normalizeProjectType(value: unknown): ProjectType {
  const type = String(value || "html-site").trim().toLowerCase();

  if (ALLOWED_PROJECT_TYPES.includes(type as ProjectType)) {
    return type as ProjectType;
  }

  return "html-site";
}

function validateProjectName(value: unknown) {
  const name = String(value || "").trim();

  if (!name) {
    return "Project name is required.";
  }

  if (name.length < 2) {
    return "Project name must be at least 2 characters.";
  }

  if (name.length > 80) {
    return "Project name must be shorter than 80 characters.";
  }

  return "";
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const bodyText = await request.text();

    let body: any;

    try {
      body = JSON.parse(bodyText || "{}");
    } catch {
      return json(
        {
          ok: false,
          error: "Invalid JSON body.",
        },
        400
      );
    }

    const nameValidationMessage = validateProjectName(body.name);

    if (nameValidationMessage) {
      return json(
        {
          ok: false,
          error: nameValidationMessage,
        },
        400
      );
    }

    const projectType = normalizeProjectType(body.type);

    const project = await createProject({
      name: String(body.name || "").trim(),
      type: projectType,
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
        ok: false,
        error: error?.message || "Failed to create project.",
      },
      400
    );
  }
};