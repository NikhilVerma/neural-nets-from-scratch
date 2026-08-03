// Browser glue for trunk/03. The lesson itself is main.ts, rendered by site/code.ts;
// this file only wires the demo controls that main.ts asked for.

import { renderLesson } from "../../../site/code.ts";
import { boundsForPoints, boundsForSeries, Plot, redrawOnResize } from "../../../site/plot.ts";
import { makeRandom } from "../../../learned/random.ts";
import { makeCurveExamples, makeExamples, type Example } from "../../../learned/data.ts";
import {
	CURVE_SEED,
	EXAMPLE_COUNT,
	NOISE,
	SECRET_FORMULA,
	SEED,
	SlopeEngine,
	START,
	STEP_SIZE
} from "./main.ts";

const AUTO_STOPS_AT = 300;
// Past a step size of about 0.14 the score runs away; stop before the numbers stop meaning anything.
const RUNAWAY = 1e12;

// The demo markup lives in <template> tags and is only cloned into the page once the
// lesson has been rendered, so nothing below may run before this line.
const container = document.getElementById("lesson");
if (!container) throw new Error("the lesson container is missing");
await renderLesson(container);

const lineExamples = makeExamples(SECRET_FORMULA, EXAMPLE_COUNT, NOISE, makeRandom(SEED));
const curveExamples = makeCurveExamples(EXAMPLE_COUNT, NOISE, makeRandom(CURVE_SEED));

function requireCanvas(id: string): HTMLCanvasElement {
	const canvas = document.getElementById(id);
	if (!(canvas instanceof HTMLCanvasElement)) throw new Error(`canvas #${id} is missing`);
	return canvas;
}

function setText(id: string, text: string): void {
	const element = document.getElementById(id);
	if (element) element.textContent = text;
}

function show(value: number): string {
	if (!Number.isFinite(value)) return "off the scale";
	return Math.abs(value) >= 1e6 ? value.toExponential(2) : value.toFixed(4);
}

function drawEngine(plot: Plot, engine: SlopeEngine, examples: Example[]): void {
	plot.begin();
	plot.setBounds(boundsForPoints(examples));
	plot.axes("input", "output");
	plot.scatter(examples, plot.color("--plot-point"));
	plot.functionLine(x => engine.predict(x), plot.color("--plot-best"), 2.5);
}

// ── watch it work: one engine on the straight-line examples ────────────────

const scatterCanvas = requireCanvas("scatter");
const scoreCanvas = requireCanvas("scoreChart");
const scatterPlot = new Plot(scatterCanvas);
const scorePlot = new Plot(scoreCanvas);
const stepSizeSlider = document.getElementById("stepSize");

let engine = new SlopeEngine(START.weight, START.bias, STEP_SIZE);
let scoreHistory: number[] = [engine.scoreOn(lineExamples)];
let autoTimer: number | null = null;

function drawScore(): void {
	scorePlot.begin();
	scorePlot.setBounds(boundsForSeries(scoreHistory));
	scorePlot.axes("passes", "score");
	scorePlot.series(scoreHistory, scorePlot.color("--plot-best"), 2);
}

function update(): void {
	const slopes = engine.slopesOn(lineExamples);
	setText("score", show(engine.scoreOn(lineExamples)));
	setText("passes", engine.passes.toLocaleString());
	setText("stepSizeValue", engine.stepSize.toFixed(3));
	setText("weight", show(engine.weight));
	setText("bias", show(engine.bias));
	setText("weightSlope", show(slopes.weightSlope));
	setText("biasSlope", show(slopes.biasSlope));
	drawEngine(scatterPlot, engine, lineExamples);
	drawScore();
}

function stopAuto(): void {
	if (autoTimer !== null) {
		clearInterval(autoTimer);
		autoTimer = null;
	}
	setText("autoTrain", "Keep passing");
}

function takePass(): void {
	engine.step(lineExamples);
	const score = engine.scoreOn(lineExamples);
	if (Number.isFinite(score) && score < RUNAWAY) scoreHistory.push(score);
	else stopAuto();
	update();
}

function restart(): void {
	stopAuto();
	const stepSize =
		stepSizeSlider instanceof HTMLInputElement ? Number(stepSizeSlider.value) : STEP_SIZE;
	engine = new SlopeEngine(START.weight, START.bias, stepSize);
	scoreHistory = [engine.scoreOn(lineExamples)];
	update();
}

document.getElementById("onePass")?.addEventListener("click", takePass);

document.getElementById("autoTrain")?.addEventListener("click", () => {
	if (autoTimer !== null) {
		stopAuto();
		return;
	}
	setText("autoTrain", "Stop");
	autoTimer = window.setInterval(() => {
		takePass();
		if (engine.passes >= AUTO_STOPS_AT) stopAuto();
	}, 60);
});

document.getElementById("resetEngine")?.addEventListener("click", restart);
stepSizeSlider?.addEventListener("input", restart);

// ── watch it break: a second engine, and data that bends ───────────────────

const curveCanvas = requireCanvas("curveScatter");
const curvePlot = new Plot(curveCanvas);

let curveIsOn = false;
let curveExamplesInUse: Example[] = lineExamples;
let curveEngine = new SlopeEngine(0, 0);

function updateCurve(): void {
	const slopes = curveEngine.slopesOn(curveExamplesInUse);
	setText("curveData", curveIsOn ? "y = 0.3 · x · x + 1" : "straight line");
	setText("curveScore", show(curveEngine.scoreOn(curveExamplesInUse)));
	setText("curvePasses", curveEngine.passes.toLocaleString());
	setText("curveWeightSlope", show(slopes.weightSlope));
	setText("curveBiasSlope", show(slopes.biasSlope));
	drawEngine(curvePlot, curveEngine, curveExamplesInUse);
}

function restartCurve(): void {
	curveEngine = new SlopeEngine(0, 0);
	updateCurve();
}

document.getElementById("curveToggle")?.addEventListener("click", () => {
	curveIsOn = !curveIsOn;
	curveExamplesInUse = curveIsOn ? curveExamples : lineExamples;
	setText("curveToggle", curveIsOn ? "Back to the straight line" : "Feed it the curve");
	restartCurve();
});

document.getElementById("curveTrain")?.addEventListener("click", () => {
	for (let pass = 0; pass < 200; pass++) curveEngine.step(curveExamplesInUse);
	updateCurve();
});

document.getElementById("curveReset")?.addEventListener("click", restartCurve);

redrawOnResize(scatterCanvas, () => drawEngine(scatterPlot, engine, lineExamples));
redrawOnResize(scoreCanvas, drawScore);
redrawOnResize(curveCanvas, () => drawEngine(curvePlot, curveEngine, curveExamplesInUse));
update();
updateCurve();
