import type { CustomLevelsMap, PinoCustomLevelsMap } from "../types";

/**
 * Mapping of custom log level names to their numeric priorities.
 * Lower numbers indicate higher severity or higher verbosity.
 *
 * @type {CustomLevelsMap}
 */
export const logLevels: CustomLevelsMap = {
	trace: 10,
	debug: 20,
	info: 30,
	warn: 40,
	error: 50,
	fatal: 60,
};

/**
 * Inverted mapping of numeric log priorities to custom log level names.
 * Used for formatting Pino log chunks.
 *
 * @type {PinoCustomLevelsMap}
 */
export const pinoLoglevels: PinoCustomLevelsMap = {
	10: "trace",
	20: "debug",
	30: "info",
	40: "warn",
	50: "error",
	60: "fatal",
};
