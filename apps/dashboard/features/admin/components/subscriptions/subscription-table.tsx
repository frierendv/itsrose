"use client";

import { CopyButton } from "@/components/copy-button";
import type { DataTableFeatures } from "@/components/table";
import { useAdminTableState } from "@/hooks/use-admin-table-state";
import { Eye, Gear } from "@gravity-ui/icons";
import { Button, Chip, Typography } from "@heroui/react";
import type { Subscription } from "@itsrose/auth-billing";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import {
	useAdminSubscriptions,
	useCancelSubscriptionMutation,
	useRestoreSubscriptionMutation,
} from "../../hooks";
import { formatDate, getSubscriptionStatusProps } from "../../utils";
import { SUBSCRIPTION_FILTER_BY_STATUS } from "../constants";
import {
	AdminDataTable,
	AdminSelect,
	ConfirmActionDialog,
	TableToolbar,
} from "../shell";
import { ViewUserPopover } from "../view-popover";
import { SubscriptionInspectDrawer } from "./subscription-inspect-drawer";
import { SubscriptionOverrideModal } from "./subscription-override-modal";

const columnHelper = createColumnHelper<DataTableFeatures, Subscription>();
const FILTER_DEFAULTS = { filters: { status: "all" } };

export const SubscriptionTable: React.FC = () => {
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

	const { subscriptions, isLoading, isError, error, refetch } =
		useAdminSubscriptions({ status, limit: 100 });

	const cancelMutation = useCancelSubscriptionMutation();
	const restoreMutation = useRestoreSubscriptionMutation();

	const [overridingSub, setOverridingSub] = useState<Subscription | null>(
		null
	);
	const [togglingSub, setTogglingSub] = useState<Subscription | null>(null);

	const filteredSubs = useMemo(() => {
		const needle = q.trim().toLowerCase();
		if (!needle) {
			return subscriptions;
		}
		return subscriptions.filter(
			(sub) =>
				sub.id.toLowerCase().includes(needle) ||
				sub.user_id.toLowerCase().includes(needle) ||
				(sub.plan_id || "").toLowerCase().includes(needle)
		);
	}, [q, subscriptions]);

	const inspectedSub =
		subscriptions.find((sub) => sub.id === inspect) ?? null;

	const columns = useMemo(
		() =>
			columnHelper.columns([
				columnHelper.accessor("id", {
					header: "Subscription",
					cell: (info) => (
						<div className="flex items-center gap-2">
							<Typography
								type="body-sm"
								className="max-w-28 truncate font-mono text-xs font-semibold"
							>
								{info.getValue()}
							</Typography>
							<CopyButton
								aria-label={`Copy subscription id ${info.getValue()}`}
								isIconOnly
								size="sm"
								textValue={info.getValue()}
								variant="ghost"
							/>
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
				columnHelper.accessor("plan_id", {
					header: "Tier",
					cell: (info) => (
						<Chip
							className="capitalize"
							color="accent"
							size="sm"
							variant="soft"
						>
							{info.getValue()}
						</Chip>
					),
				}),
				columnHelper.accessor("scheduled_tier", {
					header: "Scheduled",
					cell: (info) =>
						info.getValue() ? (
							<Chip
								className="capitalize"
								color="warning"
								size="sm"
								variant="soft"
							>
								&rarr; {info.getValue()}
							</Chip>
						) : (
							<span className="text-muted text-xs">&mdash;</span>
						),
				}),
				columnHelper.accessor("status", {
					header: "Status",
					cell: (info) => {
						const props = getSubscriptionStatusProps(
							info.getValue()
						);
						return (
							<Chip color={props.color} size="sm" variant="soft">
								{props.label}
							</Chip>
						);
					},
				}),
				columnHelper.accessor("period_end", {
					header: "Period",
					cell: (info) => (
						<div className="flex flex-col text-xs">
							<span>
								{formatDate(info.row.original.period_start)}
							</span>
							<span className="text-muted">
								to {formatDate(info.getValue())}
							</span>
						</div>
					),
				}),
				columnHelper.display({
					id: "actions",
					header: () => <span className="sr-only">Actions</span>,
					cell: (info) => {
						const sub = info.row.original;
						return (
							<div className="flex items-center justify-end gap-1.5">
								<Button
									aria-label="Inspect subscription"
									isIconOnly
									onPress={() => setInspect(sub.id)}
									size="sm"
									variant="outline"
								>
									<Eye aria-hidden />
								</Button>
								<Button
									aria-label="Override subscription"
									isIconOnly
									onPress={() => setOverridingSub(sub)}
									size="sm"
									variant="outline"
								>
									<Gear aria-hidden />
								</Button>
								<Button
									onPress={() => setTogglingSub(sub)}
									size="sm"
									variant={
										sub.cancel_at_period_end
											? "outline"
											: "danger-soft"
									}
								>
									{sub.cancel_at_period_end
										? "Restore"
										: "Cancel"}
								</Button>
							</div>
						);
					},
				}),
			]),
		[setInspect]
	);

	const isFiltered = q.length > 0 || status !== "all";

	return (
		<>
			<AdminDataTable
				aria-label="Subscriptions"
				columns={columns}
				data={filteredSubs}
				error={error}
				emptyLabel="No subscriptions match the current filters."
				isError={isError}
				isLoading={isLoading}
				onRetry={() => void refetch()}
				pageSize={25}
				paginationLabel="subscriptions"
				rowHeaderId="id"
				toolbar={
					<TableToolbar
						filters={
							<AdminSelect
								aria-label="Filter by status"
								label="Filter by status"
								onChange={(value) => setFilter("status", value)}
								options={SUBSCRIPTION_FILTER_BY_STATUS}
								value={status}
							/>
						}
						isFiltered={isFiltered}
						onClear={resetFilters}
						onQueryChange={setQuery}
						query={q}
						searchPlaceholder="Search by subscription, user or tier…"
					/>
				}
			/>

			<SubscriptionInspectDrawer
				isOpen={Boolean(inspectedSub)}
				onOpenChange={(open) => !open && setInspect(null)}
				subscription={inspectedSub}
			/>

			<SubscriptionOverrideModal
				isOpen={Boolean(overridingSub)}
				onOpenChange={(open) => !open && setOverridingSub(null)}
				subscription={overridingSub}
			/>

			<ConfirmActionDialog
				confirmLabel={
					togglingSub?.cancel_at_period_end
						? "Restore subscription"
						: "Cancel at period end"
				}
				description={
					togglingSub?.cancel_at_period_end ? (
						<>
							Restore automatic renewal for{" "}
							<strong>{togglingSub.user_id}</strong>? Renewal
							resumes at the current cycle end.
						</>
					) : (
						<>
							Set the subscription for{" "}
							<strong>{togglingSub?.user_id}</strong> to cancel at
							the current period end? Access continues until the
							period ends.
						</>
					)
				}
				isOpen={Boolean(togglingSub)}
				isPending={
					cancelMutation.isPending || restoreMutation.isPending
				}
				onConfirm={async () => {
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
						// Handled by the hooks.
					}
				}}
				onOpenChange={(open) => !open && setTogglingSub(null)}
				title={
					togglingSub?.cancel_at_period_end
						? "Restore subscription"
						: "Cancel subscription"
				}
				tone={togglingSub?.cancel_at_period_end ? "primary" : "danger"}
			/>
		</>
	);
};

SubscriptionTable.displayName = "SubscriptionTable";
