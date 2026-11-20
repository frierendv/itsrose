/**
 * Client-safe studio surface.
 *
 * The Postgres adapter and the application service live behind
 * `@itsrose/auth-studio/registry` and `@itsrose/auth-studio/voices`, so
 * importing this entry never pulls a database driver or an upstream SDK into
 * a bundle.
 */
export type * from "./types";
