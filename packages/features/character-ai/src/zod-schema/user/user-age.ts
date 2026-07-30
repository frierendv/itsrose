import { z } from "zod/v4";

export const UserAgeSchema = z.object({
	age_category: z.string().describe("User age category"),
	verification_status: z.string().describe("User verification status"),
});

export type UserAge = z.infer<typeof UserAgeSchema>;
