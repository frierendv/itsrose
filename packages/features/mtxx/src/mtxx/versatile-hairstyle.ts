import { InvalidRequestError } from "@itsrose/system";
import { client } from "../client";
import { HAIR_ENTRIES, HAIR_TYPE_LIST } from "../constants/versatile-hairstyle";
import { createMediaProfile, createSDKParameter, parseResult } from "../utils";
import {
	SharedResponseSchema,
	VersatileHairstyleRequestSchema,
	type ISharedResponse,
	type IVersatileHairstyleRequest,
} from "../zod-schema";

/**
 * Applies hairstyle transformation or hair transfer to an input portrait image.
 *
 * @param opts Options containing the input image and target hair type key.
 * @returns {Promise<ISharedResponse>} A promise resolving to the transformation result containing output image URLs.
 * @throws {InvalidRequestError} If the specified `hair_type` is invalid or unsupported.
 */
export const versatileHairstyle = async (
	opts: IVersatileHairstyleRequest
): Promise<ISharedResponse> => {
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

/**
 * Generates an HTML table representation of the hairstyles, grouped by chunks.
 * @internal
 */
export function createDescription(): string {
	const size = 5;
	const chunks = Array.from(
		{ length: Math.ceil(HAIR_ENTRIES.length / size) },
		(_, i) => HAIR_ENTRIES.slice(i * size, (i + 1) * size)
	);

	let tableHTML =
		'<table style="border-collapse:collapse;width:100%;table-layout:fixed;">\n';
	for (const chunk of chunks) {
		tableHTML += "  <tr>\n";
		for (const [hairType] of chunk) {
			tableHTML += `    <th style="text-align:center;padding:4px 2px;font-size:max(12px, 1vw);word-break:break-word;"><code>${hairType}</code></th>\n`;
		}
		tableHTML += "  </tr>\n";
		tableHTML += "  <tr>\n";

		for (const [hairType, url] of chunk) {
			tableHTML += `    <td style="text-align:center;padding:4px;">
      <img src="${url}" style="width:100%;max-width:120px;height:auto;display:block;margin:0 auto;" alt="hair_type ${hairType}" />
    </td>\n`;
		}
		tableHTML += "  </tr>\n";
	}
	tableHTML += "</table>";
	return tableHTML;
}
