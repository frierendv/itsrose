/**
 * @packageDocumentation
 * Global, purely type-only TypeScript utility types for the ItsRose monorepo.
 */

/**
 * Forces TypeScript to evaluate and flatten complex mapped or intersected types.
 * Dramatically improves hover tooltips in VSCode.
 */
export type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

/**
 * Makes all properties (and nested properties) of an object optional.
 */
export type DeepPartial<T> = T extends (...args: any[]) => any
	? T
	: T extends Array<infer U>
		? DeepPartialArray<U>
		: T extends object
			? DeepPartialObject<T>
			: T | undefined;

interface DeepPartialArray<T> extends Array<DeepPartial<T>> {}

type DeepPartialObject<T> = { [P in keyof T]?: DeepPartial<T[P]> };

/**
 * Extracts the values of an object type.
 */
export type ValueOf<T> = T[keyof T];

/**
 * Allows null or undefined for a specific type.
 */
export type Nullable<T> = T | null | undefined;

/**
 * Nominal typing helper (Branded types) to prevent mixing identical primitives
 * (e.g., UserId vs PostId).
 */
declare const brand: unique symbol;

export type Brand<T, B> = T & { readonly [brand]: B };
