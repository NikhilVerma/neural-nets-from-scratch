/**
 * The server for "Learning AI From First Principles".
 *
 * Routes are derived from the manifest, never hand-listed: "/" is the tree, and every
 * manifest node whose lesson folder exists on disk gets "/<node.id>". Adding a node is
 * a folder plus a manifest entry — this file is not edited.
 */

import type { HTMLBundle } from "bun";
import { NODES, nodeById } from "./curriculum.ts";
import landing from "./site/index.html";

// Lesson pages display their own main.ts (see site/code.ts), fetched raw from here.
async function serveLessonSource(req: Request): Promise<Response> {
	const match = new URL(req.url).pathname.match(/^\/source\/(.+)\/main\.ts$/);
	if (!match || !nodeById.has(match[1]!)) return new Response("Not found", { status: 404 });
	const file = Bun.file(`${import.meta.dir}/tree/${match[1]}/main.ts`);
	if (!(await file.exists())) return new Response("Not found", { status: 404 });
	return new Response(file, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

// Review notes (see site/review.ts): in development, selecting text on a lesson page
// and leaving a note appends it to reviews.jsonl at the repo root. The route does not
// exist in production, and the overlay stays dormant when its probe gets a 404.
const REVIEW_FILE = `${import.meta.dir}/../reviews.jsonl`;

async function handleReview(req: Request): Promise<Response> {
	if (req.method === "GET") return Response.json({ enabled: true });
	if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
	const note = await req.json();
	const line = JSON.stringify({ ...note, createdAt: new Date().toISOString() });
	const existing = (await Bun.file(REVIEW_FILE).exists()) ? await Bun.file(REVIEW_FILE).text() : "";
	await Bun.write(REVIEW_FILE, existing + line + "\n");
	return Response.json({ saved: true });
}

const routes: Record<string, HTMLBundle | ((req: Request) => Promise<Response>)> = {
	"/": landing,
	"/favicon.ico": async () => new Response(null, { status: 204 }),
	"/source/*": serveLessonSource
};
if (process.env.NODE_ENV !== "production") routes["/review"] = handleReview;
const missing: string[] = [];

for (const node of NODES) {
	// Most nodes are designed but not built yet; a missing folder is the normal case.
	if (!(await Bun.file(`${import.meta.dir}/tree/${node.id}/index.html`).exists())) {
		missing.push(node.id);
		continue;
	}
	const lesson = await import(`./tree/${node.id}/index.html`);
	routes[`/${node.id}`] = lesson.default;
}

const server = Bun.serve({
	routes,

	// Development mode enables hot module reloading, detailed errors, and browser
	// console forwarding to this terminal.
	development: {
		hmr: true,
		console: true
	}
});

console.log(`Serving the tree at ${server.url}`);
console.log(`${NODES.length - missing.length} of ${NODES.length} lessons built.`);
