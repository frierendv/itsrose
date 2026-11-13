import type { ISharedRequest } from "../zod-schema";
import { generateUUID } from "./uuid";

export type SDKMediaImage = {
	url: string;
	profile: {
		media_extra?: Record<string, unknown>;
		media_profiles: { media_data_type: string };
	};
};
export interface ISDKParameter {
	task: string;
	task_id?: string;
	task_type: string;
	params: object | string;
	init_images?: SDKMediaImage[];
	sync_timeout?: number;
}

export const createMediaProfile = (
	init_image: ISharedRequest["init_image"]
): SDKMediaImage => {
	return {
		profile: {
			media_extra: {},
			media_profiles: {
				media_data_type: init_image.type,
			},
		},
		url: init_image.value,
	};
};

export const createSDKParameter = (
	initialParameter: ISDKParameter
): ISDKParameter => {
	const params =
		typeof initialParameter.params === "string"
			? initialParameter.params
			: JSON.stringify(initialParameter.params);

	return {
		...initialParameter,
		task_id: generateUUID(),
		// The default must come after the spread: every operation forwards a
		// `sync_timeout` key, so an explicit `undefined` in the caller's
		// options would otherwise overwrite the default and drop the field
		// entirely.
		sync_timeout: initialParameter.sync_timeout ?? 60,
		params,
	} satisfies ISDKParameter;
};
