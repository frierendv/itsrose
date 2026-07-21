import type { CustomLevels } from "../types";

/**
 * hex colors map
 *
 * @type {Record<CustomLevels, string>}
 */
export const colors: Record<CustomLevels, string> = {
	trace: "#9E9E9E",
	debug: "#00BCD4",
	info: "#4CAF50",
	warn: "#FFC107",
	error: "#F44336",
	fatal: "#B71C1C",
};

/**
 * Default hex color "#999999"
 *
 * @type {string}
 */
export const defaultColor: string = "#999999";
