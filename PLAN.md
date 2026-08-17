# Vanilla Tooltip Package — Project Handoff

## Project Goal

Build a small, framework-agnostic tooltip package that provides an experience similar to React Tooltip while operating entirely against the DOM.

The package must work without framework-specific integrations in:

* Vanilla HTML/JavaScript
* React
* Vue
* Svelte
* SolidJS
* Alpine
* Blade/server-rendered HTML
* Other environments that ultimately render standard DOM elements

The primary interface is HTML `data-*` attributes.

The simplest usage should be:

```html
<button data-tooltip="Add to deck">
	Add Card
</button>
```

The package discovers the trigger, creates/shows the tooltip, positions it, manages its lifecycle, and handles accessibility automatically.

---

# Design Principles

## DOM First

The DOM is the API boundary.

Frameworks should not need to import components, directives, hooks, actions, or other framework-specific abstractions.

The following should all behave identically:

```jsx
<button data-tooltip="React tooltip">
	React
</button>
```

```svelte
<button data-tooltip="Svelte tooltip">
	Svelte
</button>
```

```vue
<button data-tooltip="Vue tooltip">
	Vue
</button>
```

```html
<button data-tooltip="Vanilla tooltip">
	HTML
</button>
```

Framework support is achieved through standard DOM behavior rather than adapters.

---

## Progressive Enhancement

Elements without the tooltip runtime should remain ordinary, functional HTML.

The tooltip package enhances elements carrying the appropriate attributes.

No application state should depend on the tooltip library.

---

## Minimal Common Case

The most common tooltip should require one attribute:

```html
<button data-tooltip="Delete card">
	Delete
</button>
```

Additional attributes progressively configure behavior.

---

## Delegated Events

Do not require every tooltip trigger to be registered individually.

The package should use delegated document-level events to recognize tooltip anchors dynamically.

This is important for framework compatibility.

For example, an element rendered after initialization:

```js
container.innerHTML = `
	<button data-tooltip="Created later">
		Button
	</button>
`;
```

must work without calling:

```js
Tooltip.refresh();
```

A `MutationObserver` should not be necessary for ordinary trigger discovery.

---

# Public HTML API

## Basic Tooltip

```html
<button data-tooltip="Add this card to your deck">
	Add Card
</button>
```

`data-tooltip` contains plain-text tooltip content.

---

## Placement

```html
<button
	data-tooltip="Add to deck"
	data-tooltip-place="bottom"
>
	Add
</button>
```

Supported values:

```text
top
right
bottom
left
```

The positioning engine may automatically flip placement when the requested position does not fit within the viewport.

---

## Offset

```html
<button
	data-tooltip="Add to deck"
	data-tooltip-offset="12"
>
	Add
</button>
```

Offset represents the distance between the anchor and tooltip in pixels.

---

## Show Delay

```html
<button
	data-tooltip="Add to deck"
	data-tooltip-delay="300"
>
	Add
</button>
```

Delay is expressed in milliseconds.

---

## Hide Delay

```html
<button
	data-tooltip="Add to deck"
	data-tooltip-delay-hide="100"
>
	Add
</button>
```

---

## Disabled

Support disabling a tooltip without removing its content.

```html
<button
	data-tooltip="Add to deck"
	data-tooltip-disabled
>
	Add
</button>
```

The presence of `data-tooltip-disabled` disables the tooltip.

---

# Proposed Attribute API

Initial API:

```text
data-tooltip
data-tooltip-id
data-tooltip-place
data-tooltip-offset
data-tooltip-delay
data-tooltip-delay-hide
data-tooltip-disabled
```

Avoid adding configuration attributes until there is a concrete use case.

---

# Named Tooltips

The library should support shared/named tooltip configurations.

Example:

```html
<button
	data-tooltip="Add to deck"
	data-tooltip-id="cards"
>
	Add
</button>

<button
	data-tooltip="Remove from deck"
	data-tooltip-id="cards"
	data-tooltip-place="bottom"
>
	Remove
</button>

<div
	data-tooltip-root="cards"
	data-tooltip-place="right"
	data-tooltip-delay="250"
></div>
```

The root provides configuration shared by anchors referencing that tooltip ID.

Configuration precedence should be:

```text
Library Defaults
       ↓
Named Tooltip Configuration
       ↓
Anchor Configuration
```

Anchor configuration wins.

For example:

```html
<div
	data-tooltip-root="cards"
	data-tooltip-place="right"
></div>

<button
	data-tooltip="Add"
	data-tooltip-id="cards"
>
	Add
</button>
```

uses `right`.

Whereas:

```html
<button
	data-tooltip="Remove"
	data-tooltip-id="cards"
	data-tooltip-place="bottom"
>
	Remove
</button>
```

uses `bottom`.

---

# Default Tooltip

An explicit tooltip root should not be required.

This:

```html
<button data-tooltip="Hello">
	Hover me
</button>
```

should automatically use the global/default tooltip instance.

The runtime may lazily create its tooltip element when the first tooltip is shown.

---

# JavaScript API

The HTML API is primary, but programmatic control should also be available.

```js
import { Tooltip } from '@raubjo/tooltip';
```

Proposed API:

```js
Tooltip.boot();
Tooltip.configure(options);
Tooltip.show(element);
Tooltip.hide();
Tooltip.destroy();
```

## Configuration

Example:

```js
Tooltip.configure({
	place: 'top',
	offset: 8,
	delay: 200,
	delayHide: 0,
});
```

These values establish library defaults.

HTML configuration overrides them.

---

# Initialization

Two initialization strategies should be supported.

## Automatic

The simplest consumer experience:

```js
import '@raubjo/tooltip';
```

The package automatically initializes itself.

No additional setup is required.

---

## Manual

Applications or libraries requiring explicit lifecycle control can use:

```js
import { Tooltip } from '@raubjo/tooltip/core';

Tooltip.configure({
	place: 'top',
	offset: 8,
});

Tooltip.boot();
```

This allows initialization to happen at a controlled point in application startup.

---

# Runtime Architecture

Suggested internal structure:

```text
Tooltip
│
├── Manager
│   ├── boot
│   ├── delegated events
│   ├── active anchor
│   ├── show/hide timers
│   └── lifecycle
│
├── Options
│   ├── defaults
│   ├── root configuration
│   ├── anchor configuration
│   └── configuration resolution
│
├── Renderer
│   ├── tooltip DOM
│   ├── content
│   ├── state
│   └── accessibility
│
└── Positioner
    ├── placement
    ├── offset
    ├── flipping
    ├── viewport collision
    └── position updates
```

The public `Tooltip` API should act as the facade over these internals.

---

# Tooltip Manager

The manager owns runtime behavior.

Responsibilities include:

* Detect tooltip anchors.
* Track the currently active anchor.
* Resolve configuration.
* Handle show/hide delays.
* Handle pointer interaction.
* Handle keyboard focus.
* Handle Escape.
* Coordinate rendering.
* Coordinate positioning.
* Clean up runtime state.

There should not be a persistent JavaScript instance for every anchor unless implementation requirements eventually justify it.

The DOM itself should remain the source of configuration.

---

# Event Model

Use delegated events.

Conceptually:

```js
document.addEventListener('pointerover', event => {
	const anchor = event.target.closest('[data-tooltip]');

	if (!anchor) {
		return;
	}

	Tooltip.show(anchor);
});
```

Corresponding behavior:

```text
pointer enter
    ↓
resolve anchor
    ↓
resolve options
    ↓
wait show delay
    ↓
render
    ↓
position
```

Hide behavior:

```text
pointer leave
    ↓
wait hide delay
    ↓
hide
```

Keyboard behavior:

```text
focusin  → show
focusout → hide
Escape   → hide
```

Implementation should account for bubbling behavior so moving between descendants of the same tooltip anchor does not unnecessarily hide/reopen the tooltip.

---

# Dynamic DOM Support

Dynamic DOM support is a requirement.

This must work:

```jsx
function Card({ card }) {
	return (
		<button data-tooltip={`Add ${card.name} to deck`}>
			Add
		</button>
	);
}
```

regardless of when the component is mounted.

The library should not require:

```js
Tooltip.refresh();
```

after framework renders.

This is the primary reason for delegated event handling.

---

# Positioning

Use `@floating-ui/dom` as the initial positioning engine rather than implementing collision detection from scratch.

The Positioner should encapsulate Floating UI so the rest of the package does not depend directly on its API.

Conceptually:

```text
TooltipManager
      ↓
Positioner
      ↓
@floating-ui/dom
```

This preserves the ability to change positioning implementations later.

The initial Positioner should support:

* top/right/bottom/left placement
* offset
* automatic flipping
* viewport shifting
* position updates while open

The tooltip itself should normally use:

```css
position: fixed;
```

with coordinates supplied by the Positioner.

---

# Rendering

Prefer a shared tooltip element instead of generating one tooltip for every anchor.

Conceptually:

```html
<body>
	<!-- application -->

	<div
		class="tooltip"
		role="tooltip"
		data-state="open"
		data-place="top"
	>
		Add to deck
	</div>
</body>
```

The renderer updates this element as the active anchor changes.

Named tooltip roots may require separate runtime elements depending on implementation, but avoid unnecessary DOM instances.

---

# Content Security

`data-tooltip` is plain text.

Given:

```html
<button data-tooltip="<strong>Delete</strong>">
```

the tooltip should display:

```text
<strong>Delete</strong>
```

rather than rendering HTML.

Implementation should use:

```js
element.textContent = content;
```

Do not pass tooltip content directly to `innerHTML`.

Rich/interactive tooltip content is outside the initial scope.

---

# Accessibility

Accessibility behavior should be handled by the package rather than requiring consumers to manually configure it.

The rendered tooltip should have:

```html
role="tooltip"
```

When visible, associate the anchor with the tooltip using `aria-describedby`.

Example:

```html
<button
	data-tooltip="Delete card"
	aria-describedby="tooltip-4"
>
	Delete
</button>

<div
	id="tooltip-4"
	role="tooltip"
>
	Delete card
</div>
```

When the tooltip closes, restore the anchor's previous `aria-describedby` state.

Do not destroy pre-existing accessibility attributes.

Keyboard focus must trigger the same tooltip behavior as pointer interaction.

Escape should close the currently visible tooltip.

---

# Styling

The runtime should provide behavior and structural styling while leaving appearance highly customizable.

Example generated element:

```html
<div
	class="tooltip"
	role="tooltip"
	data-state="open"
	data-place="top"
>
	Delete card
</div>
```

Useful state attributes:

```text
data-state="open"
data-state="closed"

data-place="top"
data-place="right"
data-place="bottom"
data-place="left"
```

Consumers can therefore target:

```css
.tooltip[data-state="open"] {
	opacity: 1;
}

.tooltip[data-place="bottom"] {
	/* placement-specific presentation */
}
```

---

# CSS Variables

Ship reasonable defaults through custom properties.

Potential API:

```css
.tooltip {
	--tooltip-background: #111;
	--tooltip-color: #fff;

	--tooltip-radius: 6px;

	--tooltip-padding-x: 8px;
	--tooltip-padding-y: 4px;

	--tooltip-font-size: 0.75rem;

	--tooltip-shadow: 0 2px 8px rgb(0 0 0 / 0.15);
}
```

Consumers should be able to theme the component without replacing the runtime stylesheet.

---

# State

Avoid making CSS visibility the authoritative runtime state.

The manager should explicitly know whether a tooltip is:

```text
closed
waiting-to-open
open
waiting-to-close
```

This prevents race conditions involving delays.

Example:

```text
pointerenter
    ↓
300ms show scheduled

100ms later:
pointerleave
    ↓
cancel show
```

Likewise:

```text
pointerleave
    ↓
200ms hide scheduled

pointerenter
    ↓
cancel hide
```

Timers must be cleaned up when state changes.

---

# Anchor Switching

Moving directly between tooltip anchors should be handled gracefully.

Example:

```text
Anchor A
   ↓
tooltip opens
   ↓
pointer moves to Anchor B
   ↓
content changes
   ↓
tooltip repositions
```

Avoid unnecessary DOM destruction/recreation.

The manager should update the existing tooltip whenever practical.

---

# Lifecycle

## boot()

Responsibilities:

* Register delegated event listeners.
* Prepare runtime state.
* Register keyboard behavior.
* Detect/configure named roots as necessary.

Calling `boot()` multiple times should not register duplicate listeners.

---

## destroy()

Responsibilities:

* Remove event listeners.
* Cancel timers.
* Stop positioning updates.
* Remove generated tooltip DOM.
* Restore modified accessibility attributes.
* Reset internal state.

After destruction, calling:

```js
Tooltip.boot();
```

should initialize the library again cleanly.

---

# Proposed Package Structure

```text
src/
├── Tooltip.js
├── Manager.js
├── Options.js
├── Renderer.js
├── Positioner.js
├── constants.js
├── tooltip.css
├── index.js
└── auto.js
```

Possible exports:

```text
@raubjo/tooltip
@raubjo/tooltip/core
@raubjo/tooltip/style.css
```

Where:

```text
@raubjo/tooltip
    → auto initialized

@raubjo/tooltip/core
    → explicit API

@raubjo/tooltip/style.css
    → default presentation
```

Exact package naming can be determined separately.

---

# Framework Compatibility

Do not build framework integrations for v1.

Framework examples should demonstrate that standard attributes are sufficient.

## React

```jsx
<button
	data-tooltip="Add to deck"
	data-tooltip-place="top"
>
	Add
</button>
```

## Svelte

```svelte
<button
	data-tooltip="Add to deck"
	data-tooltip-place="top"
>
	Add
</button>
```

## Vue

```vue
<button
	data-tooltip="Add to deck"
	data-tooltip-place="top"
>
	Add
</button>
```

## Solid

```jsx
<button
	data-tooltip="Add to deck"
	data-tooltip-place="top"
>
	Add
</button>
```

If a framework requires special library support to make these examples work, treat that as an architectural problem in the core package before creating an adapter.

---

# Out of Scope for v1

Do not initially implement:

* React components
* Vue directives
* Svelte actions
* Solid directives
* Interactive popovers
* Menus
* Arbitrary HTML tooltip content
* Forms inside tooltips
* Click-triggered dialogs
* Complex animation systems
* Remote/async tooltip content
* Persistent tooltip instances for every anchor

Keep Tooltip narrowly focused on describing an element through transient text.

Features requiring user interaction with the floating content should eventually belong to a separate Popover primitive.

---

# Testing Requirements

Tests should cover both behavior and DOM cleanup.

At minimum:

### Discovery

* Recognizes `[data-tooltip]`.
* Ignores unrelated elements.
* Recognizes dynamically inserted anchors.

### Content

* Displays correct text.
* Does not interpret HTML.
* Updates when moving between anchors.

### Configuration

Verify precedence:

```text
defaults < named root < anchor
```

Test placement, offset, delays, and disabled state.

### Pointer

Test:

```text
pointer enter → show
pointer leave → hide
```

Including nested elements inside the trigger.

### Keyboard

Test:

```text
focus → show
blur → hide
Escape → hide
```

### Timing

Test:

* delayed show
* canceled delayed show
* delayed hide
* canceled delayed hide
* rapid anchor switching

### Accessibility

Verify:

* `role="tooltip"`
* `aria-describedby`
* preservation of existing `aria-describedby`
* cleanup after hiding
* cleanup after `destroy()`

### Lifecycle

Verify:

```js
Tooltip.boot();
Tooltip.boot();
```

does not duplicate behavior.

Verify:

```js
Tooltip.destroy();
Tooltip.boot();
```

works correctly.

---

# Initial Implementation Order

1. Establish package exports and build configuration.
2. Define default options and attribute parsing.
3. Implement delegated anchor detection.
4. Implement Manager state/lifecycle.
5. Implement basic Renderer.
6. Implement pointer show/hide.
7. Implement focus and Escape behavior.
8. Implement accessibility association.
9. Implement Positioner around `@floating-ui/dom`.
10. Implement delays and cancellation.
11. Implement named tooltip roots.
12. Add default CSS and CSS variables.
13. Add automatic initialization entrypoint.
14. Add lifecycle and dynamic-DOM tests.
15. Add framework examples demonstrating the same DOM API.

---

# v1 Acceptance Criteria

A consumer should be able to install the package, import it once:

```js
import '@raubjo/tooltip';
```

and write:

```html
<button data-tooltip="Add to deck">
	Add
</button>
```

The resulting tooltip must:

* appear on pointer hover;
* appear on keyboard focus;
* disappear appropriately;
* close with Escape;
* remain positioned relative to its anchor;
* avoid viewport overflow when practical;
* dynamically work with elements mounted after initialization;
* expose appropriate tooltip accessibility semantics;
* require no framework-specific integration;
* safely treat content as text;
* be themeable through CSS;
* clean up correctly when destroyed.

The core architectural rule is:

> **Tooltip is a DOM capability, not a framework component.**

React, Vue, Svelte, Solid, Blade, Alpine, and vanilla JavaScript should all consume the same HTML API without the tooltip package needing to know which one produced the DOM.
