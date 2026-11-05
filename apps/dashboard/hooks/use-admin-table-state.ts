"use client";

import {
	buildAdminTableSearch,
	clearAdminTableFilters,
	parseAdminTableState,
	type AdminTableDefaults,
	type AdminTableState,
} from "@/features/admin/table-state";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

/**
 * URL-synced view state for admin list pages.
 *
 * `defaults` must be a module-level constant so the memo stays stable.
 */
export function useAdminTableState(defaults: AdminTableDefaults = {}) {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const router = useRouter();

	const state = useMemo(
		() => parseAdminTableState(searchParams, defaults),
		[searchParams, defaults]
	);

	const write = useCallback(
		(next: AdminTableState) => {
			const search = buildAdminTableSearch(next, defaults);
			router.replace(`${pathname}${search}`, { scroll: false });
		},
		[defaults, pathname, router]
	);

	const setQuery = useCallback(
		(q: string) => write({ ...state, q }),
		[state, write]
	);

	const setFilter = useCallback(
		(key: string, value: string) =>
			write({
				...state,
				filters: { ...state.filters, [key]: value },
			}),
		[state, write]
	);

	const resetFilters = useCallback(
		() => write(clearAdminTableFilters(state, defaults)),
		[defaults, state, write]
	);

	const setInspect = useCallback(
		(id: string | null) => write({ ...state, inspect: id }),
		[state, write]
	);

	const clearInspect = useCallback(
		() => write({ ...state, inspect: null }),
		[state, write]
	);

	return {
		...state,
		setQuery,
		setFilter,
		resetFilters,
		setInspect,
		clearInspect,
	};
}
