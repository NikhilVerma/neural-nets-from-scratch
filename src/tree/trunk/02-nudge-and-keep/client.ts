// Browser glue for trunk/02. The lesson itself is main.ts, rendered by site/code.ts;
// this file only wires the demo controls that main.ts asked for.

import { renderLesson } from "../../../site/code.ts";
import { boundsForPoints, boundsForSeries, Plot, redrawOnResize } from "../../../site/plot.ts";
import { makeRandom } from "../../../learned/random.ts";
import { makeExamples } from "../../../learned/data.ts";
import {
	nudgeStep,
	predict,
	SECRET_RULE,
	startClimb,
	testRunsForTraining,
	testRunsPerStep,
	type Climb
} from "./main.ts";

const SEED = 7;
const START = { multiplier: -3.2, addOn: 4.1 };
const AUTO_STOPS_AT = 120;

// The demo markup lives in <template> tags and is only cloned into the page once the
// lesson has been rendered, so nothing below may run before this line.
const container = document.getElementById("lesson");
if (!container) throw new Error("the lesson container is missing");
await renderLesson(container);

function requireCanvas(id: string): HTMLCanvasElement {
	const canvas = document.getElementById(id);
	if (!(canvas instanceof HTMLCanvasElement)) throw new Error(`canvas #${id} is missing`);
	return canvas;
}

function setText(id: string, text: string): void {
	const element = document.getElementById(id);
	if (element) element.textContent = text;
}

// ── the climb ───────────────────────────────────────────────────────────────

const scatterCanvas = requireCanvas("scatter");
const scoreCanvas = requireCanvas("scoreChart");
const scatterPlot = new Plot(scatterCanvas);
const scorePlot = new Plot(scoreCanvas);

const examples = makeExamples(SECRET_RULE, 60, 1, makeRandom(SEED));
let climb: Climb = startClimb(examples, START);
let scoreHistory: number[] = [climb.score];
let autoTimer: number | null = null;

function drawScatter(): void {
	scatterPlot.begin();
	scatterPlot.setBounds(boundsForPoints(examples));
	scatterPlot.axes("input", "output");
	scatterPlot.scatter(examples, scatterPlot.color("--plot-point"));
	scatterPlot.functionLine(x => predict(climb.knobs, x), scatterPlot.color("--plot-best"), 2.5);
}

function drawScore(): void {
	scorePlot.begin();
	scorePlot.setBounds(boundsForSeries(scoreHistory));
	scorePlot.axes("steps", "score");
	scorePlot.series(scoreHistory, scorePlot.color("--plot-best"), 2);
}

function update(): void {
	const sign = climb.knobs.addOn < 0 ? "−" : "+";
	setText("score", climb.score.toFixed(4));
	setText("steps", climb.steps.toLocaleString());
	setText("testRuns", climb.testRuns.toLocaleString());
	setText("nudgeSize", climb.nudgeSize.toPrecision(3));
	setText(
		"rule",
		`×${climb.knobs.multiplier.toFixed(3)} ${sign} ${Math.abs(climb.knobs.addOn).toFixed(3)}`
	);
	drawScatter();
	drawScore();
}

function takeStep(): void {
	nudgeStep(climb, examples);
	scoreHistory.push(climb.score);
	update();
}

function stopAuto(): void {
	if (autoTimer !== null) {
		clearInterval(autoTimer);
		autoTimer = null;
	}
	setText("autoStep", "Auto");
}

document.getElementById("oneStep")?.addEventListener("click", takeStep);

document.getElementById("autoStep")?.addEventListener("click", () => {
	if (autoTimer !== null) {
		stopAuto();
		return;
	}
	setText("autoStep", "Stop");
	autoTimer = window.setInterval(() => {
		takeStep();
		if (climb.steps >= AUTO_STOPS_AT) stopAuto();
	}, 90);
});

document.getElementById("resetClimb")?.addEventListener("click", () => {
	stopAuto();
	climb = startClimb(examples, START);
	scoreHistory = [climb.score];
	update();
});

// ── the bill, as the knobs multiply ─────────────────────────────────────────

const knobSlider = document.getElementById("knobCount");

function updateKnobCost(): void {
	if (!(knobSlider instanceof HTMLInputElement)) return;
	const knobs = Number(knobSlider.value);
	setText("knobsValue", knobs.toLocaleString());
	setText("perStep", testRunsPerStep(knobs).toLocaleString());
	setText("perTraining", testRunsForTraining(knobs, 1000).toLocaleString());
}

knobSlider?.addEventListener("input", updateKnobCost);

redrawOnResize(scatterCanvas, drawScatter);
redrawOnResize(scoreCanvas, drawScore);
update();
updateKnobCost();
