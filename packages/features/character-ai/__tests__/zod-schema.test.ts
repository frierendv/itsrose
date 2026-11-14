import { parseCharacterInfo } from "../src/utils/parse-character";
import {
	CharacterInfoSchema,
	ChatSendMessageResponseSchema,
	UserDetailSchema,
} from "../src/zod-schema";

/**
 * A character body as the upstream sends it, with every field the schema
 * requires.
 */
const CHARACTER_BODY = {
	external_id: "char-1",
	title: "Test Character",
	description: "A test character",
	greeting: "Hello!",
	primary_language: "OTHER",
	is_licensed_professional: false,
	creator: {},
	metadata: {},
};

describe("CharacterInfoSchema", () => {
	it("accepts the creator id as the number the upstream sends", () => {
		const parsed = CharacterInfoSchema.safeParse({
			...CHARACTER_BODY,
			creator: { user_id: 12345 },
		});

		expect(parsed.success).toBe(true);
		if (!parsed.success) {
			return;
		}

		expect(parsed.data.creator.user_id).toBe(12345);
	});

	it("accepts the creator id as a string", () => {
		const parsed = CharacterInfoSchema.safeParse({
			...CHARACTER_BODY,
			creator: { user_id: "user-456" },
		});

		expect(parsed.success).toBe(true);
	});

	it("rejects a creator id that is neither a string nor a number", () => {
		const parsed = CharacterInfoSchema.safeParse({
			...CHARACTER_BODY,
			creator: { user_id: { id: 12345 } },
		});

		expect(parsed.success).toBe(false);
	});

	it("keeps a creator id the upstream did not send", () => {
		const parsed = CharacterInfoSchema.safeParse(CHARACTER_BODY);

		expect(parsed.success).toBe(true);
		if (!parsed.success) {
			return;
		}

		expect(parsed.data.creator.user_id).toBeUndefined();
	});
});

describe("parseCharacterInfo", () => {
	it("keeps the creator id of the upstream body", () => {
		const result = parseCharacterInfo({
			...CHARACTER_BODY,
			user_id: 12345,
		});

		expect(result.creator.user_id).toBe(12345);
	});

	it("drops a creator id that is not an id instead of passing it on", () => {
		const result = parseCharacterInfo({
			...CHARACTER_BODY,
			user_id: { id: 12345 },
		});

		expect(result.creator.user_id).toBeUndefined();
	});
});

describe("UserDetailSchema", () => {
	const USER_DETAIL = {
		user: {
			username: "cai_user",
			id: 999,
			first_name: "Cai",
			account: {
				name: "CAI Account Name",
				avatar_type: "DEFAULT",
				onboarding_complete: true,
				avatar_file_name: "avatar.png",
				mobile_onboarding_complete: 1,
			},
			is_staff: false,
			subscription: null,
			entitlements: [],
			ppid: "ppid-1",
			phone_settings: {
				phone_number: "+6281234567890",
				verified_at: "2026-01-01 00:00:00",
			},
			age_data: {
				age_category: "ADULT",
				verification_status: "VERIFIED",
			},
		},
		derived_attributes: {
			eligible_for: [],
		},
		is_human: true,
		name: "Cai User",
		email: "cai@example.org",
		date_joined: "2026-01-01 00:00:00",
		date_of_birth: "2005-01-01 00:00:00",
		needs_to_acknowledge_policy: false,
		accepted_policy_acknowledgements: [],
		suspended_until: null,
		hidden_characters: [],
		blocked_users: [],
		bio: null,
		interests: {
			selected: [],
		},
	};

	it("parses the payload the upstream sends", () => {
		const parsed = UserDetailSchema.safeParse(USER_DETAIL);

		expect(parsed.success).toBe(true);
		if (!parsed.success) {
			return;
		}

		expect(parsed.data.user.subscription).toBeNull();
		expect(parsed.data.user.entitlements).toEqual([]);
		expect(parsed.data.derived_attributes?.eligible_for).toEqual([]);
		expect(parsed.data.interests?.selected).toEqual([]);
		expect(parsed.data.suspended_until).toBeNull();
	});

	it("tolerates the derived attributes and the interests being absent", () => {
		const { derived_attributes, interests, ...rest } = USER_DETAIL;
		void derived_attributes;
		void interests;

		const parsed = UserDetailSchema.safeParse(rest);

		expect(parsed.success).toBe(true);
	});

	it("keeps a subscription it cannot describe instead of validating it away", () => {
		const parsed = UserDetailSchema.safeParse({
			...USER_DETAIL,
			user: { ...USER_DETAIL.user, subscription: { plan: "pro" } },
		});

		expect(parsed.success).toBe(true);
		if (!parsed.success) {
			return;
		}

		expect(parsed.data.user.subscription).toEqual({ plan: "pro" });
	});

	it("rejects a suspension date that is not a date", () => {
		const parsed = UserDetailSchema.safeParse({
			...USER_DETAIL,
			suspended_until: 1767225600,
		});

		expect(parsed.success).toBe(false);
	});

	it("keeps the entries of a list it cannot describe", () => {
		const parsed = UserDetailSchema.safeParse({
			...USER_DETAIL,
			user: { ...USER_DETAIL.user, entitlements: [{ key: "beta" }] },
		});

		expect(parsed.success).toBe(true);
		if (!parsed.success) {
			return;
		}

		expect(parsed.data.user.entitlements).toEqual([{ key: "beta" }]);
	});
});

describe("ChatSendMessageResponseSchema", () => {
	const RESPONSE = {
		chat_id: "chat-1",
		candidates: [
			{
				create_time: "2026-01-01 00:00:00",
				raw_content: "Hello!",
				is_final: true,
			},
		],
		generation_mode: { swipe: { max_swipes: 4 } },
		context_stats: { total_tokens: 128 },
	};

	it("parses the generation mode and the context stats of the upstream", () => {
		const parsed = ChatSendMessageResponseSchema.safeParse(RESPONSE);

		expect(parsed.success).toBe(true);
		if (!parsed.success) {
			return;
		}

		expect(parsed.data.generation_mode).toEqual({
			swipe: { max_swipes: 4 },
		});
		expect(parsed.data.context_stats).toEqual({ total_tokens: 128 });
	});

	it("rejects a generation mode that is not a map", () => {
		const parsed = ChatSendMessageResponseSchema.safeParse({
			...RESPONSE,
			generation_mode: ["swipe"],
		});

		expect(parsed.success).toBe(false);
	});
});
