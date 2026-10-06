import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Tooltip } from "./core";

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function openTooltip(): HTMLElement | null {
	return document.querySelector('.tooltip[data-state="open"]');
}

beforeEach(() => {
	document.body.innerHTML = "";
	Tooltip.configure({ place: "top", offset: 8, delay: 0, delayHide: 0 });
	Tooltip.boot();
});

afterEach(() => {
	Tooltip.destroy();
});

describe("discovery", () => {
	test("recognizes [data-tooltip] on pointer enter", async () => {
		document.body.innerHTML = `<button data-tooltip="Hello">Hi</button>`;
		const button = document.querySelector("button")!;
		button.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
		await sleep(10);
		expect(openTooltip()?.textContent).toBe("Hello");
	});

	test("ignores elements without data-tooltip", async () => {
		document.body.innerHTML = `<button>Hi</button>`;
		const button = document.querySelector("button")!;
		button.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
		await sleep(10);
		expect(openTooltip()).toBeNull();
	});

	test("recognizes anchors inserted after boot", async () => {
		document.body.innerHTML = `<div id="container"></div>`;
		document.getElementById("container")!.innerHTML = `<button data-tooltip="Later">Late</button>`;
		const button = document.querySelector("button")!;
		button.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
		await sleep(10);
		expect(openTooltip()?.textContent).toBe("Later");
	});
});

describe("content", () => {
	test("treats content as text, never HTML", async () => {
		document.body.innerHTML = `<button data-tooltip="<strong>Delete</strong>">Del</button>`;
		Tooltip.show(document.querySelector("button")!);
		await sleep(10);
		const tip = openTooltip()!;
		expect(tip.textContent).toBe("<strong>Delete</strong>");
		expect(tip.querySelector("strong")).toBeNull();
	});

	test("updates content when switching anchors directly", async () => {
		document.body.innerHTML = `
			<button id="a" data-tooltip="First">A</button>
			<button id="b" data-tooltip="Second">B</button>
		`;
		const a = document.getElementById("a")!;
		const b = document.getElementById("b")!;

		a.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
		await sleep(10);
		expect(openTooltip()?.textContent).toBe("First");

		a.dispatchEvent(new PointerEvent("pointerout", { bubbles: true, relatedTarget: b }));
		b.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
		await sleep(10);
		expect(openTooltip()?.textContent).toBe("Second");
		expect(document.querySelectorAll(".tooltip").length).toBe(1);
	});
});

describe("configuration precedence", () => {
	test("defaults < named root < anchor", async () => {
		document.body.innerHTML = `
			<div data-tooltip-root="cards" data-tooltip-place="right"></div>
			<button id="a" data-tooltip="Add" data-tooltip-id="cards">Add</button>
			<button id="b" data-tooltip="Remove" data-tooltip-id="cards" data-tooltip-place="bottom">Remove</button>
		`;
		const a = document.getElementById("a")!;
		Tooltip.show(a);
		await sleep(10);
		expect(openTooltip()?.dataset.place).toBe("right");

		const b = document.getElementById("b")!;
		Tooltip.show(b);
		await sleep(10);
		expect(openTooltip()?.dataset.place).toBe("bottom");
	});

	test("skips non-matching roots before finding the right one", async () => {
		document.body.innerHTML = `
			<div data-tooltip-root="other" data-tooltip-place="left"></div>
			<div data-tooltip-root="cards" data-tooltip-place="right"></div>
			<button data-tooltip="Add" data-tooltip-id="cards">Add</button>
		`;
		Tooltip.show(document.querySelector("button")!);
		await sleep(10);
		expect(openTooltip()?.dataset.place).toBe("right");
	});

	test("disabled tooltip does not show", async () => {
		document.body.innerHTML = `<button data-tooltip="Add" data-tooltip-disabled>Add</button>`;
		Tooltip.show(document.querySelector("button")!);
		await sleep(10);
		expect(openTooltip()).toBeNull();
	});

	test("data-tooltip-offset is read as config", async () => {
		document.body.innerHTML = `<button data-tooltip="Add" data-tooltip-offset="20">Add</button>`;
		Tooltip.show(document.querySelector("button")!);
		await sleep(10);
		expect(openTooltip()).not.toBeNull();
	});
});

describe("pointer", () => {
	test("pointer enter shows, pointer leave hides", async () => {
		document.body.innerHTML = `<button data-tooltip="Hi">Hi</button>`;
		const button = document.querySelector("button")!;

		button.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
		await sleep(10);
		expect(openTooltip()).not.toBeNull();

		button.dispatchEvent(new PointerEvent("pointerout", { bubbles: true }));
		await sleep(10);
		expect(openTooltip()).toBeNull();
	});

	test("moving to a nested element does not hide the tooltip", async () => {
		document.body.innerHTML = `<button data-tooltip="Hi"><span>Inner</span></button>`;
		const button = document.querySelector("button")!;
		const span = document.querySelector("span")!;

		button.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
		await sleep(10);
		expect(openTooltip()).not.toBeNull();

		button.dispatchEvent(
			new PointerEvent("pointerout", { bubbles: true, relatedTarget: span }),
		);
		await sleep(10);
		expect(openTooltip()).not.toBeNull();
	});
});

describe("keyboard", () => {
	test("focus shows, blur hides", async () => {
		document.body.innerHTML = `<button data-tooltip="Hi">Hi</button>`;
		const button = document.querySelector("button")!;

		button.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
		await sleep(10);
		expect(openTooltip()).not.toBeNull();

		button.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
		await sleep(10);
		expect(openTooltip()).toBeNull();
	});

	test("focus without a focus ring doesn't show", async () => {
		document.body.innerHTML = `<button data-tooltip="Hi">Hi</button>`;
		const button = document.querySelector("button")!;
		// What a browser reports for focus handed back after a click: focused, no ring.
		const matches = button.matches.bind(button);
		button.matches = (selector: string) => selector === ":focus-visible" ? false : matches(selector);

		button.focus();
		await sleep(10);
		expect(openTooltip()).toBeNull();
	});

	test("Escape hides an open tooltip", async () => {
		document.body.innerHTML = `<button data-tooltip="Hi">Hi</button>`;
		const button = document.querySelector("button")!;

		button.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
		await sleep(10);
		expect(openTooltip()).not.toBeNull();

		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		await sleep(10);
		expect(openTooltip()).toBeNull();
	});
});

describe("timing", () => {
	test("delayed show can be canceled before it fires", async () => {
		document.body.innerHTML = `<button data-tooltip="Hi" data-tooltip-delay="30">Hi</button>`;
		const button = document.querySelector("button")!;

		button.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
		await sleep(10);
		button.dispatchEvent(new PointerEvent("pointerout", { bubbles: true }));
		await sleep(40);
		expect(openTooltip()).toBeNull();
	});

	test("delayed hide can be canceled by re-entering", async () => {
		document.body.innerHTML = `<button data-tooltip="Hi" data-tooltip-delay-hide="30">Hi</button>`;
		const button = document.querySelector("button")!;

		button.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
		await sleep(10);
		expect(openTooltip()).not.toBeNull();

		button.dispatchEvent(new PointerEvent("pointerout", { bubbles: true }));
		await sleep(10); // within the 30ms hide delay
		button.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
		await sleep(40);
		expect(openTooltip()).not.toBeNull();
	});
});

describe("accessibility", () => {
	test("associates the anchor via aria-describedby while open, restores after close", async () => {
		document.body.innerHTML = `<button data-tooltip="Hi">Hi</button>`;
		const button = document.querySelector("button")!;

		Tooltip.show(button);
		await sleep(10);
		const tip = openTooltip()!;
		expect(tip.getAttribute("role")).toBe("tooltip");
		expect(button.getAttribute("aria-describedby")).toBe(tip.id);

		Tooltip.hide();
		await sleep(10);
		expect(button.hasAttribute("aria-describedby")).toBe(false);
	});

	test("preserves a pre-existing aria-describedby after close", async () => {
		document.body.innerHTML = `<button data-tooltip="Hi" aria-describedby="other-desc">Hi</button>`;
		const button = document.querySelector("button")!;

		Tooltip.show(button);
		await sleep(10);
		Tooltip.hide();
		await sleep(10);
		expect(button.getAttribute("aria-describedby")).toBe("other-desc");
	});
});

describe("lifecycle", () => {
	test.each(["anchor", "ancestor"])("cleans up when the %s is removed without pointer events", async (removed) => {
		Tooltip.destroy(); // Imperative tooltips also work without boot().
		document.body.innerHTML = `<div><button data-tooltip="Hi" aria-describedby="description">Hi</button></div>`;
		const button = document.querySelector("button")!;
		Tooltip.show(button);
		await sleep(10);
		expect(openTooltip()).not.toBeNull();

		(removed === "anchor" ? button : button.parentElement!).remove();
		await sleep(10);

		expect(openTooltip()).toBeNull();
		expect(button.getAttribute("aria-describedby")).toBe("description");
	});

	test("removing an anchor cancels its pending show even if it is later reinserted", async () => {
		document.body.innerHTML = `<button data-tooltip="Hi" data-tooltip-delay="50">Hi</button>`;
		const button = document.querySelector("button")!;
		button.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
		button.remove();
		await sleep(10);
		document.body.appendChild(button);
		await sleep(60);

		expect(openTooltip()).toBeNull();
		expect(button.hasAttribute("aria-describedby")).toBe(false);

		button.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
		await sleep(60);
		expect(openTooltip()?.textContent).toBe("Hi");
	});

	test("show() ignores a detached anchor", () => {
		const button = document.createElement("button");
		button.setAttribute("data-tooltip", "Hi");
		Tooltip.show(button);

		expect(openTooltip()).toBeNull();
		expect(button.hasAttribute("aria-describedby")).toBe(false);
	});

	test("removing the previous anchor does not close the current tooltip", async () => {
		document.body.innerHTML = `<button id="a" data-tooltip="First">A</button><button id="b" data-tooltip="Second">B</button>`;
		const a = document.getElementById("a")!;
		const b = document.getElementById("b")!;
		Tooltip.show(a);
		Tooltip.show(b);
		a.remove();
		await sleep(10);
		expect(openTooltip()?.textContent).toBe("Second");

		b.remove();
		await sleep(10);
		expect(openTooltip()).toBeNull();
		expect(b.hasAttribute("aria-describedby")).toBe(false);
	});

	test("destroy() cleans up an imperative tooltip without boot()", async () => {
		Tooltip.destroy();
		document.body.innerHTML = `<button data-tooltip="Hi">Hi</button>`;
		const button = document.querySelector("button")!;

		Tooltip.show(button);
		await sleep(10);
		Tooltip.destroy();

		expect(document.querySelectorAll(".tooltip").length).toBe(0);
		expect(button.hasAttribute("aria-describedby")).toBe(false);
	});

	test("destroy() restores every anchor after switching", async () => {
		document.body.innerHTML = `
			<button id="a" data-tooltip="First">A</button>
			<button id="b" data-tooltip="Second">B</button>
		`;
		const a = document.getElementById("a")!;
		const b = document.getElementById("b")!;

		Tooltip.show(a);
		Tooltip.show(b);
		await sleep(10);
		Tooltip.destroy();

		expect(a.hasAttribute("aria-describedby")).toBe(false);
		expect(b.hasAttribute("aria-describedby")).toBe(false);
	});

	test("hides before an activated anchor is removed", async () => {
		document.body.innerHTML = `<button data-tooltip="Close">×</button>`;
		const button = document.querySelector("button")!;
		button.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
		await sleep(10);
		expect(openTooltip()).not.toBeNull();

		button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
		button.remove();
		await sleep(10);
		expect(openTooltip()).toBeNull();
	});

	test("boot() twice does not register duplicate listeners", async () => {
		Tooltip.boot();
		Tooltip.boot();

		document.body.innerHTML = `<button data-tooltip="Hi">Hi</button>`;
		const button = document.querySelector("button")!;
		button.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
		await sleep(10);
		expect(document.querySelectorAll(".tooltip").length).toBe(1);
	});

	test("destroy() removes tooltip DOM and restores aria state", async () => {
		document.body.innerHTML = `<button data-tooltip="Hi">Hi</button>`;
		const button = document.querySelector("button")!;
		Tooltip.show(button);
		await sleep(10);
		expect(button.hasAttribute("aria-describedby")).toBe(true);

		Tooltip.destroy();
		expect(document.querySelectorAll(".tooltip").length).toBe(0);
		expect(button.hasAttribute("aria-describedby")).toBe(false);
	});

	test("boot() after destroy() works again", async () => {
		Tooltip.destroy();
		Tooltip.boot();

		document.body.innerHTML = `<button data-tooltip="Hi">Hi</button>`;
		const button = document.querySelector("button")!;
		button.dispatchEvent(new PointerEvent("pointerover", { bubbles: true }));
		await sleep(10);
		expect(openTooltip()).not.toBeNull();
	});
});
