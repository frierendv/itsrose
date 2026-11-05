"use client";

import { CopyButton } from "@/components/copy-button";
import type { DataTableFeatures } from "@/components/table";
import { useAdminTableState } from "@/hooks/use-admin-table-state";
import { Chip, Typography } from "@heroui/react";
import type { UsageSettlement } from "@itsrose/auth-usage";
import { createColumnHelper } from "@tanstack/react-table";
import { useMemo } from "react";
import { useAdminSettlements } from "../../hooks";
import { buildMonthOptions } from "../../models";
import {
	formatDateTime,
	formatIDR,
	formatUnitsMicro,
	formatUsageNumber,
} from "../../utils";
import { AdminDataTable, AdminSelect, TableToolbar } from "../shell";

const columnHelper = createColumnHelper<DataTableFeatures, UsageSettlement>();
const FILTER_DEFAULTS = { filters: { period: "all" } };

export const SettlementTable: React.FC = () => {
	const { q, filters, setQuery, setFilter, resetFilters } =
		useAdminTableState(FILTER_DEFAULTS);
	const period = filters.period ?? "all";

	const { settlements, isLoading, isError, error, refetch } =
		useAdminSettlements({
			period: period === "all" ? undefined : period,
			limit: 200,
		});

	const monthOptions = useMemo(
		() => [
			{ id: "all", label: "All periods" },
			...buildMonthOptions(new Date(), 6),
		],
		[]
	);

	const rows = useMemo(() => {
		const needle = q.trim().toLowerCase();
		if (!needle) {
			return settlements;
		}
		return settlements.filter((settlement) =>
			settlement.tenant_id.toLowerCase().includes(needle)
		);
	}, [q, settlements]);

	const columns = useMemo(
		() =>
			columnHelper.columns([
				columnHelper.accessor("tenant_id", {
					header: "Tenant",
					cell: (info) => (
						<div className="flex items-center gap-2">
							<Typography
								type="body-xs"
								className="max-w-32 truncate font-mono"
							>
								{info.getValue()}
							</Typography>
							<CopyButton
								aria-label="Copy tenant id"
								isIconOnly
								size="sm"
								textValue={info.getValue()}
								variant="ghost"
							/>
						</div>
					),
				}),
				columnHelper.accessor("period", {
					header: "Period",
					cell: (info) => (
						<Typography type="body-sm">
							{info.getValue()}
						</Typography>
					),
				}),
				columnHelper.accessor("requests", {
					header: "Requests",
					cell: (info) => (
						<Typography type="body-sm" className="tabular-nums">
							{formatUsageNumber(info.getValue())}
						</Typography>
					),
				}),
				columnHelper.accessor("units_micro", {
					header: "Units",
					cell: (info) => (
						<Typography type="body-sm" className="tabular-nums">
							{formatUnitsMicro(info.getValue())}
						</Typography>
					),
				}),
				columnHelper.accessor("amount", {
					header: "Amount",
					cell: (info) => (
						<Typography type="body-sm">
							{formatIDR(info.getValue())}
						</Typography>
					),
				}),
				columnHelper.accessor("rates_version", {
					header: "Rate",
					cell: (info) => (
						<Typography type="body-xs" className="tabular-nums">
							{info.getValue() ?? "—"}
						</Typography>
					),
				}),
				columnHelper.accessor("invoice_id", {
					header: "Invoice",
					cell: (info) =>
						info.getValue() ? (
							<Typography type="body-xs" className="font-mono">
								{info.getValue()}
							</Typography>
						) : (
							<Chip color="warning" size="sm" variant="soft">
								Not invoiced
							</Chip>
						),
				}),
				columnHelper.accessor("computed_at", {
					header: "Computed",
					cell: (info) => (
						<Typography type="body-xs">
							{formatDateTime(info.getValue())}
						</Typography>
					),
				}),
			]),
		[]
	);

	const isFiltered = q.length > 0 || period !== "all";

	return (
		<AdminDataTable
			aria-label="Usage settlements"
			caption="Settlements are frozen rows: re-running a period returns the stored result instead of creating a new one."
			columns={columns}
			data={rows}
			emptyLabel="No settlements frozen for this period yet."
			error={error}
			isError={isError}
			isLoading={isLoading}
			onRetry={() => void refetch()}
			pageSize={25}
			paginationLabel="settlements"
			rowHeaderId="tenant_id"
			toolbar={
				<TableToolbar
					filters={
						<AdminSelect
							aria-label="Filter by period"
							label="Filter by period"
							onChange={(value) => setFilter("period", value)}
							options={monthOptions}
							value={period}
						/>
					}
					isFiltered={isFiltered}
					onClear={resetFilters}
					onQueryChange={setQuery}
					query={q}
					searchPlaceholder="Search by tenant id…"
				/>
			}
		/>
	);
};

SettlementTable.displayName = "SettlementTable";
