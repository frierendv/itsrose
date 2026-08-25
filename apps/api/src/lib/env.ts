import { SHARED_ENV_KEYS, type SharedEnv } from "@itsrose/auth";

export const ENVS = ["PORT", ...SHARED_ENV_KEYS] as const;

export type ApiEnv = SharedEnv<typeof ENVS>;
