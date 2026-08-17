import { ATTR, PLACEMENTS, type Placement, type TooltipOptions } from "./constants";

const PLACEMENT_SET: readonly string[] = PLACEMENTS;

/** Reads whichever `data-tooltip-*` config attributes are present on an element. */
function parseAttributes(el: Element): Partial<TooltipOptions> {
	const out: Partial<TooltipOptions> = {};

	const place = el.getAttribute(ATTR.place);
	if (place && PLACEMENT_SET.includes(place)) out.place = place as Placement;

	const offset = el.getAttribute(ATTR.offset);
	if (offset != null && offset !== "") out.offset = Number(offset);

	const delay = el.getAttribute(ATTR.delay);
	if (delay != null && delay !== "") out.delay = Number(delay);

	const delayHide = el.getAttribute(ATTR.delayHide);
	if (delayHide != null && delayHide !== "") out.delayHide = Number(delayHide);

	return out;
}

/** Finds the `[data-tooltip-root]` sharing an anchor's `data-tooltip-id`, if any. */
function findRoot(id: string): Element | null {
	// Array.prototype.find via .call rather than for-of: NodeListOf's iterator
	// needs the DOM.Iterable lib, which a consuming project's tsconfig may not enable.
	const roots = document.querySelectorAll(`[${ATTR.root}]`);
	return Array.prototype.find.call(roots, (el: Element) => el.getAttribute(ATTR.root) === id) ?? null;
}

/** Resolves final config for an anchor: defaults < named root < anchor. */
export function resolveOptions(defaults: TooltipOptions, anchor: Element): TooltipOptions {
	const anchorId = anchor.getAttribute(ATTR.id);
	const root = anchorId ? findRoot(anchorId) : null;

	return {
		...defaults,
		...(root ? parseAttributes(root) : null),
		...parseAttributes(anchor),
	};
}

export function isDisabled(anchor: Element): boolean {
	return anchor.hasAttribute(ATTR.disabled);
}

/** Groups anchors that share a tooltip DOM instance: named id, or "" for the default. */
export function tooltipKey(anchor: Element): string {
	return anchor.getAttribute(ATTR.id) ?? "";
}
