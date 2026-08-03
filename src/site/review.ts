// Site plumbing, not part of the curriculum. Development only.
//
// The maintainer reads a rendered lesson, selects a passage, and leaves a note on it.
// The note is appended to reviews.jsonl at the repo root, with the exact selected text
// plus a little surrounding context so the passage can be found again in main.ts.
// The overlay probes GET /review on load; in production that route does not exist,
// the probe fails, and this module does nothing at all.

interface ReviewNote {
	page: string;
	section: string | null;
	prefix: string;
	exact: string;
	suffix: string;
	comment: string;
}

const CONTEXT_CHARS = 40;

function styles(): string {
	return `
	.review-btn, .review-pop {
		position: absolute;
		z-index: 40;
		font-family: var(--sans, system-ui);
	}
	.review-btn {
		padding: 0.3rem 0.7rem;
		background: var(--accent, #3e7a4c);
		color: var(--bg, #fff);
		font-size: 0.85rem;
		font-weight: 600;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
	}
	.review-pop {
		width: min(22rem, 90vw);
		padding: 0.8rem;
		background: var(--panel, #fff);
		border: 1px solid var(--accent, #3e7a4c);
		border-radius: 8px;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
	}
	.review-pop blockquote {
		margin: 0 0 0.6rem;
		padding: 0.2rem 0.6rem;
		border-left: 3px solid var(--accent, #3e7a4c);
		color: var(--soft, #555);
		font-size: 0.85rem;
		max-height: 4.5rem;
		overflow: hidden;
	}
	.review-pop textarea {
		width: 100%;
		min-height: 4.5rem;
		padding: 0.5rem;
		background: var(--bg, #fff);
		color: var(--ink, #111);
		font: inherit;
		font-size: 0.92rem;
		border: 1px solid var(--line, #ccc);
		border-radius: 6px;
		resize: vertical;
	}
	.review-pop .review-row {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		margin-top: 0.6rem;
	}
	.review-toast {
		position: fixed;
		bottom: 1.2rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 41;
		padding: 0.5rem 1rem;
		background: var(--accent, #3e7a4c);
		color: var(--bg, #fff);
		font-size: 0.9rem;
		border-radius: 999px;
	}`;
}

function contextAround(range: Range): { prefix: string; suffix: string } {
	const ancestor = range.commonAncestorContainer;
	const block = ancestor instanceof Element ? ancestor : (ancestor.parentElement ?? document.body);
	const before = document.createRange();
	before.selectNodeContents(block);
	before.setEnd(range.startContainer, range.startOffset);
	const after = document.createRange();
	after.selectNodeContents(block);
	after.setStart(range.endContainer, range.endOffset);
	return {
		prefix: before.toString().slice(-CONTEXT_CHARS),
		suffix: after.toString().slice(0, CONTEXT_CHARS)
	};
}

function sectionOf(range: Range): string | null {
	const ancestor = range.commonAncestorContainer;
	let element = ancestor instanceof Element ? ancestor : ancestor.parentElement;
	while (element) {
		const section = element.closest<HTMLElement>("section.lesson-section");
		if (section) return section.querySelector("h2")?.textContent?.trim() ?? section.id;
		element = element.parentElement;
		break;
	}
	// The one-column layout has no section wrappers; fall back to the nearest
	// heading above the selection.
	let node: Node | null = range.startContainer;
	while (node && node !== document.body) {
		let sibling: Node | null = node.previousSibling ?? node.parentNode;
		node = sibling;
		if (sibling instanceof HTMLHeadingElement) return sibling.textContent?.trim() ?? null;
	}
	return null;
}

function toast(message: string): void {
	const el = document.createElement("div");
	el.className = "review-toast";
	el.textContent = message;
	document.body.append(el);
	window.setTimeout(() => el.remove(), 1800);
}

export async function mountReview(): Promise<void> {
	try {
		const probe = await fetch("/review");
		if (!probe.ok) return;
	} catch {
		return;
	}

	const style = document.createElement("style");
	style.textContent = styles();
	document.head.append(style);

	const button = document.createElement("button");
	button.type = "button";
	button.className = "review-btn";
	button.textContent = "Leave a note";
	button.hidden = true;
	document.body.append(button);

	let pending: Omit<ReviewNote, "comment"> | null = null;
	let popover: HTMLElement | null = null;

	const hideButton = () => {
		button.hidden = true;
	};
	const closePopover = () => {
		popover?.remove();
		popover = null;
	};

	document.addEventListener("mouseup", event => {
		if (popover || event.target === button) return;
		window.setTimeout(() => {
			const selection = window.getSelection();
			if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
				hideButton();
				return;
			}
			const exact = selection.toString().trim();
			if (exact.length < 3) {
				hideButton();
				return;
			}
			const range = selection.getRangeAt(0);
			const rect = range.getBoundingClientRect();
			const { prefix, suffix } = contextAround(range);
			pending = {
				page: location.pathname,
				section: sectionOf(range),
				prefix,
				exact,
				suffix
			};
			button.style.left = `${window.scrollX + rect.left + rect.width / 2 - 45}px`;
			button.style.top = `${window.scrollY + rect.bottom + 8}px`;
			button.hidden = false;
		}, 0);
	});

	button.addEventListener("click", () => {
		if (!pending) return;
		const note = pending;
		hideButton();
		closePopover();

		popover = document.createElement("div");
		popover.className = "review-pop";
		popover.style.left = button.style.left;
		popover.style.top = button.style.top;

		const quote = document.createElement("blockquote");
		quote.textContent = note.exact;
		const field = document.createElement("textarea");
		field.placeholder = "What should change here?";
		const row = document.createElement("div");
		row.className = "review-row";
		const cancel = document.createElement("button");
		cancel.type = "button";
		cancel.textContent = "Cancel";
		cancel.addEventListener("click", closePopover);
		const save = document.createElement("button");
		save.type = "button";
		save.className = "primary";
		save.textContent = "Save note";
		save.addEventListener("click", async () => {
			const comment = field.value.trim();
			if (!comment) return;
			const response = await fetch("/review", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ ...note, comment })
			});
			closePopover();
			toast(response.ok ? "Saved to reviews.jsonl" : "Saving failed — is the dev server up?");
		});
		row.append(cancel, save);
		popover.append(quote, field, row);
		document.body.append(popover);
		field.focus();
	});

	document.addEventListener("keydown", event => {
		if (event.key === "Escape") {
			hideButton();
			closePopover();
		}
	});
}
