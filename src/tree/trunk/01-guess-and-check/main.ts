/**
 * trunk/01 — Guess and check.
 * Runnable on its own: bun run main.ts
 *
 * Nothing is imported. Every piece this lesson needs is written out below.
 */

export interface Example {
	x: number;
	y: number;
}

/** Two knobs: multiply the input by one number, then add another. */
export interface Guess {
	multiplier: number;
	addOn: number;
}

/** The rule we are hiding from the machine. */
export const SECRET_RULE: Guess = { multiplier: 2, addOn: 3 };

/** How far off the examples sit from the secret rule. */
export const NOISE = 1;

/** We look for each knob somewhere in here. */
export const GUESS_RANGE = 5;

// ── a repeatable random generator ───────────────────────────────────────────

export function makeRandom(seed: number): () => number {
	let state = seed >>> 0;
	return function random(): number {
		state = (state + 0x6d2b79f5) >>> 0;
		let scrambled = Math.imul(state ^ (state >>> 15), state | 1);
		scrambled ^= scrambled + Math.imul(scrambled ^ (scrambled >>> 7), scrambled | 61);
		return ((scrambled ^ (scrambled >>> 14)) >>> 0) / 4294967296;
	};
}

// ── the examples we hand the machine ────────────────────────────────────────

/** Inputs run from -5 to 5. */
export const INPUT_LOW = -5;
export const INPUT_HIGH = 5;

export function makeExamples(count: number, random: () => number): Example[] {
	const examples: Example[] = [];
	for (let index = 0; index < count; index++) {
		const x = INPUT_LOW + random() * (INPUT_HIGH - INPUT_LOW);
		const wobble = (random() * 2 - 1) * NOISE;
		examples.push({ x, y: SECRET_RULE.multiplier * x + SECRET_RULE.addOn + wobble });
	}
	return examples;
}

// ── the machine, and how we score it ────────────────────────────────────────

export function predict(guess: Guess, x: number): number {
	return guess.multiplier * x + guess.addOn;
}

/** Average of the squared differences. Zero is perfect; big misses hurt much more than small ones. */
export function scoreGuess(guess: Guess, examples: Example[]): number {
	if (examples.length === 0) return 0;

	let total = 0;
	for (const example of examples) {
		const mistake = predict(guess, example.x) - example.y;
		total += mistake * mistake;
	}
	return total / examples.length;
}

// ── the strategy: guess at random, keep the best ────────────────────────────

export function randomGuess(random: () => number): Guess {
	return {
		multiplier: (random() * 2 - 1) * GUESS_RANGE,
		addOn: (random() * 2 - 1) * GUESS_RANGE
	};
}

export interface Search {
	best: Guess;
	bestScore: number;
	latest: Guess;
	latestScore: number;
	guessesTried: number;
	guessesSinceImprovement: number;
	/** Which guess number last beat the record. */
	lastImprovementAt: number;
}

export function startSearch(): Search {
	return {
		best: { multiplier: 0, addOn: 0 },
		bestScore: Infinity,
		latest: { multiplier: 0, addOn: 0 },
		latestScore: Infinity,
		guessesTried: 0,
		guessesSinceImprovement: 0,
		lastImprovementAt: 0
	};
}

/** One guess: roll two knob settings, score them, keep them only if they beat the record. */
export function tryOneGuess(search: Search, examples: Example[], random: () => number): boolean {
	const guess = randomGuess(random);
	const score = scoreGuess(guess, examples);

	search.latest = guess;
	search.latestScore = score;
	search.guessesTried++;

	if (score < search.bestScore) {
		search.best = guess;
		search.bestScore = score;
		search.guessesSinceImprovement = 0;
		search.lastImprovementAt = search.guessesTried;
		return true;
	}

	search.guessesSinceImprovement++;
	return false;
}

export function tryManyGuesses(
	search: Search,
	examples: Example[],
	random: () => number,
	count: number
): void {
	for (let index = 0; index < count; index++) {
		tryOneGuess(search, examples, random);
	}
}

// ── the story, printed ──────────────────────────────────────────────────────

function describe(guess: Guess): string {
	return `multiplier ${guess.multiplier.toFixed(3)}, add-on ${guess.addOn.toFixed(3)}`;
}

export function main(): void {
	const random = makeRandom(7);
	const examples = makeExamples(60, random);

	console.log("trunk/01 — Guess and check\n");
	console.log("A secret rule turns one number into another. The machine gets 60 examples");
	console.log("and two knobs: a multiplier and an add-on. It has no idea what the rule is,");
	console.log("so it rolls both knobs at random and keeps whatever guess scored best.\n");

	const search = startSearch();
	const budget = 50000;
	const milestones = [1, 10, 100, 1000, 10000, 50000];
	const recordsAt: number[] = [];

	console.log("guesses    best score   best rule                            dry spell");
	for (let guess = 1; guess <= budget; guess++) {
		if (tryOneGuess(search, examples, random)) recordsAt.push(guess);
		if (milestones.includes(guess)) {
			const row = [
				String(search.guessesTried).padStart(7),
				search.bestScore.toFixed(4).padStart(13),
				`   ${describe(search.best)}`.padEnd(38),
				String(search.guessesSinceImprovement).padStart(9)
			];
			console.log(row.join(""));
		}
	}

	console.log(`\nThe secret rule was ${describe(SECRET_RULE)}.`);
	console.log(`After ${budget} guesses the best is ${describe(search.best)}.`);
	console.log(`\nEvery improvement landed at guess: ${recordsAt.join(", ")}`);
	console.log(`The last one came at guess ${search.lastImprovementAt}, so the final`);
	console.log(`${search.guessesSinceImprovement} guesses were all wasted work.\n`);
	console.log("The gaps between improvements do not grow steadily — they multiply. Each step");
	console.log("down costs roughly ten times what the last one cost. This never settles on a");
	console.log("rule; it buys lottery tickets, and the tickets keep getting more expensive.\n");
	console.log(
		"Next problem: random guessing never settles — can we guess smarter instead of more?"
	);
}

if (import.meta.main) {
	main();
}
