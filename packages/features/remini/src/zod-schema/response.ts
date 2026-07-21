import { z } from "zod/v4";

export const ReminiResponseSchema = z.object({
	media_list: z.array(z.url()).describe("The media access url."),
});

export type IReminiResponse = z.infer<typeof ReminiResponseSchema>;
