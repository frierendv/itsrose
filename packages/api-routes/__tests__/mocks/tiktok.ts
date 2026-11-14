/**
 * The TikTok client, replaced by a stub.
 */
import {
	TiktokRequestSchema,
	TiktokResponseSchema,
} from "../../../features/tiktok/src/zod-schema";

export const getContent = async () => ({ data: [] });
export const getContentSchema = {
	request: TiktokRequestSchema,
	response: TiktokResponseSchema,
};
