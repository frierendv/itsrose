import { itsRosePlugin } from "@itsrose/auth-billing/plugin-server";
import { storagePlugin } from "@itsrose/auth-storage/plugin";
import getBetterAuthPlugins from "./plugins";
import createBetterAuthServer from "./server";

export { getAuthOptions } from "./options";
export { createBetterAuthServer, getBetterAuthPlugins };

export type AuthServer = ReturnType<typeof createBetterAuthServer>;

// reused
export { defaultKeyHasher } from "@better-auth/api-key";
export { itsRosePlugin };
export { EusendService, MailerService } from "@itsrose/auth-mailer";
export { eusendPlugin, mailerPlugin } from "@itsrose/auth-mailer/plugin";
export { storagePlugin };
export * from "./database";
