import type { CustomLevelsMap, PinoCustomLevelsMap } from "../types";

/**
 * Description placeholder
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
 * Description placeholder
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
