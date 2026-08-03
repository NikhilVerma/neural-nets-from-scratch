import { test, expect } from "bun:test";
import {
	makeExamples,
	makeRandom,
	scoreGuess,
	SECRET_RULE,
	startSearch,
	tryManyGuesses,
	tryOneGuess
} from "./main.ts";

test("a perfect answer scores zero, anything else scores more", () => {
	const noiseless = [
		{ x: -2, y: -1 },
		{ x: 0, y: 3 },
		{ x: 4, y: 11 }
	];

	expect(scoreGuess(SECRET_RULE, noiseless)).toBe(0);
	expect(scoreGuess({ multiplier: 2, addOn: 3.5 }, noiseless)).toBeGreaterThan(0);
	expect(scoreGuess({ multiplier: 2, addOn: 2.5 }, noiseless)).toBeGreaterThan(0);
});

test("a bigger miss scores worse than a smaller one", () => {
	const noiseless = [
		{ x: -2, y: -1 },
		{ x: 0, y: 3 },
		{ x: 4, y: 11 }
	];

	const small = scoreGuess({ multiplier: 2, addOn: 3.1 }, noiseless);
	const large = scoreGuess({ multiplier: 2, addOn: 5 }, noiseless);
	expect(large).toBeGreaterThan(small);
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

		const multiplierMiss = Math.abs(search.best.multiplier - SECRET_RULE.multiplier);
		const addOnMiss = Math.abs(search.best.addOn - SECRET_RULE.addOn);

		// Roughly right: it does find the neighbourhood.
		expect(multiplierMiss).toBeLessThan(0.7);
		expect(addOnMiss).toBeLessThan(2);

		// And no closer: it never actually settles on the rule. This failure is the lesson.
		const settled = multiplierMiss < 0.02 && addOnMiss < 0.02;
		expect(settled).toBe(false);
	}
});

test("improvements dry up: the last quarter of a long run buys almost nothing", () => {
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
