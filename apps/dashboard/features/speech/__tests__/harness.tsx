import { AudioPlayerProvider } from "@/components/ui/audio-player";
import { ToastProvider } from "@heroui/react/toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { SpeechPage } from "../pages/speech-page";
import { jsonResponse, type FetchRoute } from "./fetch-mock";

/* -------------------------------------------------------------------------- */
/*                                   Fixtures                                 */
/* -------------------------------------------------------------------------- */

/** One owned clone; its preview is read through the asset library. */
export const CLONED_VOICE = {
	voice_id: "voice_cloned",
	name: "Narrator",
	source: "cloned",
	resource_id: "res_cloned",
	sample_asset_id: "ast_01",
	created_at: "2026-11-20T08:00:00.000Z",
} as const;

/**
 * One catalogue voice, in the shape the existing API returns it: a premade
 * voice has no sample asset and the catalogue omits `preview_url` when it has
 * no preview.
 */
export const PREMADE_VOICE = {
	voice_id: "voice_premade",
	name: "Aria",
	source: "premade",
} as const;

/** The same catalogue voice when the upstream catalogue ships a preview. */
export const PREMADE_VOICE_WITH_PREVIEW = {
	...PREMADE_VOICE,
	preview_url: "https://audio.test/preview/aria.mp3",
} as const;

/** One history row, unsaved and still playable. */
export const GENERATION_ROW = {
	generation_id: "gen_01",
	feature: "text_to_speech",
	status: "completed",
	input_text: "A saved line from the history.",
	created_at: "2026-11-20T08:00:00.000Z",
	expires_at: "2026-11-21T08:00:00.000Z",
	saved: false,
	asset_id: null,
	expired: false,
} as const;

/** An expired, still-listed row. */
export const EXPIRED_ROW = {
	...GENERATION_ROW,
	generation_id: "gen_expired",
	input_text: "An expired line.",
	expired: true,
} as const;

/* -------------------------------------------------------------------------- */
/*                                  Envelopes                                 */
/* -------------------------------------------------------------------------- */

export function successEnvelope(data: unknown) {
	return {
		ok: true,
		code: 1000,
		message: "OK",
		data,
		errors: null,
		meta: {},
	};
}

export function failureEnvelope(
	message: string,
	errors: Record<string, unknown> = {}
) {
	return {
		ok: false,
		code: 4001,
		message,
		data: null,
		errors,
		meta: {},
	};
}

/** The 401 every speech and voice route answers without a session. */
export const UNAUTHORIZED_ENVELOPE = failureEnvelope(
	"A dashboard session is required to use the speech surface.",
	{ session: "Sign in and retry." }
);

/* -------------------------------------------------------------------------- */
/*                                  Routes                                    */
/* -------------------------------------------------------------------------- */

/** Serves `GET /studio/voices` with the dashboard's envelope. */
export function voicesRoute(items: readonly unknown[]): FetchRoute {
	return {
		method: "GET",
		path: "/studio/voices",
		respond: () => jsonResponse(successEnvelope({ items })),
	};
}

/** Serves `GET /studio/generations` with one page. */
export function generationsRoute(items: readonly unknown[]): FetchRoute {
	return {
		method: "GET",
		path: "/studio/generations",
		respond: ({ url }) =>
			jsonResponse(
				successEnvelope({
					items,
					limit: Number(url.searchParams.get("limit") ?? 20),
					offset: Number(url.searchParams.get("offset") ?? 0),
				})
			),
	};
}

/* -------------------------------------------------------------------------- */
/*                                   Render                                   */
/* -------------------------------------------------------------------------- */

/**
 * Renders one speech component inside the provider tree the dashboard sends.
 *
 * The query client disables retries so a 401 settles immediately, and the
 * toast provider is mounted because failure messages are part of the UI under
 * test.
 */
export function renderInSpeechProviders(ui: ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const user = userEvent.setup();

	render(
		<QueryClientProvider client={queryClient}>
			<AudioPlayerProvider>{ui}</AudioPlayerProvider>
			{/* The dashboard mounts the toast region beside the tree, not
			    around it; the test mirrors that. */}
			<ToastProvider />
		</QueryClientProvider>
	);

	return { queryClient, user };
}

/** Renders the whole speech page. */
export function renderSpeechPage() {
	return renderInSpeechProviders(<SpeechPage />);
}
