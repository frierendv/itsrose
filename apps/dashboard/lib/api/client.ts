import { config } from "@/config";

export class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
		public data?: unknown
	) {
		super(message);
		this.name = "ApiError";
	}
}

type FetchFormat = "json" | "text" | "blob";

type ResultMap = {
	json: unknown;
	text: string;
	blob: Blob;
};

export type ApiRequestInit<TFormat extends FetchFormat = "json"> =
	RequestInit & {
		as?: TFormat;
		params?: Record<string, string | number | boolean | null | undefined>;
	};

export async function apiClient<
	TFormat extends FetchFormat = "json",
	TResult = ResultMap[TFormat],
>(endpoint: string, init?: ApiRequestInit<TFormat>): Promise<TResult> {
	const format = init?.as ?? "json";
	const baseUrl = config.ITSROSE_API_BASE_URL.origin;
	const normalizedPath = endpoint.startsWith("http")
		? endpoint
		: `${baseUrl}/${endpoint.replace(/^\/+/, "")}`;

	const url = new URL(normalizedPath);
	if (init?.params) {
		for (const [key, value] of Object.entries(init.params)) {
			if (value !== undefined && value !== null) {
				url.searchParams.set(key, String(value));
			}
		}
	}

	const headers = new Headers(init?.headers);
	if (!headers.has("Content-Type") && init?.method && init.method !== "GET") {
		headers.set("Content-Type", "application/json");
	}
	headers.set("x-auth-token", "true");

	const response = await fetch(url.toString(), {
		...init,
		headers,
		credentials: "include",
	});

	if (!response.ok) {
		const errPayload = await response.json().catch(() => null);
		const message =
			errPayload?.message ||
			errPayload?.error ||
			`Request failed with status ${response.status} ${response.statusText}`;
		throw new ApiError(response.status, message, errPayload);
	}

	return (await response[format]()) as TResult;
}
