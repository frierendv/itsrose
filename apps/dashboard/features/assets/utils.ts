import type { AssetKind } from "./types";

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB", "PB"] as const;

/**
 * Formats a byte count with binary units, the way storage quotas read.
 *
 * `1024` is `1 KB` and `1536` is `1.5 KB`; a fractional digit is dropped when
 * it is zero so a whole number never renders as `1.0 KB`.
 */
export function formatBytes(bytes: number, fractionDigits = 1): string {
	if (!Number.isFinite(bytes) || bytes < 0) {
		return "—";
	}

	if (bytes === 0) {
		return "0 B";
	}

	const exponent = Math.min(
		Math.floor(Math.log(bytes) / Math.log(1024)),
		BYTE_UNITS.length - 1
	);
	const value = bytes / 1024 ** exponent;

	if (exponent === 0) {
		return `${Math.round(value)} B`;
	}

	const formatted = value
		.toFixed(fractionDigits)
		.replace(/\.0+$/, "")
		.replace(/(\.\d*?)0+$/, "$1");

	return `${formatted} ${BYTE_UNITS[exponent]}`;
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-GB", {
	day: "numeric",
	month: "short",
	year: "numeric",
	timeZone: "UTC",
});

/**
 * Formats an API timestamp for the asset table.
 *
 * The API serializes `created_at` as an ISO string; UTC is pinned so the
 * rendered date does not depend on the browser's zone.
 */
export function formatAssetDate(
	value: string | Date | null | undefined
): string {
	if (!value) {
		return "—";
	}

	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) {
		return "—";
	}

	return DATE_FORMATTER.format(date);
}

const KIND_LABELS: Record<AssetKind, string> = {
	voice_sample: "Voice sample",
	image: "Image",
	audio: "Audio",
	video: "Video",
};

function isAssetKind(value: string): value is AssetKind {
	return Object.prototype.hasOwnProperty.call(KIND_LABELS, value);
}

/**
 * Turns an API `kind` into a label.
 *
 * The API keeps `kind` open-ended, so an unknown kind degrades to its
 * underscore-free form instead of disappearing.
 */
export function formatAssetKind(kind: string): string {
	if (isAssetKind(kind)) {
		return KIND_LABELS[kind];
	}
	return kind.replaceAll("_", " ");
}
