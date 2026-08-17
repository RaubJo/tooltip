export const ATTR = {
	content: "data-tooltip",
	id: "data-tooltip-id",
	root: "data-tooltip-root",
	place: "data-tooltip-place",
	offset: "data-tooltip-offset",
	delay: "data-tooltip-delay",
	delayHide: "data-tooltip-delay-hide",
	disabled: "data-tooltip-disabled",
} as const;

export const PLACEMENTS = ["top", "right", "bottom", "left"] as const;

export type Placement = (typeof PLACEMENTS)[number];

export interface TooltipOptions {
	place: Placement;
	offset: number;
	delay: number;
	delayHide: number;
}

export const DEFAULT_OPTIONS: TooltipOptions = {
	place: "top",
	offset: 8,
	delay: 200,
	delayHide: 0,
};
