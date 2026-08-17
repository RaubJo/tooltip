import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import type { Placement } from "./constants";

/**
 * Wraps @floating-ui/dom so the rest of the package never touches its API
 * directly, keeping the option open to swap positioning engines later.
 */
export class Positioner {
	private stopAutoUpdate: (() => void) | null = null;

	// ponytail: explicit no-op constructor works around a bun/JSC coverage
	// quirk where implicit default constructors never register as "hit".
	constructor() {}

	position(anchor: Element, tooltip: HTMLElement, place: Placement, gap: number): void {
		this.stop();

		const update = () => {
			computePosition(anchor, tooltip, {
				placement: place,
				middleware: [offset(gap), flip(), shift({ padding: 8 })],
			}).then(({ x, y, placement }) => {
				tooltip.style.left = `${x}px`;
				tooltip.style.top = `${y}px`;
				tooltip.dataset.place = placement.split("-")[0];
			});
		};

		this.stopAutoUpdate = autoUpdate(anchor, tooltip, update);
	}

	stop(): void {
		this.stopAutoUpdate?.();
		this.stopAutoUpdate = null;
	}
}
