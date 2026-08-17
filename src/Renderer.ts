import type { Placement } from "./constants";

/**
 * Owns the tooltip DOM. Shares one element per tooltip key (named id, or ""
 * for the default) instead of creating one per anchor.
 */
export class Renderer {
	private elements = new Map<string, HTMLElement>();
	private describedByBackup = new WeakMap<Element, string | null>();
	private nextId = 1;

	// ponytail: explicit no-op constructor works around a bun/JSC coverage
	// quirk where implicit default constructors never register as "hit".
	constructor() {}

	private getElement(key: string): HTMLElement {
		let el = this.elements.get(key);
		if (!el) {
			el = document.createElement("div");
			el.className = "tooltip";
			el.setAttribute("role", "tooltip");
			el.id = `tooltip-${this.nextId++}`;
			el.dataset.state = "closed";
			document.body.appendChild(el);
			this.elements.set(key, el);
		}
		return el;
	}

	show(key: string, anchor: Element, content: string, place: Placement): HTMLElement {
		const el = this.getElement(key);
		el.textContent = content; // never innerHTML: content is plain text, not markup
		el.dataset.state = "open";
		el.dataset.place = place;

		if (!this.describedByBackup.has(anchor)) {
			this.describedByBackup.set(anchor, anchor.getAttribute("aria-describedby"));
		}
		anchor.setAttribute("aria-describedby", el.id);

		return el;
	}

	hide(key: string, anchor: Element | null): void {
		const el = this.elements.get(key);
		if (el) el.dataset.state = "closed";
		if (anchor) this.restoreDescribedBy(anchor);
	}

	restoreDescribedBy(anchor: Element): void {
		if (!this.describedByBackup.has(anchor)) return;
		const previous = this.describedByBackup.get(anchor);
		if (previous == null) anchor.removeAttribute("aria-describedby");
		else anchor.setAttribute("aria-describedby", previous);
		this.describedByBackup.delete(anchor);
	}

	destroy(): void {
		for (const el of this.elements.values()) el.remove();
		this.elements.clear();
	}
}
