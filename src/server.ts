/**
 * Fullstack Bun server for "Learning AI From First Principles"
 *
 * This server:
 * - Routes HTML files and automatically bundles their scripts and styles
 * - Handles API endpoints for training and data
 * - Serves static assets
 * - Supports development mode with hot reloading
 */

import { serve } from "bun";
import stage1_1 from "./stages/1.1/index.html";

const server = serve({
	routes: {
		// HTML imports are automatically bundled
		"/": stage1_1,
		"/1.1": stage1_1
	},

	// Development mode enables:
	// - Hot module reloading (HMR)
	// - Detailed error messages
	// - Console log forwarding from browser to terminal
	development: {
		hmr: true,
		console: true
	}
});

console.log(`🚀 Server running at ${server.url}`);
console.log(`📚 Open ${server.url} in your browser`);
