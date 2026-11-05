"use client";

import { CopyButton } from "@/components/copy-button";
import type { DataTableFeatures } from "@/components/table";
import { useAdminTableState } from "@/hooks/use-admin-table-state";
import { Pencil, TrashBin } from "@gravity-ui/icons";
import { Button, Chip, Typography } from "@heroui/react";
import type { ApiPlan } from "@itsrose/auth-billing";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useAdminPlans, useDeletePlanMutation } from "../../hooks";
import { formatIDR, formatUsageNumber } from "../../utils";
import { AdminDataTable, ConfirmActionDialog, TableToolbar } from "../shell";
import { PlanFormModal } from "./plan-form-modal";
import { SeedPlansButton } from "./seed-plans-button";

const columnHelper = createColumnHelper<DataTableFeatures, ApiPlan>();

export const PlanTable: React.FC = () => {
	const { plans, isLoading, isError, error, refetch } = useAdminPlans();
	const { q, setQuery, resetFilters } = useAdminTableState();
	const deleteMutation = useDeletePlanMutation();

	const [form, setForm] = useState<{ open: boolean; plan: ApiPlan | null }>({
		open: false,
		plan: null,
	});
	const [deleting, setDeleting] = useState<ApiPlan | null>(null);

	const filteredPlans = useMemo(() => {
		const needle = q.trim().toLowerCase();
		if (!needle) {
			return plans;
		}
		return plans.filter(
			(plan) =>
				plan.plan_id.toLowerCase().includes(needle) ||
				plan.name.toLowerCase().includes(needle)
		);
	}, [plans, q]);

	const columns = useMemo(
		() =>
			columnHelper.columns([
				columnHelper.accessor("plan_id", {
					header: "Plan",
					cell: (info) => (
						<div className="flex items-center gap-2">
							<Typography
								type="body-sm"
								className="font-mono text-xs font-semibold"
							>
								{info.getValue()}
							</Typography>
							<CopyButton
								aria-label={`Copy plan id ${info.getValue()}`}
								isIconOnly
								size="sm"
								textValue={info.getValue()}
								variant="ghost"
							/>
						</div>
					),
				}),
				columnHelper.accessor("name", {
					header: "Name",
					cell: (info) => (
						<Typography type="body-sm" className="font-medium">
							{info.getValue()}
						</Typography>
					),
				}),
				columnHelper.accessor((row) => row.price.amount, {
					id: "price",
					header: "Price",
					cell: (info) => (
						<Typography type="body-sm">
							{formatIDR(info.getValue())}
							<span className="text-muted">
								/{info.row.original.price.interval}
							</span>
						</Typography>
					),
				}),
				columnHelper.accessor((row) => row.limits.max, {
					id: "rpm",
					header: "Rate limit",
					cell: (info) => (
						<Typography type="body-sm">
							{formatUsageNumber(info.getValue())} RPM
						</Typography>
					),
				}),
				columnHelper.accessor("quota_requests", {
					header: "Monthly quota",
					cell: (info) => {
						const quota = info.getValue();
						return quota === null ? (
							<Chip color="success" size="sm" variant="soft">
								Unlimited
							</Chip>
						) : (
							<Typography type="body-sm">
								{formatUsageNumber(quota)}
							</Typography>
						);
					},
				}),
				columnHelper.accessor((row) => row.features.length, {
					id: "features",
					header: "Features",
					cell: (info) => (
						<Typography type="body-sm" color="muted">
							{info.getValue()}
						</Typography>
					),
				}),
				columnHelper.accessor("highlighted", {
					header: "Badge",
					cell: (info) =>
						info.getValue() ? (
							<Chip color="accent" size="sm" variant="soft">
								Highlighted
							</Chip>
						) : (
							<span className="text-muted text-xs">&mdash;</span>
						),
				}),
				columnHelper.display({
					id: "actions",
					header: () => <span className="sr-only">Actions</span>,
					cell: (info) => {
						const plan = info.row.original;
						return (
							<div className="flex items-center justify-end gap-2">
								<Button
									aria-label={`Edit plan ${plan.plan_id}`}
									isIconOnly
									onPress={() =>
										setForm({ open: true, plan })
									}
									size="sm"
									variant="outline"
								>
									<Pencil aria-hidden />
								</Button>
								<Button
									aria-label={`Delete plan ${plan.plan_id}`}
									isIconOnly
									onPress={() => setDeleting(plan)}
									size="sm"
									variant="outline"
								>
									<TrashBin aria-hidden />
								</Button>
							</div>
						);
					},
				}),
			]),
		[]
	);

	return (
		<>
			<AdminDataTable
				aria-label="Billing plans"
				columns={columns}
				data={filteredPlans}
				error={error}
				emptyLabel="No plans in the catalog yet. Seed the defaults or create a plan."
				isError={isError}
				isLoading={isLoading}
				onRetry={() => void refetch()}
				pageSize={25}
				paginationLabel="plans"
				rowHeaderId="plan_id"
				toolbar={
					<TableToolbar
						isFiltered={q.length > 0}
						onClear={resetFilters}
						onQueryChange={setQuery}
						query={q}
						searchPlaceholder="Search by plan id or name…"
						actions={
							<>
								<SeedPlansButton />
								<Button
									size="sm"
									onPress={() =>
										setForm({ open: true, plan: null })
									}
								>
									New plan
								</Button>
							</>
						}
					/>
				}
			/>

			<PlanFormModal
				isOpen={form.open}
				onOpenChange={(open) =>
					setForm((current) => ({ ...current, open }))
				}
				plan={form.plan}
			/>

			<ConfirmActionDialog
				confirmLabel="Delete plan"
				description={
					<>
						Delete <strong>{deleting?.name}</strong> (
						{deleting?.plan_id}) from the catalog? Existing
						subscriptions keep their tier label, but the plan stops
						being purchasable and falls back to the built-in
						defaults when read.
					</>
				}
				isOpen={Boolean(deleting)}
				isPending={deleteMutation.isPending}
				onConfirm={async () => {
					if (!deleting) {
						return;
					}
					try {
						await deleteMutation.mutateAsync(deleting.plan_id);
						setDeleting(null);
					} catch {
						// Handled by the hook.
					}
				}}
				onOpenChange={(open) => !open && setDeleting(null)}
				title="Delete plan"
			/>
		</>
	);
};

PlanTable.displayName = "PlanTable";
