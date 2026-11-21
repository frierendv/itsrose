import { z } from "zod/v4";

/* -------------------------------------------------------------------------- */
/*                              Voice payloads                                */
/* -------------------------------------------------------------------------- */

/**
 * One clone the dashboard user owns.
 *
 * `voice_id` is the upstream id the synthesis routes address; `resource_id` is
 * the application identity the delete route addresses.
 */
export const clonedVoiceSchema = z.object({
	voice_id: z.string(),
	name: z.string(),
	source: z.literal("cloned"),
	resource_id: z.string(),
	sample_asset_id: z.string().nullable(),
	created_at: z.string(),
});

export type ClonedVoice = z.infer<typeof clonedVoiceSchema>;

/**
 * One platform catalogue voice.
 *
 * A premade voice has no ledger row, so it carries neither an application id
 * nor a sample asset: only the upstream object exists. Its preview is the
 * catalogue's own `preview_url`, nullable because a catalogue voice may ship
 * without one; a clone's preview is its sample asset instead.
 */
export const premadeVoiceSchema = z.object({
	voice_id: z.string(),
	name: z.string(),
	source: z.literal("premade"),
	preview_url: z.string().nullable(),
});

export type PremadeVoice = z.infer<typeof premadeVoiceSchema>;

/** A library entry: an owned clone or a catalogue voice, discriminated by `source`. */
export const voiceSchema = z.discriminatedUnion("source", [
	clonedVoiceSchema,
	premadeVoiceSchema,
]);

export type Voice = z.infer<typeof voiceSchema>;

/** The `GET /studio/voices` payload. */
export const voiceListSchema = z.object({
	items: z.array(voiceSchema),
});

export type VoiceList = z.infer<typeof voiceListSchema>;

/* -------------------------------------------------------------------------- */
/*                              Request payloads                              */
/* -------------------------------------------------------------------------- */

/** The `POST /studio/voices` body: the sample asset, a name and an optional description. */
export const createVoiceInputSchema = z.object({
	asset_id: z.string().min(1),
	name: z.string().min(1).max(100),
	description: z.string().optional(),
});

export type CreateVoiceInput = z.infer<typeof createVoiceInputSchema>;

/**
 * The caller-supplied half of {@link CreateVoiceInput}, used when the sample
 * asset is produced by an upload rather than chosen from the library.
 */
export type CreateVoiceOptions = Omit<CreateVoiceInput, "asset_id">;

/* -------------------------------------------------------------------------- */
/*                          Wire payloads (snake_case)                        */
/* -------------------------------------------------------------------------- */

/** The `POST /studio/voices` acknowledgement. */
export const createVoiceResponseSchema = z.object({
	resource_id: z.string(),
	voice_id: z.string(),
	name: z.string(),
	sample_asset_id: z.string(),
});

export type CreateVoiceResponse = z.infer<typeof createVoiceResponseSchema>;

/** The `DELETE /voices/:voice_id` acknowledgement. */
export const deleteVoiceSchema = z.object({
	deleted: z.boolean(),
});

export type DeleteVoice = z.infer<typeof deleteVoiceSchema>;
