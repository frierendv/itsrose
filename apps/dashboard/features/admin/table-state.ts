/**
 * Pure URL-state helpers for admin list pages.
 *
 * Search, module filters and the open inspector live in the query string so a
 * reload or a shared link restores the same view. Defaults are omitted from
 * the URL; unknown keys are ignored.
 */

export type AdminTableState = {
	q: string;
	filters: Record<string, string>;
	inspect: string | null;
};

export type AdminTableDefaults = {
	/** Known filter keys with their default values. */
	filters?: Record<string, string>;
};

type ReadonlyParams = {
	get: (key: string) => string | null;
};

const QUERY_KEY = "q";
const INSPECT_KEY = "inspect";

export function parseAdminTableState(
	params: ReadonlyParams,
	defaults: AdminTableDefaults = {}
): AdminTableState {
	const q = (params.get(QUERY_KEY) ?? "").trim();
	const inspectRaw = (params.get(INSPECT_KEY) ?? "").trim();
	const filters: Record<string, string> = {};

	for (const [key, fallback] of Object.entries(defaults.filters ?? {})) {
		const value = params.get(key);
		if (value === null) {
			continue;
		}
		const trimmed = value.trim();
		if (trimmed.length === 0 || trimmed === fallback) {
			continue;
		}
		filters[key] = trimmed;
	}

	return {
		q,
		filters,
		inspect: inspectRaw.length > 0 ? inspectRaw : null,
	};
}

/**
 * Builds the query string for a state, omitting defaults.
 * Returns an empty string when nothing should be in the URL.
 */
export function buildAdminTableSearch(
	state: AdminTableState,
	defaults: AdminTableDefaults = {}
): string {
	const params = new URLSearchParams();

	if (state.q.trim().length > 0) {
		params.set(QUERY_KEY, state.q.trim());
	}

	for (const [key, value] of Object.entries(state.filters).sort(
		([left], [right]) => left.localeCompare(right)
	)) {
		const fallback = defaults.filters?.[key];
		const trimmed = value.trim();
		if (trimmed.length === 0 || trimmed === fallback) {
			continue;
		}
		params.set(key, trimmed);
	}

	if (state.inspect && state.inspect.trim().length > 0) {
		params.set(INSPECT_KEY, state.inspect.trim());
	}

	const search = params.toString();
	return search.length > 0 ? `?${search}` : "";
}

/**
 * Resets pagination-free view state (search + filters), keeping the inspector.
 */
export function clearAdminTableFilters(
	state: AdminTableState,
	defaults: AdminTableDefaults = {}
): AdminTableState {
	void defaults;
	return { ...state, q: "", filters: {} };
}
