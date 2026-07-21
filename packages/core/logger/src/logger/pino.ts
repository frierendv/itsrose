import type { Logger, LoggerOptions } from "pino";
import { logLevels, pinoTransport } from "../pino-transport";
import type { CustomLevelsMap, ITransportOptions } from "../types";

/** @internal */
export type PinoLoggerOptions<Levels extends string> = Omit<
	ITransportOptions,
	"customLevels"
> &
	Omit<LoggerOptions<Levels, true>, "customLevels"> & {
		customLevels?: CustomLevelsMap<Levels>;
	};

/**
 * Small utillity to create pino default instance with pretty print (similar like pino-pretty).
 * It use {@linkcode process.stdout.write} to print in console (see {@linkcode pinoTransport})
 *
 * @template {typeof import("pino")} TFactory
 * @template {string} Levels
 * @param {TFactory} pino
 * @param {PinoLoggerOptions<Levels>} [options={}]
 * @returns {Logger<Levels, true>}
 */
export const createPino = <
	TFactory extends typeof import("pino"),
	Levels extends string,
>(
	pino: TFactory,
	options: PinoLoggerOptions<Levels> = {}
): Logger<Levels, true> => {
	const { appName, customLevels, customColors, ...pinoOptions } = options;

	const mergedCustomLevels = {
		...logLevels,
		...(customLevels ?? {}),
	} as CustomLevelsMap<Levels>;

	const finalOptions = {
		...pinoOptions,
		customLevels: mergedCustomLevels,
		useOnlyCustomLevels: true as const,
	};

	return pino<Levels, true>(
		finalOptions,
		pinoTransport({
			appName,
			customLevels: mergedCustomLevels,
			customColors,
		})
	);
};
