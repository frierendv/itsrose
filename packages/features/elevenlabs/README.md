# `@itsrose/elevenlabs`

Typed ElevenLabs client and schemas for the audio-generation endpoints used by ItsRose.

> [!warning] Required environment
>
> - `ELEVENLABS_API_KEY`: Your ElevenLabs API key.

## Overview

- `textToSpeech`, `speechToSpeech`, and `textToDialogue` wrap the main audio generation flows.
- `getModels` and `getVoices` expose the catalog endpoints.
- `createIVCVoice` covers voice creation through the voice cloning workflow.
- Request and response Zod schemas are exported alongside the client helpers.

## Usage

```ts
import { textToSpeech } from "@itsrose/elevenlabs";

const audio = await textToSpeech({
	text: "Hello from ItsRose",
	voice_id: "voice-id",
});
```
