"use client";

import { DataTable, type DataTableFeatures } from "@/components/table";
import {
	ArrowDownToLine,
	ArrowUpRightFromSquare,
	Magnifier,
	Receipt,
	Xmark,
} from "@gravity-ui/icons";
import {
	Button,
	buttonVariants,
	Card,
	Chip,
	Input,
	Skeleton,
	Tabs,
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
} from "../utils";

const columnHelper = createColumnHelper<DataTableFeatures, Invoice>();

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
	emptyMessage = "No billing invoices found.",
}) => {
	const [statusFilter, setStatusFilter] = useState<string>("all");
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
		return rawInvoices.filter((inv) => {
			if (statusFilter !== "all") {
				const statusLower = (inv.status || "").toLowerCase();
				if (
					statusFilter === "paid" &&
					statusLower !== "paid" &&
					statusLower !== "settlement"
				) {
					return false;
				}
				if (
					statusFilter === "pending" &&
					statusLower !== "pending" &&
					statusLower !== "unpaid"
				) {
					return false;
				}
				if (
					statusFilter === "expired" &&
					statusLower !== "expired" &&
					statusLower !== "expire"
				) {
					return false;
				}
				if (
					statusFilter === "void" &&
					statusLower !== "void" &&
					statusLower !== "canceled" &&
					statusLower !== "cancelled"
				) {
					return false;
				}
			}

			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase().trim();
				const matchOrder = inv.order_id?.toLowerCase().includes(q);
				const matchNumber = inv.invoice_number
					?.toLowerCase()
					.includes(q);
				const matchTier = inv.target_tier?.toLowerCase().includes(q);
				const matchType = inv.invoice_type?.toLowerCase().includes(q);
				if (!matchOrder && !matchNumber && !matchTier && !matchType) {
					return false;
				}
			}

			return true;
		});
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
					cell: (info) => (
						<Typography type="body-sm" className="font-mono">
							{info.getValue() ||
								info.row.original.invoice_number}
						</Typography>
					),
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
						<Typography type="body-sm">
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
						const isPendingStatus =
							(inv.status || "").toLowerCase() === "pending" ||
							(inv.status || "").toLowerCase() === "unpaid";
						const payUrl = inv.payment_link_url;
						const pdfUrl = inv.paid_pdf_url || inv.pdf_url;

						return (
							<div className="flex items-center justify-end gap-2">
								{isPendingStatus && payUrl && (
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
								)}
								{pdfUrl && (
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
								)}
							</div>
						);
					},
				}),
			]),
		[]
	);

	if (isLoading) {
		return <InvoiceTableSkeleton />;
	}

	return (
		<DataTable
			aria-label="Billing Invoices"
			data={filteredData}
			columns={columns}
			rowHeaderId="order_id"
			initialSorting={[{ id: "invoice_date", desc: true }]}
			pageSize={pageSize}
			showPagination={showPagination}
			paginationLabel="invoices"
			filterBar={
				showFilters
					? ({ resetPage }) => (
							<div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
								<Tabs
									selectedKey={statusFilter}
									onSelectionChange={(k) => {
										setStatusFilter(String(k));
										resetPage();
									}}
								>
									<Tabs.ListContainer>
										<Tabs.List aria-label="Filter invoices by status">
											<Tabs.Tab id="all">
												All
												<Tabs.Indicator />
											</Tabs.Tab>
											<Tabs.Tab id="paid">
												Paid
												<Tabs.Indicator />
											</Tabs.Tab>
											<Tabs.Tab id="pending">
												Pending
												<Tabs.Indicator />
											</Tabs.Tab>
											<Tabs.Tab id="expired">
												Expired
												<Tabs.Indicator />
											</Tabs.Tab>
											<Tabs.Tab id="void">
												Void
												<Tabs.Indicator />
											</Tabs.Tab>
										</Tabs.List>
									</Tabs.ListContainer>
								</Tabs>

								<div className="flex items-center gap-2">
									<div className="relative w-full sm:w-64">
										<Input
											variant="secondary"
											placeholder="Search order ID..."
											value={searchQuery}
											onChange={(e) => {
												setSearchQuery(e.target.value);
												resetPage();
											}}
										/>
										{searchQuery ? (
											<button
												type="button"
												onClick={() =>
													setSearchQuery("")
												}
												className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-muted hover:text-foreground"
												aria-label="Clear search"
											>
												<Xmark className="size-3.5" />
											</button>
										) : (
											<div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted">
												<Magnifier className="size-3.5" />
											</div>
										)}
									</div>
								</div>
							</div>
						)
					: undefined
			}
			emptyState={
				<Card variant="transparent" className="py-12">
					<div className="flex flex-col items-center justify-center text-center gap-3">
						<div className="p-3 text-muted">
							<Receipt className="size-8" />
						</div>
						<div className="flex flex-col gap-1">
							<Typography type="h4">No Invoices</Typography>
							<Typography type="body-sm" color="muted">
								{searchQuery || statusFilter !== "all"
									? "No invoices match your selected filter."
									: emptyMessage}
							</Typography>
						</div>
						{(searchQuery || statusFilter !== "all") && (
							<Button
								variant="secondary"
								size="sm"
								onPress={() => {
									setSearchQuery("");
									setStatusFilter("all");
								}}
							>
								Reset Filters
							</Button>
						)}
					</div>
				</Card>
			}
		/>
	);
};

export const InvoiceTableSkeleton: React.FC = () => (
	<div className="flex flex-col gap-3">
		<div className="flex justify-between items-center">
			<Skeleton className="h-8 w-48" />
			<Skeleton className="h-8 w-36" />
		</div>
		<Skeleton className="h-64 w-full" />
	</div>
);

InvoiceTable.displayName = "InvoiceTable";
InvoiceTableSkeleton.displayName = "InvoiceTableSkeleton";
