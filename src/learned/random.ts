// Taught at trunk/01-guess-and-check — go there for the why.

/** A repeatable stream of numbers between 0 and 1. Same seed, same stream, forever. */
export function makeRandom(seed: number): () => number {
	let state = seed >>> 0;
	return function random(): number {
		state = (state + 0x6d2b79f5) >>> 0;
		let scrambled = Math.imul(state ^ (state >>> 15), state | 1);
		scrambled ^= scrambled + Math.imul(scrambled ^ (scrambled >>> 7), scrambled | 61);
		return ((scrambled ^ (scrambled >>> 14)) >>> 0) / 4294967296;
	};
}

/** A repeatable number somewhere between low and high. */
export function randomBetween(random: () => number, low: number, high: number): number {
	return low + random() * (high - low);
}
