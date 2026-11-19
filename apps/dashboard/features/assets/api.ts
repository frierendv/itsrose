import { config } from "@/config";
import type { ZodType } from "zod/v4";
import {
	AssetApiError,
	assetDeleteSchema,
	assetListSchema,
	assetSchema,
	assetUrlSchema,
	parseAssetData,
	parseAssetEnvelope,
	type Asset,
	type AssetDelete,
	type AssetKind,
	type AssetList,
	type AssetUrl,
} from "./types";

/**
 * The asset routes are mounted at the API root, not under `/auth`.
 *
 * The session cookie is shared across the API and dashboard subdomains, so the
 * browser talks to the API origin directly with `credentials: "include"`.
 */
const ASSETS_PREFIX = "/assets";

/** Headers forwarded on the server so the session cookie travels with the call. */
export type AssetRequestOptions = {
	headers?: HeadersInit;
};

/** A page of assets. The API applies its own defaults when these are omitted. */
export type ListAssetsParams = {
	limit?: number;
	offset?: number;
};

/** The multipart body `POST /assets` expects. */
export type UploadAssetInput = {
	kind: AssetKind;
	file: File;
};

function assetEndpoint(path: string): string {
	const origin = config.AUTH_BASE_URL.replace(/\/+$/, "");
	return `${origin}${ASSETS_PREFIX}${path}`;
}

function buildHeaders(forwarded?: HeadersInit): Headers {
	const headers = new Headers(forwarded);
	headers.set("Accept", "application/json");
	return headers;
}

/**
 * Reads the JSON body without assuming the response has one.
 *
 * A proxy or a crash can answer with HTML or an empty body; that is reported
 * as an unexpected envelope rather than a `SyntaxError`.
 */
async function readBody(response: Response): Promise<unknown> {
	try {
		return await response.json();
	} catch {
		return null;
	}
}

async function requestAsset<T>(
	schema: ZodType<T>,
	path: string,
	init: RequestInit,
	options: AssetRequestOptions = {}
): Promise<T> {
	const response = await fetch(assetEndpoint(path), {
		...init,
		credentials: "include",
		headers: buildHeaders(options.headers),
	});

	const envelope = parseAssetEnvelope(
		await readBody(response),
		response.status
	);

	if (!envelope.ok) {
		throw new AssetApiError(envelope.message, {
			status: response.status,
			code: envelope.code,
			errors: envelope.errors ?? null,
		});
	}

	return parseAssetData(schema, envelope.data, response.status);
}

/**
 * Builds the multipart body for an upload.
 *
 * `kind` and `file` are the two parts the API reads; the browser sets the
 * multipart boundary, so no `Content-Type` header is ever written by hand.
 */
export function buildUploadFormData({
	kind,
	file,
}: UploadAssetInput): FormData {
	const formData = new FormData();
	formData.append("kind", kind);
	formData.append("file", file);
	return formData;
}

/** Uploads one file into the durable asset library. */
export async function uploadAsset(
	formData: FormData,
	options?: AssetRequestOptions
): Promise<Asset> {
	return requestAsset(
		assetSchema,
		"",
		{ method: "POST", body: formData },
		options
	);
}

/** Lists the authenticated user's assets, newest first. */
export async function listAssets(
	params: ListAssetsParams = {},
	options?: AssetRequestOptions
): Promise<AssetList> {
	const search = new URLSearchParams();
	if (params.limit !== undefined) {
		search.set("limit", String(params.limit));
	}
	if (params.offset !== undefined) {
		search.set("offset", String(params.offset));
	}
	const query = search.toString();

	return requestAsset(
		assetListSchema,
		query ? `?${query}` : "",
		{ method: "GET" },
		options
	);
}

/** Mints a short-lived signed URL for one asset; nothing is cached in a list. */
export async function getAssetUrl(
	assetId: string,
	options?: AssetRequestOptions
): Promise<AssetUrl> {
	return requestAsset(
		assetUrlSchema,
		`/${encodeURIComponent(assetId)}/url`,
		{ method: "GET" },
		options
	);
}

/** Deletes one asset and its stored object. */
export async function deleteAsset(
	assetId: string,
	options?: AssetRequestOptions
): Promise<AssetDelete> {
	return requestAsset(
		assetDeleteSchema,
		`/${encodeURIComponent(assetId)}`,
		{ method: "DELETE" },
		options
	);
}
