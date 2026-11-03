/**
 * Client-safe storage surface.
 *
 * The Better Auth server plugin lives in `@itsrose/auth-storage/plugin` so
 * importing this entry never pulls `better-auth/api` into a browser bundle.
 */
export * from "./client";
export * from "./config";
export * from "./keys";
export * from "./operations";
export type * from "./types";
