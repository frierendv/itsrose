import { z } from "zod/v4";

export const InstagramRequestSchema = z.object({
	url: z.url().describe("Instagram post/reel url."),
});
export type IInstagramRequest = z.infer<typeof InstagramRequestSchema>;
