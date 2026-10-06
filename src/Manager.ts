import { ATTR, DEFAULT_OPTIONS, type TooltipOptions } from "./constants";
import { isDisabled, resolveOptions, tooltipKey } from "./Options";
import { Positioner } from "./Positioner";
import { Renderer } from "./Renderer";

type State = "closed" | "waiting-to-open" | "open" | "waiting-to-close";

const SELECTOR = `[${ATTR.content}]`;

function closestAnchor(target: EventTarget | null): Element | null {
	if (!(target instanceof Element)) return null;
	return target.closest(SELECTOR);
}

/**
 * Focus the browser chose not to show — e.g. a popover handing focus back to its
 * trigger after a click. The tooltip follows the focus ring: no ring, no tooltip.
 * Only real focus is judged; a bare dispatched focusin isn't focus at all.
 */
function isFocusHidden(target: EventTarget | null): boolean {
	if (!(target instanceof Element) || !target.matches(":focus")) return false;
	try {
		return !target.matches(":focus-visible");
	} catch {
		return false;
	}
}

/** Owns delegated events, show/hide timing, and lifecycle. One shared instance per page. */
export class Manager {
	private booted = false;
	private controller: AbortController | null = null;
	private state: State = "closed";
	private activeAnchor: Element | null = null;
	protected anchorObserver: MutationObserver | null = null;
	private showTimer: ReturnType<typeof setTimeout> | null = null;
	private hideTimer: ReturnType<typeof setTimeout> | null = null;

	private defaults: TooltipOptions = { ...DEFAULT_OPTIONS };
	private renderer = new Renderer();
	private positioner = new Positioner();

	// ponytail: explicit no-op constructor works around a bun/JSC coverage
	// quirk where implicit default constructors never register as "hit".
	constructor() {}

	configure(options: Partial<TooltipOptions>): void {
		Object.assign(this.defaults, options);
	}

	boot(): void {
		if (this.booted) return;
		this.booted = true;

		this.controller = new AbortController();
		const { signal } = this.controller;

		document.addEventListener("pointerover", this.onPointerOver, { signal });
		document.addEventListener("pointerout", this.onPointerOut, { signal });
		document.addEventListener("pointerdown", this.onPointerDown, { signal });
		document.addEventListener("focusin", this.onFocusIn, { signal });
		document.addEventListener("focusout", this.onFocusOut, { signal });
		document.addEventListener("keydown", this.onKeyDown, { signal });
	}

	destroy(): void {
		this.controller?.abort();
		this.controller = null;
		this.close();
		this.renderer.destroy();
		this.booted = false;
	}

	/** Imperative show, bypassing delegated discovery and delays. */
	show(anchor: Element): void {
		this.clearTimers();
		this.open(anchor);
	}

	/** Imperative hide of whatever tooltip is currently active. */
	hide(): void {
		this.clearTimers();
		this.close();
	}

	private onPointerOver = (event: PointerEvent): void => {
		const anchor = closestAnchor(event.target);
		if (!anchor) return;
		this.activate(anchor);
	};

	private onPointerOut = (event: PointerEvent): void => {
		const anchor = closestAnchor(event.target);
		if (!anchor || anchor !== this.activeAnchor) return;
		if (this.movedWithin(anchor, event.relatedTarget)) return;
		this.deactivate();
	};

	protected onPointerDown = (event: PointerEvent): void => {
		if (closestAnchor(event.target) !== this.activeAnchor) return;
		this.close();
	};

	private onFocusIn = (event: FocusEvent): void => {
		const anchor = closestAnchor(event.target);
		if (!anchor || isFocusHidden(event.target)) return;
		this.activate(anchor);
	};

	private onFocusOut = (event: FocusEvent): void => {
		const anchor = closestAnchor(event.target);
		if (!anchor || anchor !== this.activeAnchor) return;
		if (this.movedWithin(anchor, event.relatedTarget)) return;
		this.deactivate();
	};

	private onKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== "Escape" || this.state === "closed") return;
		this.clearTimers();
		this.close();
	};

	/** True when focus/pointer moved to a descendant of the same anchor, not away from it. */
	private movedWithin(anchor: Element, related: EventTarget | null): boolean {
		return related instanceof Node && anchor.contains(related);
	}

	protected activate(anchor: Element): void {
		if (!anchor.isConnected || isDisabled(anchor)) return;

		// Already showing (or about to show) this anchor: just cancel any pending hide.
		if (anchor === this.activeAnchor) {
			this.clearTimers();
			if (this.state === "waiting-to-close") this.state = "open";
			return;
		}

		this.clearTimers();

		// Moving directly between two already-open anchors: no re-opening delay.
		if (this.state === "open" && this.activeAnchor) {
			this.open(anchor);
			return;
		}

		this.activeAnchor = anchor;
		this.observeAnchor(anchor);
		this.state = "waiting-to-open";
		const { delay } = resolveOptions(this.defaults, anchor);
		this.showTimer = setTimeout(() => this.open(anchor), delay);
	}

	protected deactivate(): void {
		if (this.state === "waiting-to-open") {
			this.close();
			return;
		}
		if (this.state !== "open" || !this.activeAnchor) return;

		const { delayHide } = resolveOptions(this.defaults, this.activeAnchor);
		this.state = "waiting-to-close";
		this.hideTimer = setTimeout(() => this.close(), delayHide);
	}

	protected open(anchor: Element): void {
		this.clearTimers();
		const content = anchor.getAttribute(ATTR.content);
		if (!anchor.isConnected || isDisabled(anchor) || !content) {
			this.close();
			return;
		}

		if (this.activeAnchor && this.activeAnchor !== anchor) {
			this.renderer.hide(tooltipKey(this.activeAnchor), this.activeAnchor);
		}
		this.activeAnchor = anchor;
		this.observeAnchor(anchor);

		const options = resolveOptions(this.defaults, anchor);
		const el = this.renderer.show(tooltipKey(anchor), anchor, content, options.place);
		this.positioner.position(anchor, el, options.place, options.offset);
		this.state = "open";
	}

	protected observeAnchor(anchor: Element): void {
		this.anchorObserver?.disconnect();
		this.anchorObserver = new MutationObserver(() => {
			if (this.activeAnchor && !this.activeAnchor.isConnected) this.close();
		});
		this.anchorObserver.observe(anchor.ownerDocument, { childList: true, subtree: true });
	}

	protected close(): void {
		this.clearTimers();
		this.anchorObserver?.disconnect();
		this.anchorObserver = null;
		this.positioner.stop();
		if (this.activeAnchor) this.renderer.hide(tooltipKey(this.activeAnchor), this.activeAnchor);
		this.activeAnchor = null;
		this.state = "closed";
	}

	private clearTimers(): void {
		if (this.showTimer) clearTimeout(this.showTimer);
		if (this.hideTimer) clearTimeout(this.hideTimer);
		this.showTimer = null;
		this.hideTimer = null;
	}
}
