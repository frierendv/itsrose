import {
	SharedImageSchema,
	SharedSyncTimeoutSchema,
} from "@itsrose/shared-schema";
import { z } from "zod/v4";

export const SharedRequestSchema = z
	.object({
		init_image: SharedImageSchema,
		sync_timeout: SharedSyncTimeoutSchema,
	})
	.meta({
		id: "MTXxRequest",
	});

export interface ISharedRequest extends z.infer<typeof SharedRequestSchema> {}
