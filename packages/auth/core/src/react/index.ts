import getBetterAuthClientPlugins from "./plugins";
import createBetterAuthClient from "./react";

export { getBetterAuthClientPlugins, createBetterAuthClient };
export { itsRosePluginClient } from "../itsrose/plugin-client";

export type BetterAuthClient = ReturnType<typeof createBetterAuthClient>;
