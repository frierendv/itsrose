"use client";

import {
	DataTable,
	TableEmptyState,
	TableLoadingState,
	type DataTableColumn,
} from "@/components/table";
import type { RowData, SortingState } from "@tanstack/react-table";
import { QueryError } from "./query-error";

export type AdminDataTableProps<TData extends RowData> = {
	"aria-label": string;
	data: TData[];
	columns: DataTableColumn<TData>[];
	rowHeaderId?: string;
	isLoading?: boolean;
	isError?: boolean;
	error?: unknown;
	onRetry?: () => void;
	toolbar?: React.ReactNode;
	emptyLabel?: string;
	initialSorting?: SortingState;
	pageSize?: number;
	paginationLabel?: string;
	showPagination?: boolean;
};

/**
 * Admin list presentation: toolbar, optional caption, error and empty states
 * around the shared `DataTable` (client-side sort + pagination).
 */
export function AdminDataTable<TData extends RowData>({
	"aria-label": ariaLabel,
	data,
	columns,
	rowHeaderId,
	isLoading = false,
	isError = false,
	error,
	onRetry,
	toolbar,
	emptyLabel = "No records found.",
	initialSorting,
	pageSize = 25,
	paginationLabel = "records",
	showPagination,
}: AdminDataTableProps<TData>) {
	return (
		<div className="flex flex-col gap-4">
			{toolbar}

			<DataTable
				aria-label={ariaLabel}
				columns={columns}
				data={data}
				emptyState={
					isLoading ? (
						<TableLoadingState />
					) : isError ? (
						<QueryError error={error} onRetry={onRetry} />
					) : (
						<TableEmptyState label={emptyLabel} />
					)
				}
				initialSorting={initialSorting}
				isLoading={isLoading}
				pageSize={pageSize}
				paginationLabel={paginationLabel}
				rowHeaderId={rowHeaderId}
				showPagination={showPagination}
			/>
		</div>
	);
}

AdminDataTable.displayName = "AdminDataTable";
