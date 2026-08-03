// Browser glue for trunk/02.

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

const scatterCanvas = document.getElementById("scatter") as HTMLCanvasElement | null;
const scoreCanvas = document.getElementById("scoreChart") as HTMLCanvasElement | null;
if (!scatterCanvas || !scoreCanvas) throw new Error("lesson canvases are missing");

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

function setText(id: string, text: string): void {
	const element = document.getElementById(id);
	if (element) element.textContent = text;
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

function stopAuto(): void {
	if (autoTimer !== null) {
		clearInterval(autoTimer);
		autoTimer = null;
	}
	const button = document.getElementById("autoStep");
	if (button) button.textContent = "Auto";
}

document.getElementById("oneStep")?.addEventListener("click", () => {
	nudgeStep(climb, examples);
	scoreHistory.push(climb.score);
	update();
});

document.getElementById("autoStep")?.addEventListener("click", () => {
	if (autoTimer !== null) {
		stopAuto();
		return;
	}
	const button = document.getElementById("autoStep");
	if (button) button.textContent = "Stop";
	autoTimer = window.setInterval(() => {
		nudgeStep(climb, examples);
		scoreHistory.push(climb.score);
		update();
		if (climb.steps >= 120) stopAuto();
	}, 90);
});

document.getElementById("resetClimb")?.addEventListener("click", () => {
	stopAuto();
	climb = startClimb(examples, START);
	scoreHistory = [climb.score];
	update();
});

// ── the cost of more knobs ──────────────────────────────────────────────────

const knobSlider = document.getElementById("knobCount") as HTMLInputElement | null;

function updateKnobCost(): void {
	if (!knobSlider) return;
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
