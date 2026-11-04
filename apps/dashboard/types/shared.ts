export type { DeepPartial } from "@itsrose/types";

/** Make all `T` object required (recursively) */
export type DeepRequired<T extends object> = {
	[P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};
