"use client";

import { CopyButton } from "@/components/copy-button";
import { DataTable, type DataTableFeatures } from "@/components/table";
import { ArrowDownToLine, ArrowUpRightFromSquare } from "@gravity-ui/icons";
import {
	buttonVariants,
	Chip,
	ListBox,
	SearchField,
	Select,
	Typography,
} from "@heroui/react";
import type { Invoice } from "@itsrose/auth-billing";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useInvoices } from "../hooks";
import {
	formatDateID,
	formatIDR,
	getInvoiceStatusProps,
	getInvoiceTypeProps,
	isPendingInvoice,
	matchesInvoiceSearch,
	matchesInvoiceStatus,
	type InvoiceStatusFilter,
} from "../utils";

const columnHelper = createColumnHelper<DataTableFeatures, Invoice>();

export const STATUS_OPTIONS: ReadonlyArray<{
	id: InvoiceStatusFilter;
	label: string;
}> = [
	{ id: "all", label: "All Statuses" },
	{ id: "paid", label: "Paid" },
	{ id: "pending", label: "Pending" },
	{ id: "expired", label: "Expired" },
	{ id: "void", label: "Void" },
];

/** @deprecated Use STATUS_OPTIONS instead */
export const STATUS_TABS = STATUS_OPTIONS;

export interface InvoiceTableProps {
	invoices?: Invoice[];
	isPending?: boolean;
	pageSize?: number;
	showFilters?: boolean;
	showPagination?: boolean;
	emptyMessage?: string;
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({
	invoices: propInvoices,
	isPending: propIsPending,
	pageSize = 8,
	showFilters = true,
	showPagination = true,
}) => {
	const [statusFilter, setStatusFilter] =
		useState<InvoiceStatusFilter>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");

	const queryInvoices = useInvoices();

	const isLoading =
		propIsPending ??
		(propInvoices === undefined && queryInvoices.isPending);

	const rawInvoices = useMemo(
		() => propInvoices ?? queryInvoices.invoices ?? [],
		[propInvoices, queryInvoices.invoices]
	);

	const filteredData = useMemo(() => {
		return rawInvoices.filter(
			(inv) =>
				matchesInvoiceStatus(inv, statusFilter) &&
				matchesInvoiceSearch(inv, searchQuery)
		);
	}, [rawInvoices, statusFilter, searchQuery]);

	const columns = useMemo(
		() =>
			columnHelper.columns([
				columnHelper.accessor("invoice_date", {
					header: "Date",
					cell: (info) => (
						<Typography type="body-sm">
							{formatDateID(info.getValue())}
						</Typography>
					),
				}),
				columnHelper.accessor("order_id", {
					header: "Order ID",
					cell: (info) => {
						const inv = info.row.original;
						const orderId =
							info.getValue() ||
							inv.invoice_number ||
							inv.invoice_id ||
							"";
						return (
							<div className="flex items-center gap-1.5">
								<Typography
									type="body-sm"
									className="font-mono text-xs font-semibold"
								>
									{orderId || "—"}
								</Typography>
								{orderId ? (
									<CopyButton
										aria-label={`Copy order ID ${orderId}`}
										isIconOnly
										size="sm"
										textValue={orderId}
										variant="ghost"
									/>
								) : null}
							</div>
						);
					},
				}),
				columnHelper.accessor("invoice_type", {
					header: "Type",
					cell: (info) => {
						const { label, color } = getInvoiceTypeProps(
							info.getValue()
						);
						return (
							<Chip size="sm" variant="soft" color={color}>
								{label}
							</Chip>
						);
					},
				}),
				columnHelper.accessor("target_tier", {
					header: "Tier",
					cell: (info) => (
						<Typography type="body-sm" className="font-medium">
							{(info.getValue() || "FREE").toUpperCase()}
						</Typography>
					),
				}),
				columnHelper.accessor("gross_amount", {
					header: "Amount",
					cell: (info) => (
						<Typography
							type="body-sm"
							className="tabular-nums font-medium"
						>
							{formatIDR(info.getValue())}
						</Typography>
					),
				}),
				columnHelper.accessor("status", {
					header: "Status",
					cell: (info) => {
						const { label, color } = getInvoiceStatusProps(
							info.getValue()
						);
						return (
							<Chip size="sm" variant="soft" color={color}>
								{label}
							</Chip>
						);
					},
				}),
				columnHelper.display({
					id: "actions",
					header: () => <span className="sr-only">Actions</span>,
					cell: (info) => {
						const inv = info.row.original;
						const isPending = isPendingInvoice(inv.status);
						const payUrl = inv.payment_link_url;
						const pdfUrl = inv.paid_pdf_url || inv.pdf_url;

						return (
							<div className="flex items-center justify-end gap-2">
								{isPending && payUrl ? (
									<a
										href={payUrl}
										target="_blank"
										rel="noopener noreferrer"
										className={buttonVariants({
											variant: "outline",
											size: "sm",
										})}
									>
										<span>Pay Now</span>
										<ArrowUpRightFromSquare className="size-3" />
									</a>
								) : null}
								{pdfUrl ? (
									<a
										href={pdfUrl}
										target="_blank"
										rel="noopener noreferrer"
										className={buttonVariants({
											variant: "ghost",
											size: "sm",
										})}
										aria-label="Download Invoice Receipt PDF"
									>
										<ArrowDownToLine className="size-3.5" />
										<span className="hidden sm:inline">
											PDF
										</span>
									</a>
								) : null}
							</div>
						);
					},
				}),
			]),
		[]
	);

	return (
		<DataTable
			aria-label="Billing Invoices"
			data={filteredData}
			columns={columns}
			rowHeaderId="order_id"
			initialSorting={[{ id: "invoice_date", desc: true }]}
			pageSize={pageSize}
			showPagination={showPagination}
			isLoading={isLoading}
			paginationLabel="invoices"
			filterBar={
				showFilters
					? ({ resetPage }) => (
							<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
								<Select
									aria-label="Filter by status"
									className="w-full sm:w-44"
									selectionMode="single"
									value={statusFilter}
									onChange={(key) => {
										setStatusFilter(
											(String(key) ||
												"all") as InvoiceStatusFilter
										);
										resetPage();
									}}
								>
									<Select.Trigger>
										<Select.Value />
										<Select.Indicator />
									</Select.Trigger>
									<Select.Popover>
										<ListBox items={STATUS_OPTIONS}>
											{(item) => (
												<ListBox.Item
													id={item.id}
													textValue={item.label}
												>
													{item.label}
													<ListBox.ItemIndicator />
												</ListBox.Item>
											)}
										</ListBox>
									</Select.Popover>
								</Select>

								<SearchField
									aria-label="Search invoices"
									value={searchQuery}
									onChange={(val) => {
										setSearchQuery(val);
										resetPage();
									}}
								>
									<SearchField.Group>
										<SearchField.SearchIcon />
										<SearchField.Input placeholder="Search order ID, tier..." />
										<SearchField.ClearButton />
									</SearchField.Group>
								</SearchField>
							</div>
						)
					: undefined
			}
		/>
	);
};

InvoiceTable.displayName = "InvoiceTable";
