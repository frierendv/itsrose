import { z } from "zod/v4";
import { UserAccountSchema } from "./user-account";
import { UserAgeSchema } from "./user-age";
import { UserPhoneSettingSchema } from "./user-phone-setting";

export const UserSchema = z.object({
	username: z.string(),
	id: z.number(),
	first_name: z.string(),
	account: UserAccountSchema,
	is_staff: z.boolean(),
	subscription: z.null().or(z.any()),
	entitlements: z.array(z.any()),
	ppid: z.string(),
	phone_settings: UserPhoneSettingSchema,
	age_data: UserAgeSchema,
});
export const UserDetailSchema = z.object({
	user: UserSchema,
	derived_attributes: z
		.object({
			eligible_for: z.array(z.any()),
		})
		.or(z.any()),
	is_human: z.boolean(),
	name: z.string(),
	email: z.string(),
	date_joined: z.string(),
	date_of_birth: z.string(),
	needs_to_acknowledge_policy: z.boolean(),
	accepted_policy_acknowledgements: z.array(z.string()),
	suspended_until: z.any().nullish(),
	hidden_characters: z.array(z.any()),
	blocked_users: z.array(z.any()),
	bio: z.string().nullish(),
	interests: z
		.object({
			selected: z.array(z.string()),
		})
		.or(z.any()),
});

export type UserDetail = z.infer<typeof UserDetailSchema>;
