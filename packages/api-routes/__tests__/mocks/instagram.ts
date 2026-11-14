/**
 * The Instagram client, replaced by a stub.
 */
import {
	InstagramRequestSchema,
	InstagramResponseSchema,
} from "../../../features/instagram/src/zod-schema";

export const getMedia = async () => ({ media: [] });
export const getMediaSchema = {
	request: InstagramRequestSchema,
	response: InstagramResponseSchema,
};
