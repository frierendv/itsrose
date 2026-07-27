import { InvalidRequestError } from "@itsrose/system";
import { client } from "../client";
import {
	createDescription,
	HAIR_TYPE_LIST,
} from "../resources/versatile-hairstyle";
import { createMediaProfile, createSDKParameter, parseResult } from "../utils";
import {
	SharedResponseSchema,
	VersatileHairstyleRequestSchema,
	type IVersatileHairstyleRequest,
} from "../zod-schema";

/**
 * Applies hairstyle transformations to an input portrait image.
 *
 * @param {IVersatileHairstyleRequest} opts Options containing the input image and desired target hair type.
 * @returns {Promise<ISharedResponse>} Parsed transformation result containing output image URLs.
 * @throws {InvalidRequestError} If the specified hair_type is invalid.
 */
export const versatileHairstyle = async (opts: IVersatileHairstyleRequest) => {
	const { init_image, hair_type } = opts;

	if (!HAIR_TYPE_LIST.includes(hair_type)) {
		throw new InvalidRequestError(
			"Invalid hair_type value. Please refer to the documentation for valid options."
		);
	}

	const parameter = createSDKParameter({
		task: "/v1/hairtransfer",
		task_type: "mtlab",
		params: {
			parameter: {
				hair_type,
			},
		},
		init_images: [createMediaProfile(init_image)],
	});

	const { data } = await client.createTask(parameter);
	return parseResult(data);
};

/** @internal */
export const versatileHairstyleSchema = {
	request: VersatileHairstyleRequestSchema,
	response: SharedResponseSchema,
};
/** @internal */
export { createDescription as versatileHairstyleCreateDescription };
