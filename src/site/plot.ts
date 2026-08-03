// Site plumbing, not curriculum: a small canvas helper so lessons can draw pictures.
// Nothing here teaches anything — it maps numbers to pixels and draws dots and lines.

export interface Point {
	x: number;
	y: number;
}

export interface Bounds {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
}

const PADDING = { left: 46, right: 14, top: 14, bottom: 28 };

export class Plot {
	canvas: HTMLCanvasElement;
	context: CanvasRenderingContext2D;
	bounds: Bounds = { minX: 0, maxX: 1, minY: 0, maxY: 1 };
	width = 0;
	height = 0;

	constructor(canvas: HTMLCanvasElement) {
		const context = canvas.getContext("2d");
		if (!context) throw new Error("this browser has no 2d canvas");
		this.canvas = canvas;
		this.context = context;
	}

	/** Read a colour from the page's CSS variables so the plot follows the theme. */
	color(variableName: string): string {
		const value = getComputedStyle(this.canvas).getPropertyValue(variableName).trim();
		return value || "#888888";
	}

	setBounds(bounds: Bounds): void {
		this.bounds = bounds;
	}

	/** Size the canvas to its box (and to the screen's pixel density) and wipe it. */
	begin(): void {
		const ratio = window.devicePixelRatio || 1;
		const boxWidth = Math.max(1, this.canvas.clientWidth);
		const boxHeight = Math.max(1, this.canvas.clientHeight);

		if (this.canvas.width !== Math.round(boxWidth * ratio)) {
			this.canvas.width = Math.round(boxWidth * ratio);
		}
		if (this.canvas.height !== Math.round(boxHeight * ratio)) {
			this.canvas.height = Math.round(boxHeight * ratio);
		}

		this.width = boxWidth;
		this.height = boxHeight;
		this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
		this.context.clearRect(0, 0, boxWidth, boxHeight);
	}

	toPixelX(x: number): number {
		const span = this.bounds.maxX - this.bounds.minX || 1;
		const usable = this.width - PADDING.left - PADDING.right;
		return PADDING.left + ((x - this.bounds.minX) / span) * usable;
	}

	toPixelY(y: number): number {
		const span = this.bounds.maxY - this.bounds.minY || 1;
		const usable = this.height - PADDING.top - PADDING.bottom;
		return this.height - PADDING.bottom - ((y - this.bounds.minY) / span) * usable;
	}

	/** Frame, zero lines if they are in view, and a number at each corner of the range. */
	axes(xLabel = "", yLabel = ""): void {
		const context = this.context;
		const axisColor = this.color("--plot-axis");
		const labelColor = this.color("--plot-label");

		context.strokeStyle = axisColor;
		context.lineWidth = 1;
		context.beginPath();
		context.moveTo(PADDING.left, PADDING.top);
		context.lineTo(PADDING.left, this.height - PADDING.bottom);
		context.lineTo(this.width - PADDING.right, this.height - PADDING.bottom);
		context.stroke();

		if (this.bounds.minY < 0 && this.bounds.maxY > 0) {
			const zero = this.toPixelY(0);
			context.beginPath();
			context.moveTo(PADDING.left, zero);
			context.lineTo(this.width - PADDING.right, zero);
			context.stroke();
		}
		if (this.bounds.minX < 0 && this.bounds.maxX > 0) {
			const zero = this.toPixelX(0);
			context.beginPath();
			context.moveTo(zero, PADDING.top);
			context.lineTo(zero, this.height - PADDING.bottom);
			context.stroke();
		}

		context.fillStyle = labelColor;
		context.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
		context.textAlign = "right";
		context.fillText(format(this.bounds.maxY), PADDING.left - 6, PADDING.top + 9);
		context.fillText(format(this.bounds.minY), PADDING.left - 6, this.height - PADDING.bottom);
		context.textAlign = "left";
		context.fillText(format(this.bounds.minX), PADDING.left, this.height - PADDING.bottom + 15);
		context.textAlign = "right";
		context.fillText(
			format(this.bounds.maxX),
			this.width - PADDING.right,
			this.height - PADDING.bottom + 15
		);

		if (xLabel) {
			context.textAlign = "center";
			context.fillText(xLabel, this.width / 2, this.height - PADDING.bottom + 15);
		}
		if (yLabel) {
			context.textAlign = "left";
			context.fillText(yLabel, 4, PADDING.top - 3);
		}
	}

	scatter(points: Point[], color: string, radius = 3): void {
		const context = this.context;
		context.fillStyle = color;
		for (const point of points) {
			context.beginPath();
			context.arc(this.toPixelX(point.x), this.toPixelY(point.y), radius, 0, Math.PI * 2);
			context.fill();
		}
	}

	/** Draw y = shape(x) across the visible width. */
	functionLine(shape: (x: number) => number, color: string, lineWidth = 2, dashed = false): void {
		const context = this.context;
		const steps = 120;
		context.save();
		context.beginPath();
		context.strokeStyle = color;
		context.lineWidth = lineWidth;
		if (dashed) context.setLineDash([5, 4]);
		context.rect(
			PADDING.left,
			PADDING.top,
			this.width - PADDING.left - PADDING.right,
			this.height - PADDING.top - PADDING.bottom
		);
		context.clip();

		context.beginPath();
		for (let step = 0; step <= steps; step++) {
			const x = this.bounds.minX + ((this.bounds.maxX - this.bounds.minX) * step) / steps;
			const pixelX = this.toPixelX(x);
			const pixelY = this.toPixelY(shape(x));
			if (step === 0) context.moveTo(pixelX, pixelY);
			else context.lineTo(pixelX, pixelY);
		}
		context.stroke();
		context.restore();
	}

	/**
	 * A list of values drawn left to right. Entries land at 0, step, 2*step, … along
	 * the x axis, so a series sampled every 20th guess can still be labelled in guesses.
	 */
	series(values: number[], color: string, lineWidth = 2, step = 1): void {
		if (values.length < 2) return;
		const context = this.context;
		context.beginPath();
		context.strokeStyle = color;
		context.lineWidth = lineWidth;
		for (let index = 0; index < values.length; index++) {
			const pixelX = this.toPixelX(index * step);
			const pixelY = this.toPixelY(values[index]!);
			if (index === 0) context.moveTo(pixelX, pixelY);
			else context.lineTo(pixelX, pixelY);
		}
		context.stroke();
	}
}

/** Bounds that fit a list of points, with a little breathing room. */
export function boundsForPoints(points: Point[]): Bounds {
	if (points.length === 0) return { minX: 0, maxX: 1, minY: 0, maxY: 1 };
	let minX = Infinity;
	let maxX = -Infinity;
	let minY = Infinity;
	let maxY = -Infinity;
	for (const point of points) {
		minX = Math.min(minX, point.x);
		maxX = Math.max(maxX, point.x);
		minY = Math.min(minY, point.y);
		maxY = Math.max(maxY, point.y);
	}
	const padX = (maxX - minX) * 0.04 || 1;
	const padY = (maxY - minY) * 0.12 || 1;
	return { minX: minX - padX, maxX: maxX + padX, minY: minY - padY, maxY: maxY + padY };
}

/** Bounds that fit a run of values plotted against their position. */
export function boundsForSeries(values: number[], step = 1): Bounds {
	const highest = values.length > 0 ? Math.max(...values) : 1;
	return {
		minX: 0,
		maxX: Math.max(1, (values.length - 1) * step),
		minY: 0,
		maxY: highest > 0 ? highest * 1.08 : 1
	};
}

/** Redraw whenever the canvas changes size or the colour scheme flips. */
export function redrawOnResize(canvas: HTMLCanvasElement, redraw: () => void): void {
	new ResizeObserver(redraw).observe(canvas);
	window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", redraw);
}

function format(value: number): string {
	if (value === 0) return "0";
	const size = Math.abs(value);
	if (size >= 1000 || size < 0.01) return value.toExponential(1);
	if (size >= 10) return value.toFixed(0);
	return value.toFixed(1);
}
