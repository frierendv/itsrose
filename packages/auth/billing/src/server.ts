/**
 * Server surface for `@itsrose/auth-billing`.
 *
 * Re-exports pure domain rules plus the Better Auth persistence adapters.
 * Import `./plugin-server` to register the plugin, and never import this file
 * from client components.
 */
export * from "./domain/constants";
export * from "./domain/proration";
export * from "./domain/plan.service";
export * from "./domain/subscription.service";
export * from "./domain/invoice.service";
export * from "./domain/webhook.service";
export * from "./domain/cron.service";
export * from "./domain/permissions";
export * from "./adapter";
export type * from "./types";
