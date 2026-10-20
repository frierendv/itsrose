import getBetterAuthPlugins from "./plugins";
import createBetterAuthServer from "./server";

export { getAuthOptions } from "./options";
export { createBetterAuthServer, getBetterAuthPlugins };

export type AuthServer = ReturnType<typeof createBetterAuthServer>;

// reused
export { defaultKeyHasher } from "@better-auth/api-key";
export { itsRosePlugin } from "../itsrose/plugin-server";
export * from "./database";
