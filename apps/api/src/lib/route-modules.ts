import { registerRouteModule } from "@itsrose/api-routes";
import type {
	AudioRoutesOptions,
	CharacterAiRoutesOptions,
	InstagramRoutesOptions,
	MtxxRoutesOptions,
	ReminiRoutesOptions,
	TiktokRoutesOptions,
} from "@itsrose/api-routes";
import { audioRoutes } from "@itsrose/api-routes/audio";
import { characterAiRoutes } from "@itsrose/api-routes/character-ai";
import { instagramRoutes } from "@itsrose/api-routes/instagram";
import { mtxxRoutes } from "@itsrose/api-routes/mtxx";
import { reminiRoutes } from "@itsrose/api-routes/remini";
import { tiktokRoutes } from "@itsrose/api-routes/tiktok";
import { versatileHairstyleCreateDescription } from "@itsrose/mtxx";
import type { FastifyInstance } from "fastify";

/**
 * The options the public API mounts the audio routes with.
 *
 * The public API hands out URLs for the generated audio instead of the
 * base64 payload, and publishes the audio format header.
 *
 * @param fastify - The Fastify instance the routes are registered on.
 * @returns The options of the audio routes.
 */
const createAudioRoutesOptions = (
	fastify: FastifyInstance
): AudioRoutesOptions => ({
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
	},
	consumes: {
		createIvcVoice: ["multipart/form-data"],
	},
});

/**
 * The options the public API mounts the mtxx routes with.
 *
 * The public API documents its mtxx routes with examples.
 */
const mtxxRoutesOptions: MtxxRoutesOptions = {
	descriptions: {
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
};

/**
 * The options the public API mounts the character.ai routes with.
 */
const characterAiRoutesOptions: CharacterAiRoutesOptions = {};

/**
 * The options the public API mounts the instagram routes with.
 */
const instagramRoutesOptions: InstagramRoutesOptions = {};

/**
 * The options the public API mounts the remini routes with.
 */
const reminiRoutesOptions: ReminiRoutesOptions = {};

/**
 * The options the public API mounts the tiktok routes with.
 */
const tiktokRoutesOptions: TiktokRoutesOptions = {};

/**
 * Registers the route modules the public API serves.
 *
 * Every module is registered on its own, under its own prefix: `/audio`,
 * `/character_ai`, `/instagram`, `/mtxx`, `/remini` and `/tiktok`. A module
 * that is not registered here is not served by this application.
 *
 * @param fastify - The Fastify instance the routes are registered on.
 */
export const registerApiRouteModules = async (
	fastify: FastifyInstance
): Promise<void> => {
	await registerRouteModule(
		fastify,
		audioRoutes,
		createAudioRoutesOptions(fastify)
	);
	await registerRouteModule(
		fastify,
		characterAiRoutes,
		characterAiRoutesOptions
	);
	await registerRouteModule(fastify, instagramRoutes, instagramRoutesOptions);
	await registerRouteModule(fastify, mtxxRoutes, mtxxRoutesOptions);
	await registerRouteModule(fastify, reminiRoutes, reminiRoutesOptions);
	await registerRouteModule(fastify, tiktokRoutes, tiktokRoutesOptions);
};
