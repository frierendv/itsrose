/**
 * The Instagram client, replaced by a stub.
 */
import {
	InstagramRequestSchema,
	InstagramResponseSchema,
} from "../../../features/instagram/src/zod-schema";

export const getMedia = async () => ({ media_list: [] });
export const getMediaSchema = {
	request: InstagramRequestSchema,
	response: InstagramResponseSchema,
};
