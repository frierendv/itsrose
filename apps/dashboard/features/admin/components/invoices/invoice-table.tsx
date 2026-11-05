"use client";

import { CopyButton } from "@/components/copy-button";
import type { DataTableFeatures } from "@/components/table";
import { useAdminTableState } from "@/hooks/use-admin-table-state";
import { Eye, TrashBin } from "@gravity-ui/icons";
import { Button, Chip, Typography } from "@heroui/react";
import type { Invoice } from "@itsrose/auth-billing";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useAdminInvoices } from "../../hooks";
import {
	formatDate,
	formatIDR,
	getInvoiceStatusProps,
	getInvoiceTypeProps,
} from "../../utils";
import { INVOICE_FILTER_BY_STATUS, INVOICE_FILTER_BY_TYPE } from "../constants";
import { AdminDataTable, AdminSelect, TableToolbar } from "../shell";
import { ViewUserPopover } from "../view-popover";
import { InvoiceInspectDrawer } from "./invoice-inspect-drawer";
import { VoidInvoiceDialog } from "./void-invoice-dialog";

const columnHelper = createColumnHelper<DataTableFeatures, Invoice>();
const FILTER_DEFAULTS = { filters: { status: "all", type: "ALL" } };

function isPendingInvoice(status: string | null | undefined): boolean {
	const normalized = (status || "").toLowerCase();
	return normalized === "pending" || normalized === "unpaid";
}

export const InvoiceTable: React.FC = () => {
	const {
		q,
		filters,
		inspect,
		setQuery,
		setFilter,
		setInspect,
		resetFilters,
	} = useAdminTableState(FILTER_DEFAULTS);
	const status = filters.status ?? "all";
	const type = filters.type ?? "ALL";

	const { invoices, isLoading, isError, error, refetch } = useAdminInvoices({
		status,
		invoice_type: type,
		limit: 100,
	});

	const [voidingInvoice, setVoidingInvoice] = useState<Invoice | null>(null);

	const filteredInvoices = useMemo(() => {
		const needle = q.trim().toLowerCase();
		if (!needle) {
			return invoices;
		}
		return invoices.filter(
			(invoice) =>
				invoice.order_id.toLowerCase().includes(needle) ||
				invoice.invoice_id.toLowerCase().includes(needle) ||
				invoice.user_id.toLowerCase().includes(needle) ||
				(invoice.invoice_number || "").toLowerCase().includes(needle) ||
				(invoice.target_tier || "").toLowerCase().includes(needle)
		);
	}, [invoices, q]);

	const inspectedInvoice =
		invoices.find(
			(invoice) =>
				invoice.invoice_id === inspect || invoice.order_id === inspect
		) ?? null;

	const columns = useMemo(
		() =>
			columnHelper.columns([
				columnHelper.accessor("order_id", {
					header: "Order / Invoice",
					cell: (info) => (
						<div className="flex flex-col gap-1">
							<div className="flex items-center gap-2">
								<Typography
									type="body-sm"
									className="max-w-32 truncate font-mono text-xs font-semibold"
								>
									{info.getValue()}
								</Typography>
								<CopyButton
									aria-label={`Copy order id ${info.getValue()}`}
									isIconOnly
									size="sm"
									textValue={info.getValue()}
									variant="ghost"
								/>
							</div>
							<Typography
								type="body-xs"
								color="muted"
								className="font-mono"
							>
								{info.row.original.invoice_number}
							</Typography>
						</div>
					),
				}),
				columnHelper.accessor("user_id", {
					header: "User",
					cell: (info) => (
						<ViewUserPopover
							showSubscription={false}
							userId={info.getValue()}
						>
							<Typography
								type="body-xs"
								className="font-mono select-all hover:underline"
							>
								{info.getValue()}
							</Typography>
						</ViewUserPopover>
					),
				}),
				columnHelper.accessor("target_tier", {
					header: "Tier",
					cell: (info) => (
						<Typography
							type="body-sm"
							className="font-medium uppercase"
						>
							{info.getValue() || "free"}
						</Typography>
					),
				}),
				columnHelper.accessor("invoice_type", {
					header: "Type",
					cell: (info) => {
						const props = getInvoiceTypeProps(info.getValue());
						return (
							<Chip color={props.color} size="sm" variant="soft">
								{props.label}
							</Chip>
						);
					},
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
						const props = getInvoiceStatusProps(info.getValue());
						return (
							<Chip color={props.color} size="sm" variant="soft">
								{props.label}
							</Chip>
						);
					},
				}),
				columnHelper.accessor("invoice_date", {
					header: "Date",
					cell: (info) => (
						<Typography type="body-xs">
							{formatDate(info.getValue())}
						</Typography>
					),
				}),
				columnHelper.display({
					id: "actions",
					header: () => <span className="sr-only">Actions</span>,
					cell: (info) => {
						const invoice = info.row.original;
						return (
							<div className="flex items-center justify-end gap-1.5">
								<Button
									aria-label="Inspect invoice"
									isIconOnly
									onPress={() =>
										setInspect(invoice.invoice_id)
									}
									size="sm"
									variant="outline"
								>
									<Eye aria-hidden />
								</Button>
								{isPendingInvoice(invoice.status) ? (
									<Button
										aria-label="Void invoice"
										isIconOnly
										onPress={() =>
											setVoidingInvoice(invoice)
										}
										size="sm"
										variant="outline"
									>
										<TrashBin aria-hidden />
									</Button>
								) : null}
							</div>
						);
					},
				}),
			]),
		[setInspect]
	);

	const isFiltered = q.length > 0 || status !== "all" || type !== "ALL";

	return (
		<>
			<AdminDataTable
				aria-label="Invoices"
				columns={columns}
				data={filteredInvoices}
				error={error}
				emptyLabel="No invoices match the current filters."
				isError={isError}
				isLoading={isLoading}
				onRetry={() => void refetch()}
				pageSize={25}
				paginationLabel="invoices"
				rowHeaderId="order_id"
				toolbar={
					<TableToolbar
						filters={
							<>
								<AdminSelect
									aria-label="Filter by status"
									label="Filter by status"
									onChange={(value) =>
										setFilter("status", value)
									}
									options={INVOICE_FILTER_BY_STATUS}
									value={status}
								/>
								<AdminSelect
									aria-label="Filter by type"
									className="w-full sm:w-40"
									label="Filter by type"
									onChange={(value) =>
										setFilter("type", value)
									}
									options={INVOICE_FILTER_BY_TYPE}
									value={type}
								/>
							</>
						}
						isFiltered={isFiltered}
						onClear={resetFilters}
						onQueryChange={setQuery}
						query={q}
						searchPlaceholder="Search by order, invoice, user or tier…"
					/>
				}
			/>

			<InvoiceInspectDrawer
				invoice={inspectedInvoice}
				isOpen={Boolean(inspectedInvoice)}
				onOpenChange={(open) => !open && setInspect(null)}
			/>

			<VoidInvoiceDialog
				invoice={voidingInvoice}
				isOpen={Boolean(voidingInvoice)}
				onOpenChange={(open) => !open && setVoidingInvoice(null)}
			/>
		</>
	);
};

InvoiceTable.displayName = "InvoiceTable";
