"use client";

import {
	createContext as reactCreateContext,
	useContext as useReactContext,
} from "react";

// eslint-disable-next-line @typescript-eslint/naming-convention
export interface CreateContextOptions<T> {
	/**
	 * If `true`, React will throw an error if the context is `null` or `undefined`.
	 * Set to `false` if context is optional or can be used outside a provider.
	 *
	 * @default true
	 */
	strict?: boolean;
	/**
	 * Custom error message to throw if the context is `undefined`.
	 */
	errorMessage?: string;
	/**
	 * The display name of the context for debugging and error reporting.
	 */
	name?: string;
	/**
	 * Default value for the context when no provider is present.
	 */
	defaultValue?: T;
}

export type CreateContextReturn<T> = readonly [
	Provider: React.Provider<T>,
	useHook: () => T,
	context: React.Context<T>,
];

/**
 * Creates a strongly typed context, provider, and consumer hook.
 *
 * @example
 * ```tsx
 * interface UserContextValue {
 *   username: string;
 * }
 *
 * const [UserProvider, useUser] = createContext<UserContextValue>({
 *   name: "User",
 *   errorMessage: "useUser must be used within a UserProvider",
 * });
 * ```
 *
 * @param options Configuration options for the context.
 * @returns A tuple of `[Provider, useContextHook, Context]`.
 */
export function createContext<ContextType>(
	options: CreateContextOptions<ContextType> & { strict: false }
): CreateContextReturn<ContextType | undefined>;
export function createContext<ContextType>(
	options?: CreateContextOptions<ContextType>
): CreateContextReturn<ContextType>;
export function createContext<ContextType>(
	options: CreateContextOptions<ContextType> = {}
): CreateContextReturn<any> {
	const { strict = true, errorMessage, name, defaultValue } = options;

	const Context = reactCreateContext<ContextType | undefined>(defaultValue);

	if (name) {
		Context.displayName = name;
	}

	function useContext() {
		const context = useReactContext(Context);

		if (!context && strict) {
			const defaultMessage = name
				? `use${name}Context must be used within a ${name}Provider`
				: "useContext: `context` is undefined. Seems you forgot to wrap component within the Provider";

			const error = new Error(errorMessage || defaultMessage);

			error.name = "ContextError";
			Error.captureStackTrace?.(error, useContext);
			throw error;
		}

		return context;
	}

	return [
		Context.Provider,
		useContext,
		Context,
	] as unknown as CreateContextReturn<ContextType>;
}
