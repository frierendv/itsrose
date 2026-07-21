import { z } from "zod/v4";

/**
 * @see https://elevenlabs.io/docs/api-reference/text-to-speech/convert#request.query.output_format
 */
export const ElevenLabsOutputFormatSchema = z
	.enum([
		"alaw_8000",
		"mp3_22050_32",
		"mp3_24000_48",
		"mp3_44100_128",
		"mp3_44100_192",
		"mp3_44100_32",
		"mp3_44100_64",
		"mp3_44100_96",
		"opus_48000_128",
		"opus_48000_192",
		"opus_48000_32",
		"opus_48000_64",
		"opus_48000_96",
		"pcm_16000",
		"pcm_22050",
		"pcm_24000",
		"pcm_32000",
		"pcm_44100",
		"pcm_48000",
		"pcm_8000",
		"ulaw_8000",
		"wav_16000",
		"wav_22050",
		"wav_24000",
		"wav_32000",
		"wav_44100",
		"wav_48000",
		"wav_8000",
	])
	.meta({
		description: "The output format of the generated audio.",
		id: "ElevenLabsOutputFormat",
	});

export type TElevenLabsOutputFormat = z.infer<
	typeof ElevenLabsOutputFormatSchema
>;
