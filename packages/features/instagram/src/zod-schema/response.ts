import { z } from "zod/v4";
import { MediaNodeSchema } from "./media";

export const InstagramResponseSchema = z.object({
	media_list: z.array(MediaNodeSchema).describe("List of media items."),
});

export type IInstagramResponse = z.infer<typeof InstagramResponseSchema>;
