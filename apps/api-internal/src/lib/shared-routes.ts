import type { SharedRoutesOptions } from "@itsrose/api-routes";

/**
 * The options the internal API mounts the shared route surface with.
 *
 * The internal API returns the audio inline, does not publish the audio
 * format header, and documents its routes with a one-liner.
 */
export const sharedRoutesOptions: SharedRoutesOptions = {
	uploadAudioToStorage: false,
	declareAudioResponseHeader: false,
};
