import { ElevenLabsSharedResponseAudioSchema } from "@itsrose/elevenlabs";

/**
 * The route schema of a route that may declare the audio format header.
 */
export type AudioHeaderSchema = {
	headers: typeof ElevenLabsSharedResponseAudioSchema;
};

/**
 * Keeps - or removes - the `response-audio-format` header schema of a route.
 *
 * The header is only declared when the mounting app opts in. Fastify warns
 * (`FSTWRN001`) when a `headers` schema key exists with an `undefined` value,
 * so the key has to be absent rather than undefined. The type keeps the
 * header readable either way: the route reads the header, it does not have to
 * declare it.
 *
 * @param schema - The route schema, including the header schema.
 * @param declare - Whether the header is declared on the route.
 * @returns The route schema, with the header key present only when declared.
 */
export const withAudioResponseHeader = <T extends AudioHeaderSchema>(
	schema: T,
	declare: boolean
): T => {
	if (declare) {
		return schema;
	}

	Reflect.deleteProperty(schema, "headers");
	return schema;
};
