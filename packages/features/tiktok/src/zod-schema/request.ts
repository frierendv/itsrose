import { z } from "zod/v4";

export const TiktokRequestSchema = z.object({
	url: z
		.url()
		.describe("TikTok url. Can be copied from share option on the App."),
});

export type ITiktokRequest = z.infer<typeof TiktokRequestSchema>;
