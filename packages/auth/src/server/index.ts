import getBetterAuthPlugins from "./plugins";
import createBetterAuthServer from "./server";

export { getAuthOptions } from "./options";
export { createBetterAuthServer, getBetterAuthPlugins };

export type AuthServer = ReturnType<typeof createBetterAuthServer>;

// reused
export { defaultKeyHasher } from "@better-auth/api-key";
export * from "./creem";
export * from "./database";
