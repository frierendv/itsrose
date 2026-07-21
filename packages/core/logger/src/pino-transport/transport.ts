import { pipeline, Transform } from "node:stream";
import build from "pino-abstract-transport";
import type { ITransportOptions } from "../types";
import { colors, defaultColor } from "./colors";
import { prettyFormatPino } from "./format";

/**
 * Create a pino transport (destination).
 *
 * @param {ITransportOptions} options
 * @returns {Transform}
 */
export function pinoTransport(options: ITransportOptions): Transform {
	// inverted levels {[string]: number} -> {[number]: string}
	const invertedLevels = Object.fromEntries(
		Object.entries(options.customLevels).map((entry) => entry.reverse())
	);
	const mergedColors = Object.assign(colors, options.customColors);
	return build(
		(source) => {
			const transport = new Transform({
				autoDestroy: true,

				objectMode: true,
				transform(chunk, enc, cb) {
					chunk.appName = options.appName;
					const formated = prettyFormatPino(chunk, {
						levels: invertedLevels,
						colors: mergedColors,
						defaultColor,
					});
					process.stdout.write(`${formated}\n`);
					this.push(`${JSON.stringify(chunk)}\n`);
					cb();
				},
			});
			pipeline(source, transport, () => {});
			return transport;
		},
		{
			enablePipelining: true,
		}
	);
}
