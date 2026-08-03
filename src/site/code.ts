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
//
// On a wide screen the page is three columns: a rail of the lesson's `##` sections,
// the prose (with the demos where main.ts asked for them), and one panel holding the
// whole file's code. Scrolling or hovering a section lights up that section's code and
// fades the rest. Below 1000px the same chunks render as one column in file order.

export type ShowCue = string[] | "none";

type Chunk =
	| { kind: "prose"; text: string; show?: ShowCue }
	| { kind: "code"; text: string; name?: string }
	| { kind: "demo"; name: string };

export function parseLiterate(source: string): Chunk[] {
	const chunks: Chunk[] = [];
	const lines = source.split("\n");
	let codeLines: string[] = [];
	let pendingName: string | null = null;
	let pendingShow: ShowCue | null = null;
	let i = 0;

	const flushCode = () => {
		const text = codeLines.join("\n").replace(/^\n+|\n+$/g, "");
		if (text) {
			chunks.push(pendingName ? { kind: "code", text, name: pendingName } : { kind: "code", text });
			pendingName = null;
		}
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
		// `//! code: name` names the code block that follows it.
		const codeName = line.match(/^\/\/!\s*code:\s*(\S+)\s*$/);
		if (codeName) {
			flushCode();
			pendingName = codeName[1]!;
			i++;
			continue;
		}
		// `//! show: a, b` (or `//! show: none`) is the subtitle cue for the section the
		// next prose block opens.
		const show = line.match(/^\/\/!\s*show:\s*(.+?)\s*$/);
		if (show) {
			flushCode();
			const value = show[1]!;
			pendingShow =
				value === "none"
					? "none"
					: value
							.split(",")
							.map(name => name.trim())
							.filter(name => name.length > 0);
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
			const text = prose.join("\n").trim();
			chunks.push(
				pendingShow ? { kind: "prose", text, show: pendingShow } : { kind: "prose", text }
			);
			pendingShow = null;
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

// ── sections ────────────────────────────────────────────────────────────────
//
// A `##` heading in the prose opens a section. Everything after it — prose, code,
// demos — belongs to that section until the next `##`. Anything before the first
// heading belongs to section 1. Items keep the order they have in main.ts, which is
// what the one-column layout renders straight out.

type Item =
	| { kind: "prose"; html: string }
	| { kind: "code"; text: string; name: string }
	| { kind: "demo"; name: string };

export interface Section {
	index: number; // 1-based, shown in the rail as 01, 02, …
	title: string;
	slug: string; // the anchor the rail links to
	items: Item[];
	/** The section's subtitle cue, when its opening prose block carried one. */
	show?: ShowCue;
}

// A block with no `//! code:` name takes the name of its first declared identifier.
const DECLARATION =
	/(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:const|let|var|function\*?|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/;

function nameCodeChunks(chunks: Chunk[]): Map<Chunk, string> {
	const names = new Map<Chunk, string>();
	const taken = new Set<string>();
	let count = 0;
	for (const chunk of chunks) {
		if (chunk.kind !== "code") continue;
		count++;
		const base = chunk.name ?? chunk.text.match(DECLARATION)?.[1] ?? `code-${count}`;
		let name = base;
		let suffix = 2;
		while (taken.has(name)) name = `${base}-${suffix++}`;
		taken.add(name);
		names.set(chunk, name);
	}
	return names;
}

function plainText(md: string): string {
	return md
		.replace(/`([^`]+)`/g, "$1")
		.replace(/\*\*([^*]+)\*\*/g, "$1")
		.replace(/\*([^*]+)\*/g, "$1")
		.trim();
}

function slugFor(title: string, index: number, taken: Set<string>): string {
	const base =
		title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") || `section-${index}`;
	let slug = base;
	let suffix = 2;
	while (taken.has(slug)) slug = `${base}-${suffix++}`;
	taken.add(slug);
	return slug;
}

export function toSections(chunks: Chunk[], firstTitle = "Start"): Section[] {
	const sections: Section[] = [];
	const taken = new Set<string>();
	const codeNames = nameCodeChunks(chunks);
	let current: Section | undefined;

	const open = (title: string): Section => {
		const index = sections.length + 1;
		const section: Section = { index, title, slug: slugFor(title, index, taken), items: [] };
		sections.push(section);
		current = section;
		return section;
	};
	const ensure = (): Section => current ?? open(firstTitle);

	for (const chunk of chunks) {
		if (chunk.kind === "code") {
			ensure().items.push({ kind: "code", text: chunk.text, name: codeNames.get(chunk)! });
			continue;
		}
		if (chunk.kind === "demo") {
			ensure().items.push({ kind: "demo", name: chunk.name });
			continue;
		}
		// A chunk's cue lands on the section its first heading opens; a cue on a
		// heading-less chunk lands on the section the chunk sits in.
		let cue = chunk.show;
		let buffer: string[] = [];
		const flushProse = () => {
			if (buffer.length === 0) return;
			ensure().items.push({ kind: "prose", html: miniMarkdown(buffer.join("\n\n")) });
			buffer = [];
		};
		for (const block of chunk.text.split(/\n\s*\n/)) {
			const trimmed = block.trim();
			if (!trimmed) continue;
			if (trimmed.startsWith("## ")) {
				flushProse();
				const opened = open(plainText(trimmed.slice(3)));
				if (cue !== undefined) {
					opened.show = cue;
					cue = undefined;
				}
			}
			buffer.push(trimmed);
		}
		flushProse();
		if (cue !== undefined) {
			const section = ensure();
			if (section.show === undefined) section.show = cue;
		}
	}
	return sections;
}

/**
 * Resolve, per section, which code blocks are lit — the subtitle plan.
 * `show: none` lights nothing. A cue list lights exactly those blocks. No cue lights
 * the section's own code, and a section with neither cue nor code inherits the
 * previous section's lit set so the panel never flickers blank mid-lesson.
 * A cue naming a block that does not exist throws.
 */
export function litPlan(sections: Section[]): Map<number, string[]> {
	const known = new Set<string>();
	for (const section of sections) {
		for (const item of section.items) if (item.kind === "code") known.add(item.name);
	}
	const plan = new Map<number, string[]>();
	let previous: string[] = [];
	for (const section of sections) {
		let lit: string[];
		if (section.show === "none") lit = [];
		else if (section.show !== undefined) {
			for (const name of section.show) {
				if (!known.has(name)) {
					throw new Error(
						`Section "${section.title}" cues unknown code block "${name}". ` +
							`Known blocks: ${[...known].join(", ")}`
					);
				}
			}
			lit = section.show;
		} else {
			const own = section.items.flatMap(item => (item.kind === "code" ? [item.name] : []));
			lit = own.length > 0 ? own : previous;
		}
		plan.set(section.index, lit);
		previous = lit;
	}
	return plan;
}

// ── rendering ───────────────────────────────────────────────────────────────

const WIDE_LAYOUT = "(min-width: 1000px)";

function proseBlock(html: string): HTMLElement {
	const div = document.createElement("div");
	div.className = "prose";
	div.innerHTML = html;
	return div;
}

function codeBlock(text: string): HTMLElement {
	const pre = document.createElement("pre");
	pre.className = "code";
	pre.innerHTML = `<code>${highlight(text)}</code>`;
	return pre;
}

/**
 * The demo markup is cloned out of its <template> once and then moved between
 * layouts. Re-cloning would hand the page fresh elements, and the lesson's client.ts
 * holds the originals — its buttons and canvases would go dead on a resize.
 */
function demoLoader(): (name: string) => Node[] {
	const cloned = new Map<string, Node[]>();
	return (name: string): Node[] => {
		const already = cloned.get(name);
		if (already) return already;
		const template = document.querySelector<HTMLTemplateElement>(`template[data-demo="${name}"]`);
		const nodes = template ? Array.from(template.content.cloneNode(true).childNodes) : [];
		cloned.set(name, nodes);
		return nodes;
	};
}

async function copySource(source: string, button: HTMLButtonElement): Promise<void> {
	let copied = false;
	try {
		await navigator.clipboard.writeText(source);
		copied = true;
	} catch {
		// The clipboard API needs a secure context, which a plain-http host is not.
		const field = document.createElement("textarea");
		field.value = source;
		field.style.position = "fixed";
		field.style.opacity = "0";
		document.body.append(field);
		field.select();
		copied = document.execCommand("copy");
		field.remove();
	}
	button.textContent = copied ? "Copied" : "Copy failed";
	window.setTimeout(() => {
		button.textContent = "Copy";
	}, 1600);
}

/** One column, in file order: what narrow screens get. */
function renderColumn(target: HTMLElement, sections: Section[], demo: (n: string) => Node[]): void {
	for (const section of sections) {
		for (const item of section.items) {
			if (item.kind === "prose") target.append(proseBlock(item.html));
			else if (item.kind === "code") target.append(codeBlock(item.text));
			else target.append(...demo(item.name));
		}
	}
}

function buildRail(sections: Section[]): { rail: HTMLElement; links: Map<number, HTMLElement> } {
	const rail = document.createElement("nav");
	rail.className = "rail";
	rail.setAttribute("aria-label", "Sections of this lesson");
	const list = document.createElement("ol");
	list.className = "rail-list";
	const links = new Map<number, HTMLElement>();

	for (const section of sections) {
		const item = document.createElement("li");
		const link = document.createElement("a");
		link.className = "rail-link";
		link.href = `#${section.slug}`;
		link.title = section.title;

		const number = document.createElement("span");
		number.className = "rail-num";
		number.textContent = String(section.index).padStart(2, "0");
		const label = document.createElement("span");
		label.className = "rail-label";
		label.textContent = section.title;

		link.append(number, label);
		item.append(link);
		list.append(item);
		links.set(section.index, link);
	}
	rail.append(list);
	return { rail, links };
}

/** Rail + prose + the whole file's code in one sticky panel. Returns a teardown. */
function renderPanels(
	target: HTMLElement,
	sections: Section[],
	source: string,
	demo: (n: string) => Node[]
): () => void {
	const { rail, links } = buildRail(sections);

	const column = document.createElement("div");
	column.className = "prose-column";
	const sectionElements: HTMLElement[] = [];
	for (const section of sections) {
		const element = document.createElement("section");
		element.className = "lesson-section";
		element.id = section.slug;
		element.dataset.section = String(section.index);
		for (const item of section.items) {
			if (item.kind === "prose") element.append(proseBlock(item.html));
			else if (item.kind === "demo") element.append(...demo(item.name));
		}
		column.append(element);
		sectionElements.push(element);
	}

	const panel = document.createElement("aside");
	panel.className = "code-panel";
	panel.setAttribute("aria-label", "The code of this lesson");

	const head = document.createElement("div");
	head.className = "code-head";
	const fileName = document.createElement("span");
	fileName.className = "code-file";
	fileName.textContent = "main.ts";
	const copy = document.createElement("button");
	copy.type = "button";
	copy.className = "code-copy";
	copy.textContent = "Copy";
	copy.addEventListener("click", () => void copySource(source, copy));
	head.append(fileName, copy);

	const scroll = document.createElement("div");
	scroll.className = "code-scroll";
	const preInFileOrder: HTMLElement[] = [];
	for (const section of sections) {
		for (const item of section.items) {
			if (item.kind !== "code") continue;
			const pre = codeBlock(item.text);
			pre.dataset.section = String(section.index);
			pre.dataset.name = item.name;
			scroll.append(pre);
			preInFileOrder.push(pre);
		}
	}
	panel.append(head, scroll);
	target.append(rail, column, panel);

	// ── keeping the code panel in step with the prose ─────────────────────────
	//
	// The subtitle plan decides what is lit while the reader is in each section.
	// Everything else fades; nothing is ever removed from the panel.

	const plan = litPlan(sections);
	const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	let active = 0;

	const setActive = (index: number): void => {
		if (index === active) return;
		active = index;
		for (const [i, link] of links) {
			const on = i === index;
			link.classList.toggle("is-active", on);
			if (on) link.setAttribute("aria-current", "true");
			else link.removeAttribute("aria-current");
		}
		const lit = new Set(plan.get(index) ?? []);
		for (const pre of preInFileOrder) {
			pre.classList.toggle("is-active", lit.has(pre.dataset.name!));
		}
		const first = preInFileOrder.find(pre => lit.has(pre.dataset.name!));
		if (first) {
			scroll.scrollTo({
				top: Math.max(0, first.offsetTop - 12),
				behavior: still ? "auto" : "smooth"
			});
		}
	};

	const visible = new Set<number>();
	const observer = new IntersectionObserver(
		entries => {
			for (const entry of entries) {
				const index = Number((entry.target as HTMLElement).dataset.section);
				if (entry.isIntersecting) visible.add(index);
				else visible.delete(index);
			}
			// The topmost section in the reading band wins.
			if (visible.size > 0) setActive(Math.min(...visible));
		},
		{ rootMargin: "-12% 0px -55% 0px" }
	);

	for (const element of sectionElements) {
		observer.observe(element);
		const index = Number(element.dataset.section);
		element.addEventListener("mouseenter", () => setActive(index));
		element.addEventListener("focusin", () => setActive(index));
	}

	setActive(sections[0]?.index ?? 1);
	return () => observer.disconnect();
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
	const source = await response.text();
	const heading = document.querySelector("h1")?.textContent?.trim();
	const sections = toSections(parseLiterate(source), heading || "Start");
	try {
		// Validate the subtitle cues up front, whatever the layout: a typo in a
		// `//! show:` name fails loudly here instead of fading silently.
		litPlan(sections);
	} catch (error) {
		target.textContent = String(error instanceof Error ? error.message : error);
		throw error;
	}
	const demo = demoLoader();

	const wide = window.matchMedia(WIDE_LAYOUT);
	let teardown: (() => void) | null = null;

	const draw = (): void => {
		teardown?.();
		teardown = null;
		target.replaceChildren();
		target.classList.toggle("lesson-panels", wide.matches);
		target.classList.toggle("lesson-column", !wide.matches);
		if (wide.matches) teardown = renderPanels(target, sections, source, demo);
		else renderColumn(target, sections, demo);
	};

	draw();
	// Crossing the breakpoint re-lays the page out. The demo nodes move rather than
	// being rebuilt, so the controls the lesson's client.ts wired up keep working.
	wide.addEventListener("change", draw);
}
