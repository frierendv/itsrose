import { itsRosePluginClient } from "@itsrose/auth-billing/plugin-client";
import getBetterAuthClientPlugins from "./plugins";
import createBetterAuthClient from "./react";

export { getBetterAuthClientPlugins, createBetterAuthClient };
export { itsRosePluginClient };

export type BetterAuthClient = ReturnType<typeof createBetterAuthClient>;
