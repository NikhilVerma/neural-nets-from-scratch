// Prose rubric: every piece of text in this repo — lesson prose, docs, code
// comments, UI copy — must pass SlopSift. Run it with `bun run slop`.
//
// This wrapper exists because SlopSift has no per-rule disable flag, and one rule
// is intentionally off here: ai-style/mechanical-outline fires on the curriculum's
// repeating problem/solution scaffolding, and that repetition is the product.

const DISABLED_RULES = new Set(["ai-style/mechanical-outline"]);

interface Message {
	ruleId: string;
	line: number;
	column: number;
	message: string;
	level?: string;
}

interface FileResult {
	filePath: string;
	messages: Message[];
}

const lint = Bun.spawn(["bunx", "slopsift", ".", "--format", "json", "--exit-zero"], {
	stdout: "pipe",
	stderr: "inherit"
});
const output = await new Response(lint.stdout).text();
if ((await lint.exited) === 2) process.exit(2);

const results: FileResult[] = JSON.parse(output);
let findings = 0;
for (const file of results) {
	const kept = file.messages.filter(message => !DISABLED_RULES.has(message.ruleId));
	if (kept.length === 0) continue;
	console.log(`\n${file.filePath}`);
	for (const message of kept) {
		findings++;
		console.log(
			`  ${message.line}:${message.column}  ${message.level ?? "warn"}  ${message.message}  [${message.ruleId}]`
		);
	}
}

if (findings > 0) {
	console.log(
		`\n${findings} findings. Fix the text — do not add rules to DISABLED_RULES casually.`
	);
	process.exit(1);
}
console.log("Clean: no slop findings.");
