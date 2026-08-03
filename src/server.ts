/**
 * The server for "Learning AI From First Principles".
 *
 * Routes are derived from the manifest, never hand-listed: "/" is the tree, and every
 * manifest node whose lesson folder exists on disk gets "/<node.id>". Adding a node is
 * a folder plus a manifest entry — this file is not edited.
 */

import type { HTMLBundle } from "bun";
import { NODES } from "./curriculum.ts";
import landing from "./site/index.html";

const routes: Record<string, HTMLBundle> = { "/": landing };
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
