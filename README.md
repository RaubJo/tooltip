# @raubjo/tooltip

A framework-agnostic tooltip. It watches the DOM for `data-tooltip`
attributes and shows/hides/positions/cleans-up automatically — no
components, directives, hooks, or `refresh()` calls required.

```bash
bun install
bun test
```

## Usage

```js
import '@raubjo/tooltip'; // auto-boots
```

```html
<button data-tooltip="Add to deck">Add Card</button>
```

That's it. Works identically in React, Vue, Svelte, Solid, Alpine,
Blade/server-rendered HTML, or plain DOM — the tooltip runtime only ever
looks at attributes and delegated document-level events, so it doesn't care
what rendered them or when.

```jsx
// React — no import beyond the top-level `import '@raubjo/tooltip'`
<button data-tooltip={`Add ${card.name} to deck`}>Add</button>
```

## Attributes

| Attribute | Purpose |
|---|---|
| `data-tooltip` | Tooltip text (rendered as text, never HTML). |
| `data-tooltip-id` | Shares config/DOM with a `data-tooltip-root`. |
| `data-tooltip-place` | `top` \| `right` \| `bottom` \| `left` (auto-flips if it doesn't fit). |
| `data-tooltip-offset` | Anchor-to-tooltip gap in px. |
| `data-tooltip-delay` | Show delay in ms. |
| `data-tooltip-delay-hide` | Hide delay in ms. |
| `data-tooltip-disabled` | Presence disables the tooltip. |

### Named tooltips

```html
<div data-tooltip-root="cards" data-tooltip-place="right" data-tooltip-delay="250"></div>

<button data-tooltip="Add" data-tooltip-id="cards">Add</button>
<button data-tooltip="Remove" data-tooltip-id="cards" data-tooltip-place="bottom">Remove</button>
```

Config resolves `defaults < root < anchor` — anchor attributes always win.

## JS API

```js
import { Tooltip } from '@raubjo/tooltip/core'; // manual init, no auto-boot

Tooltip.configure({ place: 'top', offset: 8, delay: 200, delayHide: 0 });
Tooltip.boot();
Tooltip.show(element);
Tooltip.hide();
Tooltip.destroy();
```

`Tooltip.boot()` is idempotent. `Tooltip.destroy()` removes listeners,
timers, generated DOM, and restores any `aria-describedby` it touched;
calling `boot()` again afterwards works cleanly.

## Styling

```css
@import '@raubjo/tooltip/style.css';

.tooltip {
	--tooltip-background: #111;
	--tooltip-color: #fff;
}
```

State is exposed via attributes, not inline styles:

```css
.tooltip[data-state="open"] { }
.tooltip[data-place="bottom"] { }
```

## Out of scope (v1)

No framework adapters, no rich/HTML tooltip content, no click-triggered
popovers or menus — see [PLAN.md](./PLAN.md) for the full rationale.
