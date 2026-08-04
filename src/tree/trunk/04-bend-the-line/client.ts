// Browser glue for trunk/04. The lesson itself is main.ts.

import { makeCurveExamples } from "../../../learned/data.ts";
import { Neuron } from "../../../learned/neuron.ts";
import { makeRandom } from "../../../learned/random.ts";
import { renderLesson } from "../../../site/code.ts";
import { boundsForPoints, boundsForSeries, Plot, redrawOnResize } from "../../../site/plot.ts";
import { BentEngine, CURVE_SEED, EXAMPLE_COUNT, NOISE, relu, twoStraightSteps } from "./main.ts";

const lesson = document.getElementById("lesson");
if (!lesson) throw new Error("the lesson container is missing");
await renderLesson(lesson);

function requireCanvas(id: string): HTMLCanvasElement {
	const canvas = document.getElementById(id);
	if (!(canvas instanceof HTMLCanvasElement)) throw new Error(`canvas #${id} is missing`);
	return canvas;
}

function rangeValue(id: string): number {
	const input = document.getElementById(id);
	if (!(input instanceof HTMLInputElement)) throw new Error(`input #${id} is missing`);
	return Number(input.value);
}

function setText(id: string, value: string): void {
	const element = document.getElementById(id);
	if (element) element.textContent = value;
}

// Two straight steps and their collapsed line.
const collapseCanvas = requireCanvas("collapsePlot");
const collapsePlot = new Plot(collapseCanvas);
let bendOn = false;

function firstAnswer(x: number): number {
	const answer = rangeValue("firstWeight") * x + rangeValue("firstBias");
	return bendOn ? relu(answer) : answer;
}

function twoStepAnswer(x: number): number {
	return rangeValue("secondWeight") * firstAnswer(x) + rangeValue("secondBias");
}

function collapsedAnswer(x: number): number {
	const firstWeight = rangeValue("firstWeight");
	const firstBias = rangeValue("firstBias");
	const secondWeight = rangeValue("secondWeight");
	const secondBias = rangeValue("secondBias");
	return secondWeight * firstWeight * x + (secondWeight * firstBias + secondBias);
}

function drawCollapse(): void {
	collapsePlot.begin();
	collapsePlot.setBounds({ minX: -5, maxX: 5, minY: -10, maxY: 10 });
	collapsePlot.axes("input", "answer");
	collapsePlot.functionLine(collapsedAnswer, collapsePlot.color("--plot-best"), 4);
	collapsePlot.functionLine(twoStepAnswer, collapsePlot.color("--plot-latest"), 2.5, bendOn);

	let gap = 0;
	for (let x = -5; x <= 5; x += 0.05) {
		gap = Math.max(gap, Math.abs(twoStepAnswer(x) - collapsedAnswer(x)));
	}
	setText("collapseMode", bendOn ? "ReLU between the steps" : "two straight steps");
	setText("collapseGap", bendOn ? gap.toFixed(3) : "0 (to 12 decimals)");
}

for (const id of ["firstWeight", "firstBias", "secondWeight", "secondBias"]) {
	document.getElementById(id)?.addEventListener("input", drawCollapse);
}
document.getElementById("toggleBend")?.addEventListener("click", () => {
	bendOn = !bendOn;
	setText("toggleBend", bendOn ? "Remove the bend" : "Add the bend");
	drawCollapse();
});
document.getElementById("resetCollapse")?.addEventListener("click", () => {
	const defaults: Record<string, string> = {
		firstWeight: "1.7",
		firstBias: "-0.4",
		secondWeight: "-0.8",
		secondBias: "2.1"
	};
	for (const [id, value] of Object.entries(defaults)) {
		const input = document.getElementById(id);
		if (input instanceof HTMLInputElement) input.value = value;
	}
	bendOn = false;
	setText("toggleBend", "Add the bend");
	drawCollapse();
});

// The bent engine on the curve from lesson 03.
const curveCanvas = requireCanvas("curvePlot");
const scoreCanvas = requireCanvas("scorePlot");
const curvePlot = new Plot(curveCanvas);
const scorePlot = new Plot(scoreCanvas);
const examples = makeCurveExamples(EXAMPLE_COUNT, NOISE, makeRandom(CURVE_SEED));
const straight = new Neuron(0, 0);
for (let pass = 0; pass < 2000; pass++) straight.step(examples);

let bent = new BentEngine();
let scoreHistory = [bent.scoreOn(examples)];
let autoTimer: number | null = null;

function drawTraining(): void {
	curvePlot.begin();
	curvePlot.setBounds(boundsForPoints(examples));
	curvePlot.axes("input", "output");
	curvePlot.scatter(examples, curvePlot.color("--plot-point"));
	curvePlot.functionLine(x => straight.predict(x), curvePlot.color("--plot-latest"), 2, true);
	curvePlot.functionLine(x => bent.predict(x), curvePlot.color("--plot-best"), 2.5);

	scorePlot.begin();
	scorePlot.setBounds(boundsForSeries(scoreHistory, 250));
	scorePlot.axes("passes", "score");
	scorePlot.series(scoreHistory, scorePlot.color("--plot-best"), 2, 250);

	setText("bentScore", bent.scoreOn(examples).toFixed(4));
	setText("straightScore", straight.scoreOn(examples).toFixed(4));
	setText("bentPasses", bent.passes.toLocaleString());
}

function train(amount: number): void {
	for (let pass = 0; pass < amount; pass++) bent.step(examples);
	scoreHistory.push(bent.scoreOn(examples));
	drawTraining();
}

function stopAuto(): void {
	if (autoTimer !== null) window.clearInterval(autoTimer);
	autoTimer = null;
	setText("trainBentAuto", "Keep training");
}

document.getElementById("trainBent")?.addEventListener("click", () => train(250));
document.getElementById("trainBentAuto")?.addEventListener("click", () => {
	if (autoTimer !== null) {
		stopAuto();
		return;
	}
	setText("trainBentAuto", "Stop");
	autoTimer = window.setInterval(() => {
		train(50);
		if (bent.passes >= 5000) stopAuto();
	}, 50);
});
document.getElementById("resetBent")?.addEventListener("click", () => {
	stopAuto();
	bent = new BentEngine();
	scoreHistory = [bent.scoreOn(examples)];
	drawTraining();
});

// The second input never enters the current engine.
const secondInput = document.getElementById("secondInput");
function updateMissingInput(): void {
	const value = rangeValue("secondInput");
	setText("secondInputValue", String(value));
	setText("wantedSum", String(3 + value));
}
secondInput?.addEventListener("input", updateMissingInput);

redrawOnResize(collapseCanvas, drawCollapse);
redrawOnResize(curveCanvas, drawTraining);
redrawOnResize(scoreCanvas, drawTraining);
drawCollapse();
drawTraining();
updateMissingInput();
