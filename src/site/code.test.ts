// Pins the literate format and the subtitle-cue convention documented in
// ARCHITECTURE.md, so a renderer change cannot quietly change what lessons mean.

import { test, expect } from "bun:test";
import { parseLiterate, toSections, litPlan } from "./code.ts";

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
