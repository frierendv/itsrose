/**
 * Client-safe provider-resource surface.
 *
 * The Postgres adapter and the application service live behind
 * `@itsrose/auth-resources/registry` and `@itsrose/auth-resources/voices`, so
 * importing this entry never pulls a database driver or an upstream SDK into
 * a bundle.
 */
export type * from "./types";
