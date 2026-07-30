import { z } from "zod/v4";

export const UserPhoneSettingSchema = z.object({
	phone_number: z.string(),
	verified_at: z.string(),
});

export type UserPhone = z.infer<typeof UserPhoneSettingSchema>;
