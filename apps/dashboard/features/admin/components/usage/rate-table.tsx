"use client";

import type { DataTableFeatures } from "@/components/table";
import { useAdminTableState } from "@/hooks/use-admin-table-state";
import { Button, Chip, Typography } from "@heroui/react";
import type { UsageUnitRate } from "@itsrose/auth-usage";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useAdminPlans, useAdminRates } from "../../hooks";
import { buildRateGroups } from "../../models";
import { formatDate, formatIDR } from "../../utils";
import { AdminDataTable, TableToolbar } from "../shell";
import { RateFormModal } from "./rate-form-modal";

const columnHelper = createColumnHelper<DataTableFeatures, UsageUnitRate>();

export const RateTable: React.FC = () => {
	const { q, setQuery, resetFilters } = useAdminTableState();
	const { rates, isLoading, isError, error, refetch } = useAdminRates();
	const { plans } = useAdminPlans();
	const [formOpen, setFormOpen] = useState(false);

	const groups = useMemo(() => buildRateGroups(rates), [rates]);
	const openRates = useMemo(
		() =>
			groups
				.map((group) => group.open_rate)
				.filter((rate): rate is UsageUnitRate => rate !== null),
		[groups]
	);
	const conflictTiers = groups
		.filter((group) => group.has_conflict)
		.map((group) => group.plan_tier);

	const tiers = useMemo(() => {
		const values = new Set<string>();
		for (const plan of plans) {
			values.add(plan.plan_id);
		}
		for (const rate of rates) {
			values.add(rate.plan_tier);
		}
		return [...values];
	}, [plans, rates]);

	const rows = useMemo(() => {
		const needle = q.trim().toLowerCase();
		const sorted = [...rates].sort((left, right) => {
			if (left.plan_tier !== right.plan_tier) {
				return left.plan_tier.localeCompare(right.plan_tier);
			}
			return right.rates_version - left.rates_version;
		});
		if (!needle) {
			return sorted;
		}
		return sorted.filter(
			(rate) =>
				rate.plan_tier.toLowerCase().includes(needle) ||
				rate.unit.toLowerCase().includes(needle)
		);
	}, [q, rates]);

	const columns = useMemo(
		() =>
			columnHelper.columns([
				columnHelper.accessor("plan_tier", {
					header: "Plan tier",
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
				columnHelper.accessor("unit", {
					header: "Unit",
					cell: (info) => (
						<Typography type="body-sm">
							{info.getValue()}
						</Typography>
					),
				}),
				columnHelper.accessor("amount", {
					header: "Price",
					cell: (info) => (
						<Typography type="body-sm">
							{formatIDR(info.getValue())}
							<span className="text-muted">
								/{info.row.original.unit}
							</span>
						</Typography>
					),
				}),
				columnHelper.accessor("rates_version", {
					header: "Version",
					cell: (info) => (
						<Typography type="body-sm" className="tabular-nums">
							{info.getValue()}
						</Typography>
					),
				}),
				columnHelper.accessor("effective_from", {
					header: "Effective from",
					cell: (info) => (
						<Typography type="body-xs">
							{formatDate(info.getValue())}
						</Typography>
					),
				}),
				columnHelper.accessor("effective_to", {
					header: "Effective to",
					cell: (info) =>
						info.getValue() ? (
							<Typography type="body-xs">
								{formatDate(info.getValue())}
							</Typography>
						) : (
							<Chip color="success" size="sm" variant="soft">
								Open
							</Chip>
						),
				}),
				columnHelper.accessor("created_by", {
					header: "Created by",
					cell: (info) => (
						<Typography type="body-xs" className="font-mono">
							{info.getValue() || "—"}
						</Typography>
					),
				}),
			]),
		[]
	);

	return (
		<>
			{conflictTiers.length > 0 ? (
				<div className="rounded-medium border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
					More than one open rate exists for:{" "}
					<strong>{conflictTiers.join(", ")}</strong>. Close the extra
					versions before the next settlement run.
				</div>
			) : null}

			<AdminDataTable
				aria-label="Usage unit rates"
				columns={columns}
				data={rows}
				error={error}
				emptyLabel="No rates yet. Publishing a version seeds the tier pricing."
				isError={isError}
				isLoading={isLoading}
				onRetry={() => void refetch()}
				pageSize={25}
				paginationLabel="rate versions"
				rowHeaderId="plan_tier"
				toolbar={
					<TableToolbar
						isFiltered={q.length > 0}
						onClear={resetFilters}
						onQueryChange={setQuery}
						query={q}
						searchPlaceholder="Search by tier or unit…"
						actions={
							<Button
								isDisabled={tiers.length === 0}
								size="sm"
								onPress={() => setFormOpen(true)}
							>
								New rate version
							</Button>
						}
					/>
				}
			/>

			<RateFormModal
				isOpen={formOpen}
				onOpenChange={setFormOpen}
				openRates={openRates}
				tiers={tiers}
			/>
		</>
	);
};

RateTable.displayName = "RateTable";
