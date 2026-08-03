// Pins the literate format and the subtitle-cue convention documented in
// ARCHITECTURE.md, so a renderer change cannot quietly change what lessons mean.

import { test, expect } from "bun:test";
import { parseLiterate, toSections, litPlan, miniMarkdown } from "./code.ts";

const SAMPLE = [
	"//! show: none",
	"/*",
	"## Welcome",
	"",
	"No code belongs to this section.",
	"*/",
	"",
	"/*",
	"## The machine",
	"",
	"Here we build it.",
	"*/",
	"",
	"export function runEngine(x: number): number {",
	"\treturn x;",
	"}",
	"",
	"//! code: the-search",
	"export interface Search {",
	"\tbest: number;",
	"}",
	"",
	"//! show: the-search",
	"/*",
	"## Watch it break",
	"",
	"Look back at the search.",
	"*/",
	"",
	"//! demo: staircase",
	"",
	"/*",
	"## Onward",
	"",
	"Neither cue nor code here.",
	"*/",
	""
].join("\n");

test("directives never leak into code blocks", () => {
	const chunks = parseLiterate(SAMPLE);
	for (const chunk of chunks) {
		if (chunk.kind === "code") expect(chunk.text).not.toContain("//!");
	}
});

test("a block takes its //! code: name, and an unnamed block its first identifier", () => {
	const sections = toSections(parseLiterate(SAMPLE));
	const names = sections.flatMap(s => s.items.flatMap(i => (i.kind === "code" ? [i.name] : [])));
	expect(names).toEqual(["runEngine", "the-search"]);
});

test("show: none lights nothing", () => {
	const sections = toSections(parseLiterate(SAMPLE));
	const plan = litPlan(sections);
	expect(sections[0]!.title).toBe("Welcome");
	expect(plan.get(1)).toEqual([]);
});

test("no cue lights the section's own code", () => {
	const plan = litPlan(toSections(parseLiterate(SAMPLE)));
	expect(plan.get(2)).toEqual(["runEngine", "the-search"]);
});

test("a cue list lights exactly the named blocks", () => {
	const plan = litPlan(toSections(parseLiterate(SAMPLE)));
	expect(plan.get(3)).toEqual(["the-search"]);
});

test("a section with neither cue nor code inherits the previous lit set", () => {
	const plan = litPlan(toSections(parseLiterate(SAMPLE)));
	expect(plan.get(4)).toEqual(["the-search"]);
});

test("a cue naming a missing block throws, and says what exists", () => {
	const broken = SAMPLE.replace("//! show: the-search", "//! show: the-serach");
	expect(() => litPlan(toSections(parseLiterate(broken)))).toThrow(/the-serach/);
	expect(() => litPlan(toSections(parseLiterate(broken)))).toThrow(/runEngine/);
});

test("demo markers stay in their section", () => {
	const sections = toSections(parseLiterate(SAMPLE));
	const breakSection = sections.find(s => s.title === "Watch it break")!;
	expect(breakSection.items.some(i => i.kind === "demo" && i.name === "staircase")).toBe(true);
});

const HIDDEN_SAMPLE = [
	"/*",
	"## Build",
	"",
	"The visible part.",
	"*/",
	"",
	"export const VISIBLE = 1;",
	"",
	"//! hide",
	"export function plumbing(): number {",
	"\treturn 2;",
	"}",
	"//! end",
	"",
	"export const ALSO_VISIBLE = 3;",
	""
].join("\n");

test("hidden code never becomes an item in either layout", () => {
	const sections = toSections(parseLiterate(HIDDEN_SAMPLE));
	const texts = sections.flatMap(s => s.items.flatMap(i => (i.kind === "code" ? [i.text] : [])));
	expect(texts.join("\n")).not.toContain("plumbing");
	expect(texts.join("\n")).toContain("VISIBLE");
	expect(texts.join("\n")).toContain("ALSO_VISIBLE");
});

test("hidden code is not nameable and does not join the lit plan", () => {
	const sections = toSections(parseLiterate(HIDDEN_SAMPLE));
	const names = sections.flatMap(s => s.items.flatMap(i => (i.kind === "code" ? [i.name] : [])));
	expect(names).toEqual(["VISIBLE", "ALSO_VISIBLE"]);
	expect(litPlan(sections).get(1)).toEqual(["VISIBLE", "ALSO_VISIBLE"]);
});

test("prose supports tables, footnote asides, and math blocks", () => {
	const table = miniMarkdown("| in | out |\n|---|---|\n| 1 | 5 |\n| … | … |");
	expect(table).toContain("<table");
	expect(table).toContain("<th>in</th>");
	expect(table).toContain("<td>5</td>");
	expect(table).not.toContain("---");

	const aside = miniMarkdown("~ For the curious: details live in main.ts.");
	expect(aside).toBe('<p class="aside">For the curious: details live in main.ts.</p>');

	const math = miniMarkdown("$$\ngap of 8 → 8 × 8 = 64\n2^2 = 4\n$$");
	expect(math).toContain('class="math"');
	expect(math).toContain("<sup>2</sup>");
	expect(math).not.toContain("$$");
});
