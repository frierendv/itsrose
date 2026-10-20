import { config } from "@/config";
import { fetcher } from "@/shared/fetcher";
import { tokenStore } from "@/store/token-store";
import type {
	ApiResponse,
	Model,
	TextToSpeechRequest,
	TextToSpeechResponse,
	Voice,
} from "./types";

const DEFAULT_HEADERS = {
	"x-auth-token": "true",
};

function createUrl(path: string) {
	const normalizedPath = path.replace(/^\/+/, "");
	return `${config.ITSROSE_API_BASE_URL.origin}/${normalizedPath}`;
}

export async function fetchModels(): Promise<Model[]> {
	const { token } = tokenStore.getState();
	const response = await fetcher<"json", ApiResponse<{ models: Model[] }>>(
		createUrl("/audio/get_models"),
		{
			headers: {
				Authorization: `Bearer ${token}`,
				...DEFAULT_HEADERS,
			},
		}
	);

	if (!response.ok) {
		throw new Error(response.message || "Failed to fetch audio models");
	}

	return response.data.models;
}

export async function fetchVoices(
	opts: {
		category?: string;
		searchQuery?: string;
		page_size?: number;
		next_page_token?: string | null;
	} = {}
): Promise<Voice[]> {
	const {
		category = "premade",
		page_size = 50,
		next_page_token = null,
		searchQuery = null,
	} = opts;
	const { token } = tokenStore.getState();

	const query = new URLSearchParams({
		category,
		page_size: String(page_size),
		...(next_page_token ? { next_page_token } : {}),
		...(searchQuery ? { search: searchQuery } : {}),
	});

	const response = await fetcher<"json", ApiResponse<{ voices: Voice[] }>>(
		createUrl(`/audio/get_voices?${query.toString()}`),
		{
			headers: {
				Authorization: `Bearer ${token}`,
				...DEFAULT_HEADERS,
			},
		}
	);

	if (!response.ok) {
		throw new Error(response.message || "Failed to fetch audio voices");
	}

	return response.data.voices;
}

export async function generateSpeech(
	props: TextToSpeechRequest
): Promise<TextToSpeechResponse> {
	const { token } = tokenStore.getState();
	const response = await fetcher<"json", ApiResponse<TextToSpeechResponse>>(
		createUrl("/audio/text_to_speech/with_timestamp"),
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"content-type": "application/json",
				...DEFAULT_HEADERS,
			},
			body: JSON.stringify(props),
		}
	);

	if (!response.ok || !response.data) {
		throw new Error(
			response.message || "Failed to convert text to speech :("
		);
	}

	return response.data;
}

export function downloadAudio(
	audioDataUriOrUrl: string,
	filename: string = "audio-generation.mp3"
) {
	if (typeof window === "undefined") {
		return;
	}

	const link = document.createElement("a");
	link.href = audioDataUriOrUrl;
	link.download = filename.endsWith(".mp3") ? filename : `${filename}.mp3`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}
