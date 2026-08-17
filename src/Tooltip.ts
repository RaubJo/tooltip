import type { TooltipOptions } from "./constants";
import { Manager } from "./Manager";

const manager = new Manager();

/** Public facade over Manager/Options/Renderer/Positioner. */
export const Tooltip = {
	boot: () => manager.boot(),
	configure: (options: Partial<TooltipOptions>) => manager.configure(options),
	show: (element: Element) => manager.show(element),
	hide: () => manager.hide(),
	destroy: () => manager.destroy(),
};
