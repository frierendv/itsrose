"use client";

import { CopyButton } from "@/components/copy-button";
import type { DataTableFeatures } from "@/components/table";
import { useAdminTableState } from "@/hooks/use-admin-table-state";
import { Eye } from "@gravity-ui/icons";
import { Button, Chip, Typography } from "@heroui/react";
import type { TransactionInvoiceEvent } from "@itsrose/auth-billing";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useAdminEvents } from "../../hooks";
import {
	extractEventIdentifiers,
	formatDateTime,
	getEventStatusProps,
} from "../../utils";
import { EVENT_FILTER_BY_KIND } from "../constants";
import { AdminDataTable, AdminSelect, TableToolbar } from "../shell";
import { EventInspectDrawer } from "./event-inspect-drawer";

const columnHelper = createColumnHelper<
	DataTableFeatures,
	TransactionInvoiceEvent
>();
const FILTER_DEFAULTS = { filters: { kind: "all" } };

function matchesKind(eventName: string | undefined, kind: string): boolean {
	if (kind === "all") {
		return true;
	}
	const name = (eventName || "").toLowerCase();
	switch (kind) {
		case "settlement":
			return (
				name.endsWith(".settlement") ||
				name.endsWith(".success") ||
				name === "settlement" ||
				name === "success"
			);
		case "pending":
			return name.endsWith(".pending") || name.includes("pending");
		case "failed":
			return name.includes("failed") || name.endsWith(".failed");
		case "voided":
			return name.includes("void");
		case "not_found":
			return name.includes("not_found");
		default:
			return name === kind;
	}
}

export const TransactionEventsTable: React.FC = () => {
	const {
		q,
		filters,
		inspect,
		setQuery,
		setFilter,
		setInspect,
		resetFilters,
	} = useAdminTableState(FILTER_DEFAULTS);
	const kind = filters.kind ?? "all";

	const { events, isLoading, isError, error, refetch } = useAdminEvents({
		limit: 100,
	});

	const filteredEvents = useMemo(() => {
		const needle = q.trim().toLowerCase();
		return events.filter((event) => {
			if (!matchesKind(event.event_name, kind)) {
				return false;
			}
			if (!needle) {
				return true;
			}
			const { orderId, invoiceId } = extractEventIdentifiers(
				event.event_json
			);
			return (
				(event.event_name || "").toLowerCase().includes(needle) ||
				(event.id || "").toLowerCase().includes(needle) ||
				(orderId || "").toLowerCase().includes(needle) ||
				(invoiceId || "").toLowerCase().includes(needle)
			);
		});
	}, [events, kind, q]);

	const inspectedEvent = events.find((event) => event.id === inspect) ?? null;

	const columns = useMemo(
		() =>
			columnHelper.columns([
				columnHelper.accessor("event_name", {
					header: "Event",
					cell: (info) => {
						const props = getEventStatusProps(info.getValue());
						return (
							<div className="flex flex-col gap-1">
								<Typography
									type="body-sm"
									className="font-mono text-xs font-semibold"
								>
									{info.getValue()}
								</Typography>
								<Chip
									color={props.color}
									size="sm"
									variant="soft"
								>
									{props.label}
								</Chip>
							</div>
						);
					},
				}),
				columnHelper.display({
					id: "reference",
					header: "Reference",
					cell: (info) => {
						const { orderId, invoiceId } = extractEventIdentifiers(
							info.row.original.event_json
						);
						return (
							<div className="flex flex-col text-xs">
								<span className="font-mono">
									{orderId ?? "—"}
								</span>
								<span className="text-muted font-mono">
									{invoiceId ?? "—"}
								</span>
							</div>
						);
					},
				}),
				columnHelper.accessor("created_at", {
					header: "Recorded",
					cell: (info) => (
						<Typography type="body-xs">
							{formatDateTime(
								info.getValue() ||
									(
										info.row.original as unknown as {
											createdAt?: string | Date;
										}
									).createdAt
							)}
						</Typography>
					),
				}),
				columnHelper.accessor("id", {
					header: "Event ID",
					cell: (info) => (
						<div className="flex items-center gap-2">
							<Typography
								type="body-xs"
								className="max-w-28 truncate font-mono"
							>
								{info.getValue() || "—"}
							</Typography>
							{info.getValue() ? (
								<CopyButton
									aria-label="Copy event id"
									isIconOnly
									size="sm"
									textValue={info.getValue()}
									variant="ghost"
								/>
							) : null}
						</div>
					),
				}),
				columnHelper.display({
					id: "actions",
					header: () => <span className="sr-only">Actions</span>,
					cell: (info) => (
						<div className="flex justify-end">
							<Button
								aria-label="Inspect event"
								isIconOnly
								onPress={() =>
									setInspect(info.row.original.id ?? "")
								}
								size="sm"
								variant="outline"
							>
								<Eye aria-hidden />
							</Button>
						</div>
					),
				}),
			]),
		[setInspect]
	);

	const isFiltered = q.length > 0 || kind !== "all";

	return (
		<>
			<AdminDataTable
				aria-label="Transaction events"
				columns={columns}
				data={filteredEvents}
				error={error}
				emptyLabel="No transaction events match the current filters."
				isError={isError}
				isLoading={isLoading}
				onRetry={() => void refetch()}
				pageSize={25}
				paginationLabel="events"
				rowHeaderId="event_name"
				toolbar={
					<TableToolbar
						filters={
							<AdminSelect
								aria-label="Filter by event kind"
								label="Filter by kind"
								onChange={(value) => setFilter("kind", value)}
								options={EVENT_FILTER_BY_KIND}
								value={kind}
							/>
						}
						isFiltered={isFiltered}
						onClear={resetFilters}
						onQueryChange={setQuery}
						query={q}
						searchPlaceholder="Search by event, order or invoice id…"
					/>
				}
			/>

			<EventInspectDrawer
				event={inspectedEvent}
				isOpen={Boolean(inspectedEvent)}
				onOpenChange={(open) => !open && setInspect(null)}
			/>
		</>
	);
};

TransactionEventsTable.displayName = "TransactionEventsTable";
