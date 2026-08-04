/**
 * The landing page: the curriculum tree, drawn as an upside-down fractal tree.
 *
 * Everything here is derived from src/curriculum.ts — positions, colours, statuses and the
 * problem text on each edge. Nothing about the tree is hardcoded in markup.
 */

import { NODES, childrenOf } from "../curriculum.ts";
import type { CurriculumNode } from "../curriculum.ts";

// ───────────────────────── layout constants

const RAIL_STEP = 172; // vertical rhythm between nodes on a rail
const FORK_STEP = 242; // longer first stride so a fork has room to breathe
const FORK_SPREAD = 15; // degrees each branch tilts away from its parent rail
const TWIG_BASE = 38; // first twig's angle off its parent rail
const TWIG_FAN = 16; // extra angle per additional twig on the same parent
const TWIG_LEN = 184;
const TWIG_LEN_STEP = 42;
const TWIG_MAX_ANGLE = 84; // keep twigs pointing downward, never back up the page

const ROOT_WIDTH = 8.6;
const RAIL_TAPER = 0.985;
const FORK_TAPER = 0.68;
const TWIG_TAPER = 0.42;
const TWIG_MIN_WIDTH = 2.6;

// The two fonts below must stay identical to `.label` and `.question` in site.css: the
// canvas gauge below is what keeps labels from landing on top of each other, and it can
// only do that if it measures the font the browser will actually draw.
const LABEL_GAP = 13;
const LABEL_HEIGHT = 21;
const LABEL_FONT =
	'680 16px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const QUESTION_GAP = 25;
const QUESTION_FONT =
	'italic 14.5px Charter, "Bitstream Charter", "Iowan Old Style", Georgia, "Times New Roman", serif';
const QUESTION_LINE = 19.5;
const QUESTION_MAX_WIDTH = 225; // roughly 30 characters at this size
const PADDING = 26;

type Side = -1 | 1;

interface Placed {
	node: CurriculumNode;
	parent: Placed | null;
	x: number;
	y: number;
	/** Direction of the rail arriving here, in degrees from straight down; positive is right. */
	angle: number;
	/** Direction the edge leaves the parent, which is what makes forks curve. */
	departure: number;
	width: number;
	radius: number;
	depth: number;
	twig: boolean;
	labelSide: Side;
}

interface Box {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

// ───────────────────────── text measuring (exact, via canvas — no font guessing)

const gauge = document.createElement("canvas").getContext("2d");

function measure(text: string, font: string): number {
	if (!gauge) return text.length * 7;
	gauge.font = font;
	return gauge.measureText(text).width;
}

function wrap(text: string, font: string, maxWidth: number): string[] {
	const lines: string[] = [];
	let line = "";
	for (const word of text.split(/\s+/)) {
		const candidate = line ? `${line} ${word}` : word;
		if (line && measure(candidate, font) > maxWidth) {
			lines.push(line);
			line = word;
		} else {
			line = candidate;
		}
	}
	if (line) lines.push(line);
	return lines;
}

// ───────────────────────── geometry

function direction(angleDeg: number): { dx: number; dy: number } {
	const radians = (angleDeg * Math.PI) / 180;
	return { dx: Math.sin(radians), dy: Math.cos(radians) };
}

function overlaps(a: Box, b: Box, pad = 6): boolean {
	return (
		a.left - pad < b.right &&
		a.right + pad > b.left &&
		a.top - pad < b.bottom &&
		a.bottom + pad > b.top
	);
}

/** Cubic control points: leave along the parent's rail, arrive along the child's. */
function edgePath(placed: Placed): string {
	const parent = placed.parent;
	if (!parent) return "";
	const span = Math.hypot(placed.x - parent.x, placed.y - parent.y);
	const out = direction(placed.departure);
	const into = direction(placed.angle);
	const bend = span * 0.45;
	const c1x = parent.x + out.dx * bend;
	const c1y = parent.y + out.dy * bend;
	const c2x = placed.x - into.dx * bend;
	const c2y = placed.y - into.dy * bend;
	return `M ${parent.x} ${parent.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${placed.x} ${placed.y}`;
}

function cubicPoint(placed: Placed, t: number): { x: number; y: number } {
	const parent = placed.parent!;
	const span = Math.hypot(placed.x - parent.x, placed.y - parent.y);
	const out = direction(placed.departure);
	const into = direction(placed.angle);
	const bend = span * 0.45;
	const points = [
		{ x: parent.x, y: parent.y },
		{ x: parent.x + out.dx * bend, y: parent.y + out.dy * bend },
		{ x: placed.x - into.dx * bend, y: placed.y - into.dy * bend },
		{ x: placed.x, y: placed.y }
	] as const;
	const u = 1 - t;
	const weights = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
	let x = 0;
	let y = 0;
	for (let i = 0; i < 4; i++) {
		x += points[i]!.x * weights[i]!;
		y += points[i]!.y * weights[i]!;
	}
	return { x, y };
}

// ───────────────────────── laying out the tree

function layout(): Placed[] {
	const root = NODES.find(node => node.parent === null);
	if (!root) return [];

	const placedNodes: Placed[] = [];
	let trunkTwigs = 0; // twigs off the vertical trunk alternate sides

	function walk(placed: Placed): void {
		placedNodes.push(placed);
		const children = childrenOf(placed.node.id);
		const mains = children.filter(child => !child.side);
		const twigs = children.filter(child => child.side);

		const spreadStep = mains.length > 1 ? (2 * FORK_SPREAD) / (mains.length - 1) : 0;
		const halfFan = mains.length > 1 ? FORK_SPREAD : 0;

		mains.forEach((child, index) => {
			const forking = mains.length > 1;
			const angle = forking ? placed.angle - FORK_SPREAD + spreadStep * index : placed.angle;
			const step = forking ? FORK_STEP : RAIL_STEP;
			const heading = direction(angle);
			const width = placed.width * (forking ? FORK_TAPER : RAIL_TAPER);
			walk(
				make({
					node: child,
					parent: placed,
					x: placed.x + heading.dx * step,
					y: placed.y + heading.dy * step,
					angle,
					departure: placed.angle,
					width,
					depth: placed.depth + 1,
					twig: false
				})
			);
		});

		twigs.forEach((child, index) => {
			const outward: Side =
				Math.abs(placed.angle) > 5 ? (placed.angle > 0 ? 1 : -1) : trunkTwigs++ % 2 === 0 ? 1 : -1;
			const offset = halfFan + TWIG_BASE + index * TWIG_FAN;
			const raw = placed.angle + outward * offset;
			const angle = Math.max(-TWIG_MAX_ANGLE, Math.min(TWIG_MAX_ANGLE, raw));
			const heading = direction(angle);
			const length = TWIG_LEN + index * TWIG_LEN_STEP;
			walk(
				make({
					node: child,
					parent: placed,
					x: placed.x + heading.dx * length,
					y: placed.y + heading.dy * length,
					angle,
					departure: placed.angle * 0.4 + angle * 0.6,
					width: Math.max(TWIG_MIN_WIDTH, placed.width * TWIG_TAPER),
					depth: placed.depth + 1,
					twig: true
				})
			);
		});
	}

	walk(
		make({
			node: root,
			parent: null,
			x: 0,
			y: 0,
			angle: 0,
			departure: 0,
			width: ROOT_WIDTH,
			depth: 0,
			twig: false
		})
	);
	return placedNodes;
}

function make(seed: Omit<Placed, "radius" | "labelSide">): Placed {
	// Labels sit outward on a tilted rail; on the vertical trunk they alternate, which is
	// what keeps the trunk legible without a collision pass having to work hard.
	const labelSide: Side =
		Math.abs(seed.angle) > 5 ? (seed.angle > 0 ? 1 : -1) : seed.depth % 2 === 0 ? 1 : -1;
	return { ...seed, radius: 5.2 + seed.width * 0.7, labelSide };
}

// ───────────────────────── placing labels and questions without collisions

interface LabelBox {
	placed: Placed;
	side: Side;
	box: Box;
}

interface QuestionBox {
	placed: Placed;
	side: Side;
	lines: string[];
	x: number;
	top: number;
	box: Box;
}

function labelBox(placed: Placed, side: Side, width: number): Box {
	const inner = placed.x + side * (placed.radius + LABEL_GAP);
	return {
		left: side === 1 ? inner : inner - width,
		right: side === 1 ? inner + width : inner,
		top: placed.y - LABEL_HEIGHT / 2,
		bottom: placed.y + LABEL_HEIGHT / 2
	};
}

function questionBox(midX: number, midY: number, side: Side, width: number, height: number): Box {
	const inner = midX + side * QUESTION_GAP;
	return {
		left: side === 1 ? inner : inner - width,
		right: side === 1 ? inner + width : inner,
		top: midY - height / 2,
		bottom: midY + height / 2
	};
}

function arrange(placedNodes: Placed[]): { labels: LabelBox[]; questions: QuestionBox[] } {
	const obstacles: Box[] = [];

	for (const placed of placedNodes) {
		const reach = placed.radius + 4;
		obstacles.push({
			left: placed.x - reach,
			right: placed.x + reach,
			top: placed.y - reach,
			bottom: placed.y + reach
		});
		if (!placed.parent) continue;
		// Sample the curve so nothing is written on top of a branch.
		for (const t of [0.2, 0.35, 0.5, 0.65, 0.8]) {
			const point = cubicPoint(placed, t);
			const half = placed.width / 2 + 6;
			obstacles.push({
				left: point.x - half,
				right: point.x + half,
				top: point.y - half,
				bottom: point.y + half
			});
		}
	}

	const labels: LabelBox[] = [];
	for (const placed of placedNodes) {
		const width = measure(placed.node.title, LABEL_FONT);
		const preferred = labelBox(placed, placed.labelSide, width);
		const alternate = labelBox(placed, -placed.labelSide as Side, width);
		const free = (box: Box) => !obstacles.some(other => overlaps(box, other));
		const choice = free(preferred)
			? { side: placed.labelSide, box: preferred }
			: free(alternate)
				? { side: -placed.labelSide as Side, box: alternate }
				: { side: placed.labelSide, box: preferred };
		obstacles.push(choice.box);
		labels.push({ placed, side: choice.side, box: choice.box });
	}

	// Edge questions ride alongside main-rail segments only. Twig questions, and any question
	// that cannot find clear air, live in the detail panel instead.
	const questions: QuestionBox[] = [];
	for (const placed of placedNodes) {
		if (!placed.parent || placed.twig) continue;
		const lines = wrap(placed.node.problem, QUESTION_FONT, QUESTION_MAX_WIDTH);
		const width = Math.max(...lines.map(line => measure(line, QUESTION_FONT)));
		const height = lines.length * QUESTION_LINE;
		const midX = (placed.x + placed.parent.x) / 2;
		const midY = (placed.y + placed.parent.y) / 2;
		const outward: Side =
			Math.abs(placed.angle) > 5 ? placed.labelSide : (-placed.labelSide as Side);

		let chosen: { side: Side; box: Box } | null = null;
		// Bigger type means bigger blocks, so a question that misses at the midpoint gets a few
		// slides along its own edge before it gives up and lives in the detail panel instead.
		for (const nudge of [0, 40, -40, 76, -76]) {
			for (const side of [outward, -outward as Side]) {
				const box = questionBox(midX, midY + nudge, side, width, height);
				if (!obstacles.some(other => overlaps(box, other))) {
					chosen = { side, box };
					break;
				}
			}
			if (chosen) break;
		}
		if (!chosen) continue;

		obstacles.push(chosen.box);
		questions.push({
			placed,
			side: chosen.side,
			lines,
			x: chosen.side === 1 ? chosen.box.left : chosen.box.right,
			top: chosen.box.top,
			box: chosen.box
		});
	}

	return { labels, questions };
}

// ───────────────────────── drawing

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl<K extends keyof SVGElementTagNameMap>(
	tag: K,
	attrs: Record<string, string | number> = {}
): SVGElementTagNameMap[K] {
	const element = document.createElementNS(SVG_NS, tag);
	for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, String(value));
	return element;
}

const nextNode = NODES.find(node => node.status === "next");

function draw(): void {
	const svg = document.getElementById("tree") as SVGSVGElement | null;
	const edgeLayer = document.getElementById("tree-edges");
	const questionLayer = document.getElementById("tree-questions");
	const nodeLayer = document.getElementById("tree-nodes");
	if (!svg || !edgeLayer || !questionLayer || !nodeLayer) return;

	const placedNodes = layout();
	const { labels, questions } = arrange(placedNodes);

	for (const placed of placedNodes) {
		if (!placed.parent) continue;
		edgeLayer.append(
			svgEl("path", {
				class: `edge br-${placed.node.branch}`,
				d: edgePath(placed),
				"stroke-width": placed.width.toFixed(2)
			})
		);
	}

	for (const question of questions) {
		const text = svgEl("text", {
			class: `question br-${question.placed.node.branch}`,
			"text-anchor": question.side === 1 ? "start" : "end"
		});
		question.lines.forEach((line, index) => {
			const tspan = svgEl("tspan", {
				x: question.x.toFixed(1),
				y: (question.top + (index + 0.8) * QUESTION_LINE).toFixed(1)
			});
			tspan.textContent = line;
			text.append(tspan);
		});
		questionLayer.append(text);
	}

	const groups = new Map<string, SVGGElement>();
	for (const label of labels) {
		const placed = label.placed;
		const group = svgEl("g", {
			class: `node br-${placed.node.branch} st-${placed.node.status}`,
			tabindex: 0,
			role: "button",
			"aria-label": `${placed.node.title} — ${placed.node.status}`
		});

		if (placed.node.id === nextNode?.id) {
			group.append(
				svgEl("circle", { class: "halo", cx: placed.x, cy: placed.y, r: placed.radius + 9 })
			);
		}
		group.append(
			svgEl("circle", { class: "ring", cx: placed.x, cy: placed.y, r: placed.radius + 5.5 })
		);
		group.append(
			svgEl("circle", { class: "marker", cx: placed.x, cy: placed.y, r: placed.radius })
		);

		const text = svgEl("text", {
			class: "label",
			x: (label.side === 1 ? label.box.left : label.box.right).toFixed(1),
			y: placed.y.toFixed(1),
			"text-anchor": label.side === 1 ? "start" : "end"
		});
		text.textContent = placed.node.title;
		group.append(text);

		group.addEventListener("click", () => select(placed.node.id));
		group.addEventListener("keydown", event => {
			if (event.key !== "Enter" && event.key !== " ") return;
			event.preventDefault();
			select(placed.node.id);
		});

		groups.set(placed.node.id, group);
		nodeLayer.append(group);
	}

	selectable = groups;

	const boxes = [...labels.map(l => l.box), ...questions.map(q => q.box)];
	for (const placed of placedNodes) {
		const reach = placed.radius + 11;
		boxes.push({
			left: placed.x - reach,
			right: placed.x + reach,
			top: placed.y - reach,
			bottom: placed.y + reach
		});
	}
	const left = Math.min(...boxes.map(box => box.left)) - PADDING;
	const right = Math.max(...boxes.map(box => box.right)) + PADDING;
	const top = Math.min(...boxes.map(box => box.top)) - PADDING;
	const bottom = Math.max(...boxes.map(box => box.bottom)) + PADDING;
	svg.setAttribute("viewBox", `${left} ${top} ${right - left} ${bottom - top}`);
	// Cap the drawn width at the tree's own width so the SVG is never scaled up past 1:1.
	// Label and question text then appear at the pixel sizes they were measured at, which is
	// what keeps them readable instead of shrinking to fit the window.
	svg.style.maxWidth = `${Math.round(right - left)}px`;
}

// ───────────────────────── the detail panel

let selectable = new Map<string, SVGGElement>();
let selectedId: string | null = null;

const STATUS_TEXT: Record<CurriculumNode["status"], string> = {
	built: "built",
	next: "next up",
	planned: "planned",
	future: "future"
};

function element<T extends HTMLElement>(id: string): T | null {
	return document.getElementById(id) as T | null;
}

function select(id: string): void {
	const node = NODES.find(candidate => candidate.id === id);
	const panel = element("detail");
	if (!node || !panel) return;

	for (const [otherId, group] of selectable) group.classList.toggle("is-selected", otherId === id);
	selectedId = id;

	panel.style.setProperty("--branch-color", `var(--${node.branch})`);

	const setText = (target: string, value: string) => {
		const found = element(target);
		if (found) found.textContent = value;
	};
	setText("detail-id", node.id);
	setText("detail-title", node.title);
	setText("detail-status", STATUS_TEXT[node.status]);
	setText("detail-problem", node.problem);
	setText("detail-solution", node.solution);

	const jargon = element("detail-jargon");
	const jargonSection = element("detail-jargon-section");
	if (jargon && jargonSection) {
		jargon.replaceChildren(
			...node.jargon.map(term => {
				const item = document.createElement("li");
				item.textContent = term;
				return item;
			})
		);
		jargonSection.hidden = node.jargon.length === 0;
	}

	const link = element<HTMLAnchorElement>("detail-link");
	const unbuilt = element("detail-unbuilt");
	const isBuilt = node.status === "built";
	if (link) {
		link.href = `/${node.id}`;
		link.hidden = !isBuilt;
	}
	if (unbuilt) unbuilt.hidden = isBuilt;

	panel.hidden = false;
	panel.scrollTop = 0;
}

function closePanel(): void {
	const panel = element("detail");
	if (panel) panel.hidden = true;
	if (selectedId) selectable.get(selectedId)?.classList.remove("is-selected");
	selectedId = null;
}

// ───────────────────────── theme stamp

const THEME_KEY = "tree-theme";
const THEMES = ["system", "light", "dark"] as const;

function applyTheme(theme: string): void {
	if (theme === "light" || theme === "dark") {
		document.documentElement.setAttribute("data-theme", theme);
	} else {
		document.documentElement.removeAttribute("data-theme");
	}
	const button = element("theme-toggle");
	if (button) button.textContent = `Theme: ${theme}`;
}

function setUpTheme(): void {
	const stored = localStorage.getItem(THEME_KEY) ?? "system";
	applyTheme(stored);
	element("theme-toggle")?.addEventListener("click", () => {
		const current = localStorage.getItem(THEME_KEY) ?? "system";
		const next = THEMES[(THEMES.indexOf(current as (typeof THEMES)[number]) + 1) % THEMES.length]!;
		localStorage.setItem(THEME_KEY, next);
		applyTheme(next);
	});
}

// ───────────────────────── boot

draw();
setUpTheme();
element("detail-close")?.addEventListener("click", closePanel);
document.addEventListener("keydown", event => {
	if (event.key === "Escape") closePanel();
});
