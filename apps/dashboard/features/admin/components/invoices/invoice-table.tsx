"use client";

import { TableEmptyState, TableLoadingState } from "@/components/table";
import { Eye, TrashBin } from "@gravity-ui/icons";
import {
	Button,
	Chip,
	Label,
	ListBox,
	ListBoxItem,
	SearchField,
	Select,
	Table,
	Tooltip,
	Typography,
} from "@heroui/react";
import type { Invoice } from "@itsrose/auth-billing";
import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import { useAdminInvoices } from "../../hooks";
import {
	formatDate,
	formatIDR,
	getInvoiceStatusProps,
	getInvoiceTypeProps,
} from "../../utils";
import { ViewUserPopover } from "../view-popover";
import { InvoiceDetailModal } from "./invoice-detail-modal";
import { VoidInvoiceDialog } from "./void-invoice-dialog";

export const InvoiceTable: React.FC = () => {
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [typeFilter, setTypeFilter] = useState<string>("ALL");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [debouncedSetSearch] = useDebounce(setSearchQuery, 500);

	const { invoices, isLoading } = useAdminInvoices({
		status: statusFilter,
		invoice_type: typeFilter,
	});

	const [inspectingInvoice, setInspectingInvoice] = useState<Invoice | null>(
		null
	);
	const [voidingInvoice, setVoidingInvoice] = useState<Invoice | null>(null);

	const hasFilter = useMemo(
		() =>
			statusFilter.toLowerCase() !== "all" ||
			typeFilter.toLowerCase() !== "all" ||
			searchQuery.trim().length > 0,
		[statusFilter, typeFilter, searchQuery]
	);

	const filteredInvoices = useMemo(() => {
		const q = searchQuery.toLowerCase().trim();
		if (!q) {
			return invoices;
		}
		return invoices.filter(
			(inv) =>
				inv.order_id.toLowerCase().includes(q) ||
				inv.invoice_id.toLowerCase().includes(q) ||
				inv.user_id.toLowerCase().includes(q)
		);
	}, [invoices, searchQuery]);

	const renderTableRow = useCallback((invoice: Invoice) => {
		const statusProps = getInvoiceStatusProps(invoice.status);
		const typeProps = getInvoiceTypeProps(invoice.invoice_type);
		const isPending =
			invoice.status?.toLowerCase() === "pending" ||
			invoice.status?.toLowerCase() === "unpaid";

		return (
			<Table.Row key={invoice.invoice_id} id={invoice.invoice_id}>
				<Table.Cell>
					<Typography
						type="body-sm"
						className="font-mono text-xs font-semibold select-all"
					>
						{invoice.order_id}
					</Typography>
				</Table.Cell>
				<Table.Cell>
					<ViewUserPopover userId={invoice.user_id}>
						<Typography
							type="body-xs"
							className="font-mono select-all text-muted hover:underline"
						>
							{invoice.user_id}
						</Typography>
					</ViewUserPopover>
				</Table.Cell>
				<Table.Cell>
					<Typography
						type="body-sm"
						className="font-medium uppercase"
					>
						{invoice.target_tier}
					</Typography>
				</Table.Cell>
				<Table.Cell>
					<Chip size="sm" variant="soft" color={typeProps.color}>
						{typeProps.label}
					</Chip>
				</Table.Cell>
				<Table.Cell>{formatIDR(invoice.gross_amount)}</Table.Cell>
				<Table.Cell>
					<Chip size="sm" variant="soft" color={statusProps.color}>
						{statusProps.label}
					</Chip>
				</Table.Cell>
				<Table.Cell>{formatDate(invoice.invoice_date)}</Table.Cell>
				<Table.Cell>
					<div className="flex items-center justify-end gap-1.5">
						<Tooltip delay={0}>
							<Button
								variant="outline"
								size="sm"
								onPress={() => setInspectingInvoice(invoice)}
								aria-label="Inspect Invoice"
								isIconOnly
							>
								<Eye className="size-3.5" />
							</Button>
							<Tooltip.Content>
								<Tooltip.Arrow />
								<p>View invoice details</p>
							</Tooltip.Content>
						</Tooltip>

						<Tooltip delay={0}>
							<Button
								aria-label="Void Invoice"
								variant="outline"
								size="sm"
								onPress={() => setVoidingInvoice(invoice)}
								isDisabled={!isPending}
								isIconOnly
							>
								<TrashBin className="text-danger" />
							</Button>
							<Tooltip.Content>
								<Tooltip.Arrow />
								<p>Void invoice</p>
							</Tooltip.Content>
						</Tooltip>
					</div>
				</Table.Cell>
			</Table.Row>
		);
	}, []);

	return (
		<div className="flex flex-col gap-4">
			{/* Top Bar with Filters and Search */}
			<div className="flex flex-col md:flex-row sm:items-center justify-between gap-3">
				<SearchField
					name="search"
					value={searchQuery}
					onChange={debouncedSetSearch}
					className="max-w-sm"
					fullWidth
				>
					<Label>Search order</Label>
					<SearchField.Group>
						<SearchField.SearchIcon />
						<SearchField.Input placeholder="Search order ID or user..." />
						<SearchField.ClearButton />
					</SearchField.Group>
				</SearchField>

				<div className="flex sm:flex-wrap items-center gap-2">
					<Select
						aria-label="Filter by status"
						className="w-full sm:w-44"
						value={statusFilter}
						onChange={(key) => setStatusFilter(String(key))}
					>
						<Label>Filter by status</Label>
						<Select.Trigger>
							<Select.Value />
							<Select.Indicator />
						</Select.Trigger>
						<Select.Popover>
							<ListBox>
								<ListBoxItem id="all" textValue="All Statuses">
									All
								</ListBoxItem>
								<ListBoxItem id="paid" textValue="Paid">
									Paid
								</ListBoxItem>
								<ListBoxItem id="pending" textValue="Pending">
									Pending
								</ListBoxItem>
								<ListBoxItem id="voided" textValue="Voided">
									Voided
								</ListBoxItem>
							</ListBox>
						</Select.Popover>
					</Select>

					<Select
						aria-label="Filter by type"
						className="w-full sm:w-40"
						value={typeFilter}
						onChange={(key) => setTypeFilter(String(key))}
					>
						<Label>Filter by status</Label>
						<Select.Trigger>
							<Select.Value />
							<Select.Indicator />
						</Select.Trigger>
						<Select.Popover>
							<ListBox>
								<ListBoxItem id="ALL" textValue="All">
									All
								</ListBoxItem>
								<ListBoxItem id="NEW" textValue="New">
									New
								</ListBoxItem>
								<ListBoxItem id="UPGRADE" textValue="Upgrade">
									Upgrade
								</ListBoxItem>
								<ListBoxItem id="RENEWAL" textValue="Renewal">
									Renewal
								</ListBoxItem>
							</ListBox>
						</Select.Popover>
					</Select>
				</div>
			</div>

			<Table>
				<Table.ScrollContainer>
					<Table.Content aria-label="Platform Financial Ledger">
						<Table.Header>
							<Table.Column id="order_id" isRowHeader>
								Order ID
							</Table.Column>
							<Table.Column id="user">User ID</Table.Column>
							<Table.Column id="tier">Tier</Table.Column>
							<Table.Column id="type">Type</Table.Column>
							<Table.Column id="amount">
								Amount (IDR)
							</Table.Column>
							<Table.Column id="status">Status</Table.Column>
							<Table.Column id="date">Date</Table.Column>
							<Table.Column id="actions">
								<span className="sr-only">Actions</span>
							</Table.Column>
						</Table.Header>
						<Table.Body
							items={filteredInvoices || []}
							renderEmptyState={() =>
								isLoading ? (
									<TableLoadingState />
								) : (
									<TableEmptyState
										label={
											(hasFilter &&
												"Empty, try different filter.") ||
											"No invoices found."
										}
									/>
								)
							}
						>
							{(invoice) => renderTableRow(invoice)}
						</Table.Body>
					</Table.Content>
				</Table.ScrollContainer>
			</Table>

			{/* Detail Inspector Modal */}
			<InvoiceDetailModal
				invoice={inspectingInvoice}
				isOpen={Boolean(inspectingInvoice)}
				onOpenChange={(open) => !open && setInspectingInvoice(null)}
			/>

			{/* Void Invoice Dialog */}
			<VoidInvoiceDialog
				invoice={voidingInvoice}
				isOpen={Boolean(voidingInvoice)}
				onOpenChange={(open) => !open && setVoidingInvoice(null)}
			/>
		</div>
	);
};

InvoiceTable.displayName = "InvoiceTable";
