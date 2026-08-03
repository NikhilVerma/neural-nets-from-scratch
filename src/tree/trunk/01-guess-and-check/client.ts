// Browser glue for trunk/01. The lesson's ideas and its prose both live in main.ts;
// this file renders that file into the page, then wires the demos to buttons and canvases.

import { renderLesson } from "../../../site/code.ts";
import { boundsForPoints, boundsForSeries, Plot, redrawOnResize } from "../../../site/plot.ts";
import {
	EXAMPLE_COUNT,
	makeExamples,
	makeRandom,
	runEngine,
	SEED,
	startSearch,
	tryManyGuesses,
	tryOneGuess,
	type Knobs,
	type Search
} from "./main.ts";

// The demo markup lives in <template> blocks and is cloned into the page by
// renderLesson, so nothing below may run until this await has returned.
const container = document.querySelector("main");
if (!container) throw new Error("this page has no <main> to render the lesson into");
await renderLesson(container);

function element<T extends HTMLElement>(id: string): T {
	const found = document.getElementById(id);
	if (!found) throw new Error(`the demo template is missing #${id}`);
	return found as T;
}

function setText(id: string, text: string): void {
	element(id).textContent = text;
}

function describe(knobs: Knobs): string {
	const sign = knobs.addOn < 0 ? "−" : "+";
	return `×${knobs.multiplier.toFixed(2)} ${sign} ${Math.abs(knobs.addOn).toFixed(2)}`;
}

// ── the live search ─────────────────────────────────────────────────────────

const scatterCanvas = element<HTMLCanvasElement>("scatter");
const scatterPlot = new Plot(scatterCanvas);

let random = makeRandom(SEED);
let examples = makeExamples(EXAMPLE_COUNT, random);
let search = startSearch();
let autoTimer: number | null = null;

function drawScatter(): void {
	scatterPlot.begin();
	scatterPlot.setBounds(boundsForPoints(examples));
	scatterPlot.axes("input", "output");
	scatterPlot.scatter(examples, scatterPlot.color("--plot-point"));

	if (search.guessesTried > 0) {
		const latest = search.latest;
		const best = search.best;
		scatterPlot.functionLine(x => runEngine(latest, x), scatterPlot.color("--plot-latest"), 2);
		scatterPlot.functionLine(x => runEngine(best, x), scatterPlot.color("--plot-best"), 2.5);
	}
}

function updateSearchReadouts(): void {
	setText("bestScore", search.guessesTried === 0 ? "—" : search.bestScore.toFixed(3));
	setText("guessCount", search.guessesTried.toLocaleString());
	setText("drySpell", search.guessesSinceImprovement.toLocaleString());
	setText("bestKnobs", search.guessesTried === 0 ? "—" : describe(search.best));
	drawScatter();
}

function stopAuto(): void {
	if (autoTimer !== null) {
		clearInterval(autoTimer);
		autoTimer = null;
	}
	element("autoGuess").textContent = "Auto-guess";
}

element("guessOnce").addEventListener("click", () => {
	tryOneGuess(search, examples, random);
	updateSearchReadouts();
});

element("guessHundred").addEventListener("click", () => {
	tryManyGuesses(search, examples, random, 100);
	updateSearchReadouts();
});

element("autoGuess").addEventListener("click", () => {
	if (autoTimer !== null) {
		stopAuto();
		return;
	}
	element("autoGuess").textContent = "Stop";
	autoTimer = window.setInterval(() => {
		tryManyGuesses(search, examples, random, 40);
		updateSearchReadouts();
	}, 30);
});

element("resetSearch").addEventListener("click", () => {
	stopAuto();
	// Same seed, so Reset really does replay the same run.
	random = makeRandom(SEED);
	examples = makeExamples(EXAMPLE_COUNT, random);
	search = startSearch();
	updateSearchReadouts();
});

// ── the long run that shows the stall ───────────────────────────────────────

const staircaseCanvas = element<HTMLCanvasElement>("staircase");
const staircasePlot = new Plot(staircaseCanvas);

const LONG_RUN = 20000;
const SAMPLE_EVERY = 20; // one point per 20 guesses is plenty for a 20,000-guess line
let staircase: number[] = [];

function drawStaircase(): void {
	staircasePlot.begin();
	staircasePlot.setBounds(boundsForSeries(staircase, SAMPLE_EVERY));
	staircasePlot.axes("guesses", "best score");
	staircasePlot.series(staircase, staircasePlot.color("--plot-best"), 2, SAMPLE_EVERY);
}

element("runLong").addEventListener("click", () => {
	// A run of its own, from the same seed as the terminal version of this lesson.
	const longRandom = makeRandom(SEED);
	const longExamples = makeExamples(EXAMPLE_COUNT, longRandom);
	const longSearch: Search = startSearch();

	staircase = [];
	const recordsAt: number[] = [];
	for (let guess = 1; guess <= LONG_RUN; guess++) {
		if (tryOneGuess(longSearch, longExamples, longRandom)) recordsAt.push(guess);
		if (guess % SAMPLE_EVERY === 0) staircase.push(longSearch.bestScore);
	}

	setText("improvementCount", String(recordsAt.length));
	setText("lastImprovement", longSearch.lastImprovementAt.toLocaleString());
	setText("wasted", longSearch.guessesSinceImprovement.toLocaleString());
	setText("longScore", longSearch.bestScore.toFixed(3));
	setText("recordList", recordsAt.map(guess => guess.toLocaleString()).join(", "));
	drawStaircase();
});

// ── first paint ─────────────────────────────────────────────────────────────

redrawOnResize(scatterCanvas, drawScatter);
redrawOnResize(staircaseCanvas, drawStaircase);
updateSearchReadouts();
drawStaircase();
