"use client";

import { Eye, Magnifier, Xmark } from "@gravity-ui/icons";
import {
	Button,
	Card,
	Chip,
	Input,
	ListBox,
	ListBoxItem,
	Select,
	Skeleton,
	Table,
	Typography,
} from "@heroui/react";
import type { TransactionInvoiceEvent } from "@itsrose/auth-billing";
import { useMemo, useState } from "react";
import { useAdminEvents } from "../../hooks";
import {
	extractEventIdentifiers,
	formatDateTime,
	getEventStatusProps,
} from "../../utils";
import { EventDetailModal } from "./event-detail-modal";

export const TransactionEventsTable: React.FC = () => {
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [inspectingEvent, setInspectingEvent] =
		useState<TransactionInvoiceEvent | null>(null);

	const { events, isLoading } = useAdminEvents({
		limit: 100,
	});

	const filteredEvents = useMemo(() => {
		const q = searchQuery.toLowerCase().trim();

		return events.filter((ev) => {
			const statusProps = getEventStatusProps(ev.event_name);
			const { orderId, invoiceId } = extractEventIdentifiers(
				ev.event_json
			);

			// Event type filter
			if (typeFilter !== "all") {
				const evNameLower = (ev.event_name || "").toLowerCase();
				if (typeFilter === "settlement") {
					if (statusProps.color !== "success") {
						return false;
					}
				} else if (typeFilter === "pending") {
					if (!evNameLower.includes("pending")) {
						return false;
					}
				} else if (typeFilter === "failed") {
					if (
						!evNameLower.includes("fail") &&
						!evNameLower.includes("deny") &&
						!evNameLower.includes("expire")
					) {
						return false;
					}
				} else if (typeFilter === "voided") {
					if (!evNameLower.includes("void")) {
						return false;
					}
				} else if (typeFilter === "not_found") {
					if (
						!evNameLower.includes("not_found") &&
						!evNameLower.includes("unresolvable")
					) {
						return false;
					}
				} else if (ev.event_name !== typeFilter) {
					return false;
				}
			}

			// Search query matching order_id, invoice_id, event_name, event id
			if (q) {
				const matches =
					Boolean(ev.event_name?.toLowerCase().includes(q)) ||
					Boolean(ev.id && ev.id.toLowerCase().includes(q)) ||
					Boolean(orderId && orderId.toLowerCase().includes(q)) ||
					Boolean(invoiceId && invoiceId.toLowerCase().includes(q));

				if (!matches) {
					return false;
				}
			}

			return true;
		});
	}, [events, searchQuery, typeFilter]);

	return (
		<div className="flex flex-col gap-4">
			{/* Top Bar with Filters and Search */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div className="flex flex-wrap items-center gap-2">
					<Select
						aria-label="Filter by event type"
						className="w-full sm:w-56"
						variant="secondary"
						selectedKey={typeFilter}
						onSelectionChange={(key) => {
							if (key) {
								setTypeFilter(String(key));
							}
						}}
					>
						<Select.Trigger>
							<Select.Value />
							<Select.Indicator />
						</Select.Trigger>
						<Select.Popover>
							<ListBox>
								<ListBoxItem id="all" textValue="All Events">
									All Events
								</ListBoxItem>
								<ListBoxItem
									id="settlement"
									textValue="Settlement / Success"
								>
									Settlement / Success
								</ListBoxItem>
								<ListBoxItem id="pending" textValue="Pending">
									Pending
								</ListBoxItem>
								<ListBoxItem id="failed" textValue="Failed">
									Failed
								</ListBoxItem>
								<ListBoxItem id="voided" textValue="Voided">
									Voided
								</ListBoxItem>
								<ListBoxItem
									id="not_found"
									textValue="Not Found / Unresolvable"
								>
									Not Found / Unresolvable
								</ListBoxItem>
							</ListBox>
						</Select.Popover>
					</Select>
				</div>

				<div className="flex items-center gap-2">
					<div className="relative w-full sm:w-72">
						<Input
							variant="secondary"
							placeholder="Search order ID or event name..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
						{searchQuery ? (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
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

			{/* Main Table / Skeletons / Empty */}
			{isLoading ? (
				<Card variant="default" className="p-4">
					<div className="flex flex-col gap-3">
						{Array.from({ length: 5 }).map((_, i) => (
							<div
								key={`ev-skel-${i}`}
								className="flex justify-between py-2"
							>
								<Skeleton className="h-5 w-28" />
								<Skeleton className="h-5 w-36" />
								<Skeleton className="h-5 w-28" />
								<Skeleton className="h-5 w-24" />
								<Skeleton className="h-5 w-16" />
							</div>
						))}
					</div>
				</Card>
			) : filteredEvents.length === 0 ? (
				<Card variant="transparent" className="py-12">
					<div className="flex flex-col items-center justify-center text-center gap-3">
						<Typography type="h4">
							No Transaction Events Found
						</Typography>
						<Typography type="body-sm" color="muted">
							{searchQuery || typeFilter !== "all"
								? "No recorded events match the selected criteria."
								: "No audit or webhook events recorded yet."}
						</Typography>
						{(searchQuery || typeFilter !== "all") && (
							<Button
								variant="secondary"
								size="sm"
								onPress={() => {
									setSearchQuery("");
									setTypeFilter("all");
								}}
							>
								Reset Filters
							</Button>
						)}
					</div>
				</Card>
			) : (
				<Table variant="secondary">
					<Table.ScrollContainer>
						<Table.Content aria-label="Transaction Event Flow Ledger">
							<Table.Header>
								<Table.Column id="event_id" isRowHeader>
									Event ID
								</Table.Column>
								<Table.Column id="event_name">
									Event Name
								</Table.Column>
								<Table.Column id="reference">
									Order ID / Invoice ID
								</Table.Column>
								<Table.Column id="timestamp">
									Timestamp
								</Table.Column>
								<Table.Column id="actions">
									<span className="sr-only">Actions</span>
								</Table.Column>
							</Table.Header>
							<Table.Body>
								{filteredEvents.map((ev, idx) => {
									const statusProps = getEventStatusProps(
										ev.event_name
									);
									const { orderId, invoiceId } =
										extractEventIdentifiers(ev.event_json);
									const rowId =
										ev.id ||
										`event-${ev.event_name}-${idx}`;

									return (
										<Table.Row key={rowId} id={rowId}>
											<Table.Cell>
												{ev.id ? (
													<Typography
														type="code"
														className="font-mono text-xs select-all"
													>
														{ev.id}
													</Typography>
												) : (
													<span className="text-muted text-xs">
														—
													</span>
												)}
											</Table.Cell>
											<Table.Cell>
												<Chip
													size="sm"
													variant="soft"
													color={statusProps.color}
												>
													{ev.event_name}
												</Chip>
											</Table.Cell>
											<Table.Cell>
												<div className="flex flex-col gap-0.5">
													{orderId ? (
														<Typography
															type="code"
															className="font-mono text-xs font-semibold select-all"
														>
															{orderId}
														</Typography>
													) : null}
													{invoiceId ? (
														<span className="font-mono text-[11px] text-muted select-all">
															{invoiceId}
														</span>
													) : null}
													{!orderId && !invoiceId ? (
														<span className="text-muted text-xs">
															—
														</span>
													) : null}
												</div>
											</Table.Cell>
											<Table.Cell>
												<Typography
													type="body-xs"
													color="muted"
												>
													{formatDateTime(
														ev.created_at ||
															(
																ev as unknown as {
																	createdAt?:
																		| string
																		| Date;
																}
															).createdAt
													)}
												</Typography>
											</Table.Cell>
											<Table.Cell>
												<div className="flex items-center justify-end">
													<Button
														variant="secondary"
														size="sm"
														onPress={() =>
															setInspectingEvent(
																ev
															)
														}
														aria-label="View Event Details"
													>
														<Eye className="size-3.5" />
														Details
													</Button>
												</div>
											</Table.Cell>
										</Table.Row>
									);
								})}
							</Table.Body>
						</Table.Content>
					</Table.ScrollContainer>
				</Table>
			)}

			{/* Detail Inspector Modal */}
			<EventDetailModal
				event={inspectingEvent}
				isOpen={Boolean(inspectingEvent)}
				onOpenChange={(open) => {
					if (!open) {
						setInspectingEvent(null);
					}
				}}
			/>
		</div>
	);
};

TransactionEventsTable.displayName = "TransactionEventsTable";
