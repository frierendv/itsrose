/**
 * Stub for the ESM-only multipart parser the ElevenLabs client imports.
 *
 * The route table test never reaches the upstream, so the parser is never
 * called - but the module has to load.
 */
export const parseMultipart = (): never => {
	throw new Error("parseMultipart is not available in tests");
};
