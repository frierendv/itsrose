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
		task_id: generateUUID(),
		sync_timeout: 60,
		...initialParameter,
		params,
	} satisfies ISDKParameter;
};
