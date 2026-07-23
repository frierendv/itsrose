import { ElevenLabsTextToSpeechConvertSchema } from "../src/zod-schema/request/text-to-speech";

describe("features/elevenlabs", () => {
	describe("ElevenLabsTextToSpeechConvertSchema", () => {
		it("validates a valid text-to-speech request payload", () => {
			const payload = {
				text: "Hello world",
				voice_id: "JBFv24vM44z56z111111",
			};
			const parsed =
				ElevenLabsTextToSpeechConvertSchema.safeParse(payload);
			expect(parsed.success).toBe(true);
			if (parsed.success) {
				expect(parsed.data.text).toBe("Hello world");
			}
		});

		it("fails validation when required fields are missing", () => {
			const payload = {};
			const parsed =
				ElevenLabsTextToSpeechConvertSchema.safeParse(payload);
			expect(parsed.success).toBe(false);
		});
	});
});
