/**
 * Custom log levels
 */
export type CustomLevels =
	"trace" | "debug" | "info" | "warn" | "error" | "fatal";
/** Mapped custom log levels */
export type CustomLevelsMap<Levels extends string = CustomLevels> = {
	[level in Levels]: number;
};
/** Mapped pino custom log levels */
export type PinoCustomLevelsMap<Levels extends string = CustomLevels> = Record<
	number,
	Levels
>;
export interface ITransportOptions {
	/**
	 * App name display to in log.
	 *
	 * @type {?string}
	 */
	appName?: string;
	customLevels: Record<string, number>;
	customColors?: Record<string, string>;
}
