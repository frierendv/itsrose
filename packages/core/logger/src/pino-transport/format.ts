import chalk from "chalk";
import type { ITransportOptions } from "../types";
import { isErrorLike, serializeError } from "./errors";

/**
 * Description placeholder
 *
 * @param {unknown} value
 * @returns {string}
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
 * Description placeholder
 *
 * @param {unknown} value
 * @returns {string}
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
 * Description placeholder
 *
 * @typedef {PinoLikeOutput}
 */
export type PinoLikeOutput = {
	level: number;
	pid: number;
	hostname: string;
	time: number;
	msg?: string;
	err?: unknown;
	[k: string]: unknown;
};

/**
 * Description placeholder
 *
 * @typedef {PrettyFormatPinoOptions}
 */
export type PrettyFormatPinoOptions = {
	levels: Record<number, string>;
	colors: Record<string, string>;
	defaultColor: string;
};

/**
 * Description placeholder
 *
 * @param {(PinoLikeOutput & ITransportOptions)} pinoLikeOutput
 * @param {PrettyFormatPinoOptions} options
 * @returns {string}
 */
export const prettyFormatPino = (
	pinoLikeOutput: PinoLikeOutput & ITransportOptions,
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
