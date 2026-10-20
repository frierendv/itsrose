import type { DBAdapter, GenericEndpointContext } from "better-auth";

export type DatabaseAdapter =
	GenericEndpointContext["context"]["adapter"] | DBAdapter<any>;
