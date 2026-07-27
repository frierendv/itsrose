import chalk from "chalk";
import type { ITransportOptions } from "../types";
import { isErrorLike, serializeError } from "./errors";

/**
 * Safely stringify objects, handling circular references and error serialization.
 *
 * @param {unknown} value The value to stringify.
 * @returns {string} The JSON stringified representation of the value.
 */
const safeStringify = (value: unknown): string => {
	const seen = new WeakSet<object>();
	return JSON.stringify(value, (_key, inner) => {
		if (typeof inner === "object" && inner !== null) {
			if (seen.has(inner)) {
				return "[Circular]";
			}
			seen.add(inner);
		}

		if (isErrorLike(inner)) {
			return serializeError(inner);
		}

		return inner;
	});
};

/**
 * Format any log field value into a displayable string.
 *
 * @param {unknown} value Value to format.
 * @returns {string} Formatted string output.
 */
const formatValue = (value: unknown): string => {
	if (typeof value === "string") {
		return value;
	}
	if (typeof value === "object" && value !== null) {
		try {
			return safeStringify(value);
		} catch {
			return "[Unserializable]";
		}
	}
	return String(value);
};

/**
 * Object structure emitted by Pino loggers.
 */
export type PinoLikeOutput = Pick<ITransportOptions, "appName"> & {
	level: number;
	pid: number;
	hostname: string;
	time: number;
	msg?: string;
	err?: unknown;
	[k: string]: unknown;
};

/**
 * Options for pretty printing Pino log output.
 */
export type PrettyFormatPinoOptions = {
	levels: Record<number, string>;
	colors: Record<string, string>;
	defaultColor: string;
};

/**
 * Pretty-formats a Pino log line object into a colorized, human-readable terminal string.
 *
 * @param {PinoLikeOutput} pinoLikeOutput The raw Pino log object.
 * @param {PrettyFormatPinoOptions} options Color and level formatting configurations.
 * @returns {string} Colorized pretty-formatted log line.
 */
export const prettyFormatPino = (
	pinoLikeOutput: PinoLikeOutput,
	options: PrettyFormatPinoOptions
): string => {
	const { levels, colors, defaultColor } = options;
	const { appName, level, msg, err, time, ...meta } = pinoLikeOutput;

	const logLevel = levels[level] ?? "info";
	const colorValue = colors[logLevel] ?? defaultColor;
	const padded = ` ${String(logLevel).toUpperCase()} `;
	const badge = chalk.bgHex(colorValue).whiteBright(padded);

	const segments: string[] = [badge];
	const details: string[] = [];
	if (time) {
		details.push(chalk.dim(new Date(time).toISOString()));
	}
	if (appName) {
		details.push(chalk.dim(`[${appName}]`));
	}
	const context = details.length ? ` ${details.join(" ")}` : "";
	segments.push(`${context}`);

	const colorize = chalk.hex(colorValue);
	if (msg !== undefined) {
		segments.push(` ${colorize(msg)}`);
	}

	if (meta !== undefined) {
		segments.push(` ${formatValue(meta)}`);
	}
	if (err !== undefined) {
		segments.push(`\n${formatValue(serializeError(err))}`);
	}

	return segments.join("");
};
