import type { UserConfig } from "tsdown";

type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export declare const config: UserConfig;
export declare const reactConfig: UserConfig;
export declare const fastifyConfig: UserConfig;
export declare function mergeConfig<UserConfig>(
	base: UserConfig,
	overrides?: DeepPartial<UserConfig>
): UserConfig;
