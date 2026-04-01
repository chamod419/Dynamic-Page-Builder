import type { APIRoute } from "astro";
import { listNodes } from "../../../lib/node-store.ts";    

export const prerender = false;


const json = (obj: any, status = 200) =>
    new Response(JSON.stringify(obj), {
        status,
        headers: { "Content-Type": "application/json" },
    });

export const GET: APIRoute = async () => {
    try {
        const nodes = await listNodes();

        return json(
            {
                ok:true,
                nodes,
            },
            200
        );
    } catch (error:any) {
        return json(
            {
                error: error.message || "Failed to list nodes",
            },
            500
        );
    }
};