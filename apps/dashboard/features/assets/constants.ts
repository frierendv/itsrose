import type { AssetKind } from "./types";

/** Canonical dashboard route of the asset library. */
export const ASSETS_ROUTE = "/assets";

/** Assets requested per page. The API accepts a limit between 1 and 200. */
export const ASSETS_PAGE_SIZE = 24;

export type AssetKindOption = {
	id: AssetKind;
	label: string;
};

/** The kinds the upload dialog offers, in display order. */
export const ASSET_KIND_OPTIONS: readonly AssetKindOption[] = [
	{ id: "voice_sample", label: "Voice sample" },
	{ id: "image", label: "Image" },
	{ id: "audio", label: "Audio" },
	{ id: "video", label: "Video" },
];

/** The kind a fresh upload form starts on. */
export const DEFAULT_ASSET_KIND: AssetKind = "image";
