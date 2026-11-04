"use client";

import { Pagination, Table } from "@heroui/react";
import {
	createPaginatedRowModel,
	createSortedRowModel,
	flexRender,
	rowPaginationFeature,
	rowSortingFeature,
	sortFn_alphanumeric,
	tableFeatures,
	useTable,
	type RowData,
	type SortingState,
	type TableOptions,
} from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { TableEmptyState, TableLoadingState } from "./table-state";
import {
	getPaginationRange,
	toSortDescriptor,
	toSortingState,
} from "./table-utils";

/**
 * Assembles the TanStack Table v9 feature set shared by dashboard data tables
 * (client-side pagination + sorting). Call once per table via `useMemo`.
 */
export function createTableFeatures() {
	return tableFeatures({
		paginatedRowModel: createPaginatedRowModel(),
		rowPaginationFeature,
		rowSortingFeature,
		sortFns: {
			// eslint-disable-next-line camelcase
			alphanumeric: sortFn_alphanumeric,
		},
		sortedRowModel: createSortedRowModel(),
	});
}

export type DataTableFeatures = ReturnType<typeof createTableFeatures>;

export type DataTableColumn<TData extends RowData> = NonNullable<
	TableOptions<DataTableFeatures, TData>["columns"]
>[number];

export type DataTableProps<TData extends RowData> = {
	"aria-label": string;
	data: TData[];
	columns: DataTableColumn<TData>[];
	/** Column id rendered as the row header cell. */
	rowHeaderId?: string;
	initialSorting?: SortingState;
	pageSize?: number;
	showPagination?: boolean;
	/** Noun used in the pagination summary, e.g. "invoices". */
	paginationLabel?: string;
	isLoading?: boolean;
	/** Rendered above the table; receives `resetPage` to clear pagination on filter changes. */
	filterBar?: (helpers: { resetPage: () => void }) => React.ReactNode;
	/** Replaces the default empty state. */
	emptyState?: React.ReactNode;
};

export function DataTable<TData extends RowData>({
	data,
	columns,
	"aria-label": ariaLabel,
	rowHeaderId,
	initialSorting = [],
	pageSize = 10,
	showPagination = true,
	paginationLabel = "items",
	isLoading = false,
	filterBar,
	emptyState,
}: DataTableProps<TData>) {
	const [sorting, setSorting] = useState<SortingState>(initialSorting);

	const features = useMemo(() => createTableFeatures(), []);

	const table = useTable({
		columns,
		data,
		features,
		initialState: {
			pagination: { pageIndex: 0, pageSize },
			sorting: initialSorting,
		},
		onSortingChange: setSorting,
		state: { sorting },
	});

	const sortDescriptor = toSortDescriptor(sorting);
	const { pageIndex } = table.state.pagination;
	const pageCount = table.getPageCount();
	const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
	const { start, end } = getPaginationRange(data.length, pageIndex, pageSize);

	return (
		<div className="flex flex-col gap-4">
			{filterBar?.({ resetPage: () => table.setPageIndex(0) })}

			{isLoading ? (
				<TableLoadingState />
			) : data.length === 0 ? (
				(emptyState ?? <TableEmptyState />)
			) : (
				<Table variant="secondary">
					<Table.ScrollContainer>
						<Table.Content
							aria-label={ariaLabel}
							sortDescriptor={sortDescriptor}
							onSortChange={(d) => setSorting(toSortingState(d))}
						>
							<Table.Header>
								{table
									.getHeaderGroups()[0]
									?.headers.map((header) => (
										<Table.Column
											key={header.id}
											allowsSorting={header.column.getCanSort()}
											id={header.id}
											isRowHeader={
												header.id === rowHeaderId
											}
										>
											{({ sortDirection }) =>
												header.column.getCanSort() ? (
													<Table.SortableColumnHeader
														sortDirection={
															sortDirection
														}
													>
														{flexRender(
															header.column
																.columnDef
																.header,
															header.getContext()
														)}
													</Table.SortableColumnHeader>
												) : (
													flexRender(
														header.column.columnDef
															.header,
														header.getContext()
													)
												)
											}
										</Table.Column>
									))}
							</Table.Header>
							<Table.Body>
								{table.getRowModel().rows.map((row) => (
									<Table.Row key={row.id} id={row.id}>
										{row.getAllCells().map((cell) => (
											<Table.Cell key={cell.id}>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext()
												)}
											</Table.Cell>
										))}
									</Table.Row>
								))}
							</Table.Body>
						</Table.Content>
					</Table.ScrollContainer>

					{showPagination && pageCount > 1 && (
						<Table.Footer>
							<Pagination size="sm">
								<Pagination.Summary>
									{start} to {end} of {data.length}{" "}
									{paginationLabel}
								</Pagination.Summary>
								<Pagination.Content>
									<Pagination.Item>
										<Pagination.Previous
											isDisabled={
												!table.getCanPreviousPage()
											}
											onPress={() => table.previousPage()}
										>
											<Pagination.PreviousIcon />
											Prev
										</Pagination.Previous>
									</Pagination.Item>
									{pages.map((p) => (
										<Pagination.Item key={p}>
											<Pagination.Link
												isActive={p === pageIndex + 1}
												onPress={() =>
													table.setPageIndex(p - 1)
												}
											>
												{p}
											</Pagination.Link>
										</Pagination.Item>
									))}
									<Pagination.Item>
										<Pagination.Next
											isDisabled={!table.getCanNextPage()}
											onPress={() => table.nextPage()}
										>
											Next
											<Pagination.NextIcon />
										</Pagination.Next>
									</Pagination.Item>
								</Pagination.Content>
							</Pagination>
						</Table.Footer>
					)}
				</Table>
			)}
		</div>
	);
}

DataTable.displayName = "DataTable";
