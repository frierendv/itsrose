import { z } from "zod/v4";

export const UserAccountSchema = z.object({
	name: z.string(),
	avatar_type: z.string(),
	onboarding_complete: z.boolean(),
	avatar_file_name: z.string(),
	mobile_onboarding_complete: z.number(),
});

export type UserAccount = z.infer<typeof UserAccountSchema>;
