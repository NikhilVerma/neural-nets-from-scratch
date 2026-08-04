// Taught at trunk/04-bend-the-line — go there for the why.

/** Keep positive numbers and replace negative numbers with zero. */
export function relu(value: number): number {
	return Math.max(0, value);
}
