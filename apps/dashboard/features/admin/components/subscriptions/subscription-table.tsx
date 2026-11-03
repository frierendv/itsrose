"use client";

import { CopyButton } from "@/components/copy-button";
import { TableEmptyState, TableLoadingState } from "@/components/table";
import { Eye, Gear } from "@gravity-ui/icons";
import {
	AlertDialog,
	Button,
	Chip,
	Label,
	ListBox,
	SearchField,
	Select,
	Table,
	Tooltip,
	Typography,
} from "@heroui/react";
import type { Subscription } from "@itsrose/auth-billing";
import { useCallback, useMemo, useState } from "react";
import { useDebounce } from "use-debounce";
import {
	useAdminSubscriptions,
	useCancelSubscriptionMutation,
	useRestoreSubscriptionMutation,
} from "../../api";
import { formatDate, getSubscriptionStatusProps } from "../../utils";
import { SUBSCRIPTION_FILTER_BY_STATUS } from "../constants";
import { ViewUserPopover } from "../view-popover";
import { SubscriptionDetailModal } from "./subscription-detail-modal";
import { SubscriptionOverrideModal } from "./subscription-override-modal";

export const SubscriptionTable: React.FC = () => {
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [debouncedSetSearch] = useDebounce(setSearchQuery, 500);

	const { subscriptions, isLoading } = useAdminSubscriptions({
		status: statusFilter,
	});

	const cancelMutation = useCancelSubscriptionMutation();
	const restoreMutation = useRestoreSubscriptionMutation();

	const [inspectingSub, setInspectingSub] = useState<Subscription | null>(
		null
	);
	const [overridingSub, setOverridingSub] = useState<Subscription | null>(
		null
	);
	const [togglingSub, setTogglingSub] = useState<Subscription | null>(null);

	const filteredSubs = useMemo(() => {
		const q = searchQuery.toLowerCase().trim();
		if (!q) {
			return subscriptions;
		}
		return subscriptions.filter(
			(s) =>
				s.id.toLowerCase().includes(q) ||
				s.user_id.toLowerCase().includes(q) ||
				(s.plan_id || "").toLowerCase().includes(q)
		);
	}, [subscriptions, searchQuery]);

	const handleCancelOrRestore = async () => {
		if (!togglingSub) {
			return;
		}
		try {
			if (togglingSub.cancel_at_period_end) {
				await restoreMutation.mutateAsync({
					subscriptionId: togglingSub.id,
				});
			} else {
				await cancelMutation.mutateAsync({
					subscriptionId: togglingSub.id,
					cancelAtPeriodEnd: true,
				});
			}
			setTogglingSub(null);
		} catch {
			// Handled by hook
		}
	};

	const renderTableRow = useCallback((sub: Subscription) => {
		const statusProps = getSubscriptionStatusProps(sub.status);
		return (
			<Table.Row key={sub.id} id={sub.id}>
				<Table.Cell>
					<div className="flex items-center gap-2">
						<Typography
							type="body-sm"
							className="font-mono text-xs font-semibold max-w-24 truncate"
						>
							{sub.id}
						</Typography>
						<CopyButton
							textValue={sub.id}
							aria-label={`Copy ID ${sub.id}`}
							variant="ghost"
							size="sm"
							isIconOnly
						/>
					</div>
				</Table.Cell>
				<Table.Cell>
					<ViewUserPopover
						showSubscription={false}
						userId={sub.user_id}
					>
						<Typography
							type="body-xs"
							className="font-mono select-all hover:underline"
						>
							{sub.user_id}
						</Typography>
					</ViewUserPopover>
				</Table.Cell>
				<Table.Cell>
					<Chip
						size="sm"
						variant="soft"
						color="accent"
						className="capitalize"
					>
						{sub.plan_id}
					</Chip>
				</Table.Cell>
				<Table.Cell>
					{sub.scheduled_tier ? (
						<Chip
							size="sm"
							variant="soft"
							color="warning"
							className="capitalize"
						>
							&rarr; {sub.scheduled_tier}
						</Chip>
					) : (
						<span className="text-muted text-xs">&mdash;</span>
					)}
				</Table.Cell>
				<Table.Cell>
					<Chip size="sm" variant="soft" color={statusProps.color}>
						{statusProps.label}
					</Chip>
				</Table.Cell>
				<Table.Cell>
					<div className="flex flex-col text-xs">
						<span>{formatDate(sub.period_start)}</span>
						<span className="text-muted">
							to {formatDate(sub.period_end)}
						</span>
					</div>
				</Table.Cell>
				<Table.Cell>
					<div className="flex items-center justify-end gap-1.5">
						<Tooltip delay={0}>
							<Button
								variant="outline"
								size="sm"
								onPress={() => setInspectingSub(sub)}
								aria-label="Inspect Subscription"
								isIconOnly
							>
								<Eye aria-hidden />
							</Button>
							<Tooltip.Content>
								<p>View subscription</p>
							</Tooltip.Content>
						</Tooltip>
						<Tooltip delay={0}>
							<Button
								variant="outline"
								size="sm"
								onPress={() => setOverridingSub(sub)}
								aria-label="Override Subscription"
								isIconOnly
							>
								<Gear aria-hidden />
							</Button>
							<Tooltip.Content>
								<p>Override subscription</p>
							</Tooltip.Content>
						</Tooltip>
						<Tooltip delay={0}>
							<Button
								variant={
									sub.cancel_at_period_end
										? "outline"
										: "danger-soft"
								}
								size="sm"
								onPress={() => setTogglingSub(sub)}
							>
								{sub.cancel_at_period_end
									? "Restore"
									: "Cancel"}
							</Button>
							<Tooltip.Content>
								<p>
									{sub.cancel_at_period_end
										? "Restore user subscription"
										: "Cancel user subscription"}
								</p>
							</Tooltip.Content>
						</Tooltip>
					</div>
				</Table.Cell>
			</Table.Row>
		);
	}, []);

	return (
		<div className="flex flex-col gap-4">
			{/* Top Bar with Filter Select, Search, and Cron Trigger */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<SearchField
					name="search"
					value={searchQuery}
					onChange={debouncedSetSearch}
					className="max-w-sm"
					fullWidth
				>
					<Label>Search</Label>
					<SearchField.Group>
						<SearchField.SearchIcon />
						<SearchField.Input placeholder="Search by User ID or Sub ID..." />
						<SearchField.ClearButton />
					</SearchField.Group>
				</SearchField>
				<Select
					aria-label="Filter by status"
					className="w-full sm:w-48"
					value={statusFilter}
					onChange={(key) => setStatusFilter(String(key))}
					selectionMode="single"
				>
					<Label>Filter by status</Label>
					<Select.Trigger>
						<Select.Value />
						<Select.Indicator />
					</Select.Trigger>
					<Select.Popover>
						<ListBox items={SUBSCRIPTION_FILTER_BY_STATUS}>
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
			</div>

			{/* Main Table / Skeletons / Empty */}
			<Table>
				<Table.ScrollContainer>
					<Table.Content aria-label="Subscriptions List">
						<Table.Header>
							<Table.Column id="sub_id" isRowHeader>
								Subscription ID
							</Table.Column>
							<Table.Column id="user">User ID</Table.Column>
							<Table.Column id="tier">Active Tier</Table.Column>
							<Table.Column id="scheduled">
								Scheduled
							</Table.Column>
							<Table.Column id="status">Status</Table.Column>
							<Table.Column id="period">
								Period Dates
							</Table.Column>
							<Table.Column id="actions">
								<span className="sr-only">Actions</span>
							</Table.Column>
						</Table.Header>
						<Table.Body
							items={filteredSubs || []}
							renderEmptyState={() =>
								isLoading ? (
									<TableLoadingState />
								) : (
									<TableEmptyState />
								)
							}
						>
							{(subscription) => renderTableRow(subscription)}
						</Table.Body>
					</Table.Content>
				</Table.ScrollContainer>
			</Table>

			{/* Detail Inspector Modal */}
			<SubscriptionDetailModal
				subscription={inspectingSub}
				isOpen={Boolean(inspectingSub)}
				onOpenChange={(open) => !open && setInspectingSub(null)}
			/>

			{/* Override Modal */}
			<SubscriptionOverrideModal
				subscription={overridingSub}
				isOpen={Boolean(overridingSub)}
				onOpenChange={(open) => !open && setOverridingSub(null)}
			/>

			{/* Cancel / Restore Toggle Confirmation Dialog */}
			<AlertDialog
				isOpen={Boolean(togglingSub)}
				onOpenChange={(open) => !open && setTogglingSub(null)}
			>
				<AlertDialog.Backdrop isDismissable={false}>
					<AlertDialog.Container>
						<AlertDialog.Dialog>
							<AlertDialog.CloseTrigger />
							{/* Optional: Close button */}
							<AlertDialog.Header>
								<AlertDialog.Icon />
								{/* Optional: Status icon */}
								<AlertDialog.Heading>
									{togglingSub?.cancel_at_period_end
										? "Restore Subscription"
										: "Cancel Subscription"}
								</AlertDialog.Heading>
							</AlertDialog.Header>
							<AlertDialog.Body>
								{togglingSub?.cancel_at_period_end ? (
									<div>
										Restore subscription for user{" "}
										<ViewUserPopover
											showSubscription={false}
											userId={togglingSub?.user_id}
										>
											<span className="font-bold hover:underline">
												{togglingSub?.user_id}
											</span>
										</ViewUserPopover>
										? Automated renewal will resume at cycle
										end.
									</div>
								) : (
									<div>
										Set subscription for user
										<ViewUserPopover
											showSubscription={false}
											userId={togglingSub?.user_id}
										>
											<span className="font-bold hover:underline">
												{togglingSub?.user_id}
											</span>
										</ViewUserPopover>{" "}
										to cancel at current period end?
									</div>
								)}
							</AlertDialog.Body>
							<AlertDialog.Footer className="flex justify-end gap-2">
								<Button
									variant="outline"
									onPress={() => setTogglingSub(null)}
								>
									Close
								</Button>
								<Button
									variant={
										togglingSub?.cancel_at_period_end
											? "primary"
											: "danger"
									}
									onPress={handleCancelOrRestore}
									isPending={
										cancelMutation.isPending ||
										restoreMutation.isPending
									}
								>
									{togglingSub?.cancel_at_period_end
										? "Confirm Restore"
										: "Confirm Cancellation"}
								</Button>
							</AlertDialog.Footer>
						</AlertDialog.Dialog>
					</AlertDialog.Container>
				</AlertDialog.Backdrop>
			</AlertDialog>
		</div>
	);
};

SubscriptionTable.displayName = "SubscriptionTable";
