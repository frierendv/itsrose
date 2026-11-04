import type { SortDescriptor } from "@heroui/react";
import type { SortingState } from "@tanstack/react-table";

/**
 * Pure bridging helpers between HeroUI's sort descriptor and TanStack Table's
 * sorting state, plus pagination range math. Kept free of runtime UI imports
 * so they can be unit-tested directly.
 */

export function toSortDescriptor(
	sorting: SortingState
): SortDescriptor | undefined {
	const first = sorting[0];
	if (!first) {
		return undefined;
	}
	return {
		column: first.id,
		direction: first.desc ? "descending" : "ascending",
	};
}

export function toSortingState(descriptor: SortDescriptor): SortingState {
	return [
		{
			desc: descriptor.direction === "descending",
			id: String(descriptor.column),
		},
	];
}

export function getPaginationRange(
	total: number,
	pageIndex: number,
	pageSize: number
): { start: number; end: number } {
	if (total <= 0) {
		return { start: 0, end: 0 };
	}
	return {
		start: pageIndex * pageSize + 1,
		end: Math.min((pageIndex + 1) * pageSize, total),
	};
}
