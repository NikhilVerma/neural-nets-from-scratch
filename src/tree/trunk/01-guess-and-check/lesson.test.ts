import { test, expect } from "bun:test";
import {
	EXAMPLE_COUNT,
	makeExamples,
	makeRandom,
	mistakeScore,
	SECRET_FORMULA,
	SEED,
	startSearch,
	tryManyGuesses,
	tryOneGuess
} from "./main.ts";

// Pairs with no wobble in them, straight off the secret formula: y = 2x + 3.
const CLEAN_PAIRS = [
	{ x: -2, y: -1 },
	{ x: 0, y: 3 },
	{ x: 4, y: 11 }
];

test("a perfect setting scores zero, anything else scores more", () => {
	expect(mistakeScore(SECRET_FORMULA, CLEAN_PAIRS)).toBe(0);
	expect(mistakeScore({ multiplier: 2, addOn: 3.5 }, CLEAN_PAIRS)).toBeGreaterThan(0);
	expect(mistakeScore({ multiplier: 2, addOn: 2.5 }, CLEAN_PAIRS)).toBeGreaterThan(0);
});

test("a bigger miss scores worse than a smaller one", () => {
	const small = mistakeScore({ multiplier: 2, addOn: 3.1 }, CLEAN_PAIRS);
	const large = mistakeScore({ multiplier: 2, addOn: 5 }, CLEAN_PAIRS);
	expect(large).toBeGreaterThan(small);
});

test("misses do not cancel out: too high on one pair, too low on the next still scores", () => {
	const tilted = [
		{ x: -1, y: 0 }, // the formula says 1, so this pair pulls the engine down
		{ x: 1, y: 6 } //  the formula says 5, so this one pulls it back up
	];
	expect(mistakeScore(SECRET_FORMULA, tilted)).toBeGreaterThan(0);
});

test("the best score never gets worse as guesses pile up", () => {
	const random = makeRandom(42);
	const examples = makeExamples(60, random);
	const search = startSearch();

	let previousBest = Infinity;
	for (let guess = 0; guess < 500; guess++) {
		tryOneGuess(search, examples, random);
		expect(search.bestScore).toBeLessThanOrEqual(previousBest);
		previousBest = search.bestScore;
	}
});

test("the same seed gives the same run, twice", () => {
	function run(): number {
		const random = makeRandom(2024);
		const examples = makeExamples(60, random);
		const search = startSearch();
		tryManyGuesses(search, examples, random, 300);
		return search.bestScore;
	}

	expect(run()).toBe(run());
});

test("2,000 guesses get roughly right — and no closer", () => {
	for (const seed of [1, 2, 3, 4, 5]) {
		const random = makeRandom(seed);
		const examples = makeExamples(60, random);
		const search = startSearch();
		tryManyGuesses(search, examples, random, 2000);

		const multiplierMiss = Math.abs(search.best.multiplier - SECRET_FORMULA.multiplier);
		const addOnMiss = Math.abs(search.best.addOn - SECRET_FORMULA.addOn);

		// Roughly right: it does find the neighbourhood.
		expect(multiplierMiss).toBeLessThan(0.7);
		expect(addOnMiss).toBeLessThan(2);

		// And no closer: it never actually settles on the formula. This failure is the lesson.
		const settled = multiplierMiss < 0.02 && addOnMiss < 0.02;
		expect(settled).toBe(false);
	}
});

test("improvements dry up: the last nine tenths of a long run buy almost nothing", () => {
	const random = makeRandom(7);
	const examples = makeExamples(60, random);
	const search = startSearch();

	tryManyGuesses(search, examples, random, 2000);
	const scoreEarly = search.bestScore;
	tryManyGuesses(search, examples, random, 18000);
	const scoreLate = search.bestScore;

	// Nine times the guesses, and the score barely moves.
	expect(scoreEarly - scoreLate).toBeLessThan(0.1);
});

// The page quotes these numbers, so a change to the code that moves them should
// fail here rather than quietly make the lesson wrong.
test("the run the lesson quotes: 20,000 guesses from seed 7", () => {
	const random = makeRandom(7);
	const examples = makeExamples(60, random);
	const search = startSearch();

	const recordsAt: number[] = [];
	for (let guess = 1; guess <= 20000; guess++) {
		tryOneGuess(search, examples, random);
		if (search.guessesSinceImprovement === 0) recordsAt.push(guess);
	}

	expect(recordsAt).toEqual([1, 4, 40, 97, 1002, 1748, 10222, 11565]);
	expect(search.guessesSinceImprovement).toBe(8435);
	expect(search.bestScore.toFixed(3)).toBe("0.379");
	expect(search.best.multiplier.toFixed(3)).toBe("2.075");
	expect(search.best.addOn.toFixed(3)).toBe("3.204");
	// The wobble sets the scale: even the secret formula does not score zero.
	expect(mistakeScore(SECRET_FORMULA, examples).toFixed(3)).toBe("0.429");
	// And the best setting slips under the formula's own score by chasing that wobble.
	expect(search.bestScore).toBeLessThan(mistakeScore(SECRET_FORMULA, examples));
});

// The lesson's table quotes the first five pairs; this pins them to the real run.
test("the five pairs quoted in the table are the actual first five", () => {
	const random = makeRandom(SEED);
	const examples = makeExamples(EXAMPLE_COUNT, random);
	const quoted: Array<[number, number]> = [
		[-4.88, -7.64],
		[4.77, 12.94],
		[0.21, 3.24],
		[-0.34, 1.8],
		[0.53, 4.53]
	];
	for (const [index, [x, y]] of quoted.entries()) {
		expect(examples[index]!.x).toBeCloseTo(x, 2);
		expect(examples[index]!.y).toBeCloseTo(y, 2);
	}
});
