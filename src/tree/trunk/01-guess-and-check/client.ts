// Browser glue for trunk/01. The lesson's ideas live in main.ts; this file wires
// them to buttons and a canvas.

import { boundsForPoints, boundsForSeries, Plot, redrawOnResize } from "../../../site/plot.ts";
import {
	makeExamples,
	makeRandom,
	predict,
	startSearch,
	tryManyGuesses,
	tryOneGuess,
	type Search
} from "./main.ts";

const SEED = 7;
const EXAMPLE_COUNT = 60;

const scatterCanvas = document.getElementById("scatter") as HTMLCanvasElement | null;
const staircaseCanvas = document.getElementById("staircase") as HTMLCanvasElement | null;
if (!scatterCanvas || !staircaseCanvas) throw new Error("lesson canvases are missing");

const scatterPlot = new Plot(scatterCanvas);
const staircasePlot = new Plot(staircaseCanvas);

let random = makeRandom(SEED);
let examples = makeExamples(EXAMPLE_COUNT, random);
let search = startSearch();
let autoTimer: number | null = null;

// ── the live search ─────────────────────────────────────────────────────────

function drawScatter(): void {
	scatterPlot.begin();
	scatterPlot.setBounds(boundsForPoints(examples));
	scatterPlot.axes("input", "output");
	scatterPlot.scatter(examples, scatterPlot.color("--plot-point"));

	if (search.guessesTried > 0) {
		const latest = search.latest;
		const best = search.best;
		scatterPlot.functionLine(x => predict(latest, x), scatterPlot.color("--plot-latest"), 2);
		scatterPlot.functionLine(x => predict(best, x), scatterPlot.color("--plot-best"), 2.5);
	}
}

function setText(id: string, text: string): void {
	const element = document.getElementById(id);
	if (element) element.textContent = text;
}

function describe(guess: { multiplier: number; addOn: number }): string {
	const sign = guess.addOn < 0 ? "−" : "+";
	return `×${guess.multiplier.toFixed(2)} ${sign} ${Math.abs(guess.addOn).toFixed(2)}`;
}

function updateSearchReadouts(): void {
	setText("bestScore", search.guessesTried === 0 ? "—" : search.bestScore.toFixed(3));
	setText("guessCount", search.guessesTried.toLocaleString());
	setText("drySpell", search.guessesSinceImprovement.toLocaleString());
	setText("bestRule", search.guessesTried === 0 ? "—" : describe(search.best));
	drawScatter();
}

function stopAuto(): void {
	if (autoTimer !== null) {
		clearInterval(autoTimer);
		autoTimer = null;
	}
	const button = document.getElementById("autoGuess");
	if (button) button.textContent = "Auto-guess";
}

document.getElementById("guessOnce")?.addEventListener("click", () => {
	tryOneGuess(search, examples, random);
	updateSearchReadouts();
});

document.getElementById("guessHundred")?.addEventListener("click", () => {
	tryManyGuesses(search, examples, random, 100);
	updateSearchReadouts();
});

document.getElementById("autoGuess")?.addEventListener("click", () => {
	if (autoTimer !== null) {
		stopAuto();
		return;
	}
	const button = document.getElementById("autoGuess");
	if (button) button.textContent = "Stop";
	autoTimer = window.setInterval(() => {
		tryManyGuesses(search, examples, random, 40);
		updateSearchReadouts();
	}, 30);
});

document.getElementById("resetSearch")?.addEventListener("click", () => {
	stopAuto();
	random = makeRandom(SEED);
	examples = makeExamples(EXAMPLE_COUNT, random);
	search = startSearch();
	updateSearchReadouts();
});

// ── the long run that shows the stall ───────────────────────────────────────

const SAMPLE_EVERY = 20;
let staircase: number[] = [];

function drawStaircase(): void {
	staircasePlot.begin();
	staircasePlot.setBounds(boundsForSeries(staircase, SAMPLE_EVERY));
	staircasePlot.axes("guesses", "best score");
	staircasePlot.series(staircase, staircasePlot.color("--plot-best"), 2, SAMPLE_EVERY);
}

document.getElementById("runLong")?.addEventListener("click", () => {
	const longRandom = makeRandom(SEED);
	const longExamples = makeExamples(EXAMPLE_COUNT, longRandom);
	const longSearch: Search = startSearch();

	staircase = [];
	const recordsAt: number[] = [];
	for (let guess = 1; guess <= 20000; guess++) {
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
