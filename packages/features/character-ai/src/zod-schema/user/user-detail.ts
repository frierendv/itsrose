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
	/**
	 * The subscription of the account.
	 *
	 * Character.ai sends `null` here for an account without a subscription.
	 * The shape of a populated subscription is not described anywhere in this
	 * repository, so the field stays `unknown`: a consumer has to narrow it
	 * instead of being handed an unchecked value.
	 */
	subscription: z.unknown(),
	/**
	 * The entitlements granted to the account.
	 *
	 * The upstream sends an empty list for an account without entitlements and
	 * the shape of an entry is not described anywhere in this repository, so
	 * the entries stay `unknown` rather than being given an invented shape.
	 */
	entitlements: z.array(z.unknown()),
	ppid: z.string(),
	phone_settings: UserPhoneSettingSchema,
	age_data: UserAgeSchema,
});
export const UserDetailSchema = z.object({
	user: UserSchema,
	/**
	 * The attributes the upstream derived for the account.
	 *
	 * The upstream sends the object, or nothing at all for an account it has
	 * not derived anything for.
	 */
	derived_attributes: z
		.object({
			eligible_for: z.array(z.unknown()).nullish(),
		})
		.nullish(),
	is_human: z.boolean(),
	name: z.string(),
	email: z.string(),
	date_joined: z.string(),
	date_of_birth: z.string(),
	needs_to_acknowledge_policy: z.boolean(),
	accepted_policy_acknowledgements: z.array(z.string()),
	/**
	 * When the suspension of the account ends.
	 *
	 * A timestamp like the other dates of this payload, and absent while the
	 * account is not suspended.
	 */
	suspended_until: z.string().nullish(),
	/**
	 * The characters hidden from the account.
	 *
	 * The upstream sends an empty list when nothing is hidden and the shape of
	 * an entry is not described anywhere in this repository, so the entries
	 * stay `unknown`.
	 */
	hidden_characters: z.array(z.unknown()),
	/**
	 * The users blocked by the account.
	 *
	 * The upstream sends an empty list when nothing is blocked and the shape
	 * of an entry is not described anywhere in this repository, so the entries
	 * stay `unknown`.
	 */
	blocked_users: z.array(z.unknown()),
	bio: z.string().nullish(),
	/**
	 * The interests selected on the account.
	 *
	 * The upstream sends the object, or nothing at all when no interest was
	 * ever selected.
	 */
	interests: z
		.object({
			selected: z.array(z.string()).nullish(),
		})
		.nullish(),
});

export type UserDetail = z.infer<typeof UserDetailSchema>;
