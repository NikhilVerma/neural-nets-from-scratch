// Site plumbing, not part of the curriculum.
//
// main.ts IS the lesson page. Each lesson's main.ts is written literate-style:
// block comments starting at column 0 are the prose (with a little markdown),
// everything else is the real runnable code, and `//! demo: name` lines mark where
// the page injects the interactive demo declared as <template data-demo="name"> in
// the lesson's index.html shell. This module fetches the raw file from
// /source/<node-id>/main.ts and renders it. The code a learner reads is the code
// that runs — there is no paraphrase to drift.
//
// `//` comments belong to the code and stay inside the code blocks.

type Chunk =
	| { kind: "prose"; text: string }
	| { kind: "code"; text: string }
	| { kind: "demo"; name: string };

export function parseLiterate(source: string): Chunk[] {
	const chunks: Chunk[] = [];
	const lines = source.split("\n");
	let codeLines: string[] = [];
	let i = 0;

	const flushCode = () => {
		const text = codeLines.join("\n").replace(/^\n+|\n+$/g, "");
		if (text) chunks.push({ kind: "code", text });
		codeLines = [];
	};

	while (i < lines.length) {
		const line = lines[i]!;
		const demo = line.match(/^\/\/!\s*demo:\s*(\S+)/);
		if (demo) {
			flushCode();
			chunks.push({ kind: "demo", name: demo[1]! });
			i++;
			continue;
		}
		// Only block comments that start at column 0 are prose; indented ones are code.
		if (line.startsWith("/*")) {
			flushCode();
			const prose: string[] = [];
			let rest = line.replace(/^\/\*+/, "");
			while (!rest.includes("*/")) {
				prose.push(rest);
				i++;
				rest = i < lines.length ? lines[i]! : "*/";
			}
			prose.push(rest.slice(0, rest.indexOf("*/")));
			i++;
			chunks.push({ kind: "prose", text: prose.join("\n").trim() });
			continue;
		}
		codeLines.push(line);
		i++;
	}
	flushCode();
	return chunks;
}

function escapeHtml(text: string): string {
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(md: string): string {
	// Code spans are lifted out before bold/italic run, so a `*` inside backticks
	// can never pair with a stray asterisk elsewhere in the paragraph.
	const codeSpans: string[] = [];
	const withPlaceholders = escapeHtml(md).replace(/`([^`]+)`/g, (_, span: string) => {
		codeSpans.push(`<code>${span}</code>`);
		return `\u0000${codeSpans.length - 1}\u0000`;
	});
	return withPlaceholders
		.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
		.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>")
		.replace(/\u0000(\d+)\u0000/g, (_, index: string) => codeSpans[Number(index)]!);
}

/** The few markdown shapes lesson prose is allowed: ##, ###, > quote, - list, paragraphs. */
export function miniMarkdown(text: string): string {
	const blocks = text.split(/\n\s*\n/);
	const html: string[] = [];
	for (const block of blocks) {
		const trimmed = block.trim();
		if (!trimmed) continue;
		if (trimmed.startsWith("### ")) html.push(`<h3>${inline(trimmed.slice(4))}</h3>`);
		else if (trimmed.startsWith("## ")) html.push(`<h2>${inline(trimmed.slice(3))}</h2>`);
		else if (trimmed.split("\n").every(l => l.trim().startsWith(">")))
			html.push(
				`<blockquote class="problem">${inline(
					trimmed
						.split("\n")
						.map(l => l.trim().replace(/^>\s?/, ""))
						.join(" ")
				)}</blockquote>`
			);
		else if (trimmed.split("\n").every(l => l.trim().startsWith("- ")))
			html.push(
				`<ul>${trimmed
					.split("\n")
					.map(l => `<li>${inline(l.trim().slice(2))}</li>`)
					.join("")}</ul>`
			);
		else html.push(`<p>${inline(trimmed.replace(/\n/g, " "))}</p>`);
	}
	return html.join("\n");
}

const KEYWORDS = new Set(
	(
		"const let var function return for of in if else while do export import from new " +
		"class extends this type interface break continue true false null undefined typeof " +
		"instanceof void async await switch case default throw try catch"
	).split(" ")
);

const TOKEN =
	/(\/\/.*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d[\d_]*(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)/g;

export function highlight(code: string): string {
	let html = "";
	let last = 0;
	for (const match of code.matchAll(TOKEN)) {
		html += escapeHtml(code.slice(last, match.index));
		const [text, comment, string, number, word] = match;
		if (comment) html += `<span class="tok-cmt">${escapeHtml(text)}</span>`;
		else if (string) html += `<span class="tok-str">${escapeHtml(text)}</span>`;
		else if (number) html += `<span class="tok-num">${escapeHtml(text)}</span>`;
		else if (word && KEYWORDS.has(word)) html += `<span class="tok-kw">${escapeHtml(text)}</span>`;
		else html += escapeHtml(text);
		last = match.index + text.length;
	}
	return html + escapeHtml(code.slice(last));
}

/**
 * Render this lesson's main.ts into `target`. Demo templates are cloned into place
 * where main.ts says `//! demo: name`. Returns once the DOM is complete, so callers
 * can wire up demo controls afterwards.
 */
export async function renderLesson(target: HTMLElement): Promise<void> {
	const nodeId = location.pathname.replace(/^\/+|\/+$/g, "");
	const response = await fetch(`/source/${nodeId}/main.ts`);
	if (!response.ok) {
		target.textContent = "Could not load this lesson's main.ts.";
		return;
	}
	for (const chunk of parseLiterate(await response.text())) {
		if (chunk.kind === "prose") {
			const div = document.createElement("div");
			div.className = "prose";
			div.innerHTML = miniMarkdown(chunk.text);
			target.append(div);
		} else if (chunk.kind === "code") {
			const pre = document.createElement("pre");
			pre.className = "code";
			pre.innerHTML = `<code>${highlight(chunk.text)}</code>`;
			target.append(pre);
		} else {
			const template = document.querySelector<HTMLTemplateElement>(
				`template[data-demo="${chunk.name}"]`
			);
			if (template) target.append(template.content.cloneNode(true));
		}
	}
}
