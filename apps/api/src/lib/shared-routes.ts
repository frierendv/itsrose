import type { SharedRoutesOptions } from "@itsrose/api-routes";
import { versatileHairstyleCreateDescription } from "@itsrose/mtxx";
import type { FastifyInstance } from "fastify";

/**
 * The options the public API mounts the shared route surface with.
 *
 * The public API documents its routes with examples, publishes the audio
 * format header, and hands out URLs for the generated audio instead of the
 * base64 payload.
 *
 * @param fastify - The Fastify instance the routes are registered on.
 * @returns The options of the shared routes.
 */
export const createSharedRoutesOptions = (
	fastify: FastifyInstance
): SharedRoutesOptions => ({
	uploadAudioToStorage: true,
	audioStorage: {
		uploadBase64Audio: async (request, base64Audio) =>
			fastify.s3.uploadUserFile(request, base64Audio, {
				preprocess: (data) => Buffer.from(data, "base64"),
			}),
	},
	declareAudioResponseHeader: true,
	descriptions: {
		textToDialogue: `Convert text to dialogue.

Example Output:

- [English](https://assets.itsrose.net/public-resource/text_to_dialogue-output.wav) Three people talking
- [Indonesian](https://assets.itsrose.net/public-resource/text_to_dialogue-output-ID.wav) Two people talking
`,
		clothesSegmentation: `
Generate a mask for the clothes in the image.

<details>
		<summary>Example</summary>

| Original Image | Segmentation Mask | Segmentation Labels |
|----------------|--------------------|--------------------|
| ![Original Image](https://assets.itsrose.net/public-resource/girl-in-red-dress.jpg "Original Image") | ![Segmentation Mask](https://assets.itsrose.net/public-resource/girl-in-red-dress_segmentation_mask.jpg "Segmentation Mask") | ![Label dress](https://assets.itsrose.net/public-resource/girl-in-red-dress_clothes_segmentation_label_dress.jpg "Label dress") |
| **Original** | **Segmentation Mask** | **Label dress** |

</details>
`,
		expressionGeneration: `
This interface is used to process requests generated for smile expressions in the cloud.

<details>
		<summary>Example</summary>

| Original Image | Result Image |
|----------------|--------------------|
| ![Original Image](https://assets.itsrose.net/public-resource/girl-in-red-dress.jpg "Original Image") | ![Expression generation 0](https://assets.itsrose.net/public-resource/girl-in-red-dress_expression_generation_0.jpg "Smile mode 0") |
| **Original** | **Smile Mode 0** |

</details>
`,
		outpainting: `
Extends an image beyond its original canvas using AI outpainting.

<details>
		<summary>Example</summary>

| Original Image | Result Image |
|----------------|--------------------|
| ![Original Image](https://assets.itsrose.net/public-resource/girl-in-red-dress.jpg "Original Image") | ![Result Image](https://assets.itsrose.net/public-resource/girl-in-red-dress_outpainting_0_1.jpg "Expand 120% of original") |
| **Original** | **120% of original** |

</details>
`,
		versatileHairstyle: `
Versatile Hairstyle is a hairstyle that can be adapted to different occasions and styles.

<details>
		<summary>Example</summary>

| Original Image | Result Image |
|----------------|--------------------|
| ![Original Image](https://assets.itsrose.net/public-resource/girl-in-red-dress.jpg) | ![Versatile Hairstyle](https://assets.itsrose.net/public-resource/girl-in-red-dress_hair_type_0.jpg) |
| **Original** | **Hair type 0** |

</details>

<details>
	<summary>Hair types</summary>
${versatileHairstyleCreateDescription()}
</details>`,
	},
	consumes: {
		createIvcVoice: ["multipart/form-data"],
	},
});
