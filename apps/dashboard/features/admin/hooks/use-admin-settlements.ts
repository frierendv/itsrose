"use client";

import { withAuthQuery } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "@heroui/react";
import type { SettlementResult, UsageSettlement } from "@itsrose/auth-usage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "../query-keys";

export interface SettlementFilters {
	/** `YYYY-MM` */
	period?: string;
	tenant_id?: string;
	limit?: number;
}

export interface SettleUsageInput {
	/** `YYYY-MM`; the API defaults to the previous closed month. */
	period?: string;
	/** Issues real provider invoices when true. */
	create_invoices?: boolean;
}

/**
 * Frozen settlement rows, newest period first.
 */
export function useAdminSettlements(filters?: SettlementFilters) {
	const query = useQuery({
		queryKey: adminQueryKeys.usage.settlements(
			filters as Record<string, unknown>
		),
		queryFn: async (): Promise<UsageSettlement[]> => {
			const res = await withAuthQuery(
				authClient.usage.admin.settlements({
					query: {
						period: filters?.period,
						tenant_id: filters?.tenant_id,
						limit: filters?.limit ?? 200,
					},
				})
			);
			return res?.settlements ?? [];
		},
	});

	return {
		...query,
		settlements: query.data ?? [],
	};
}

/**
 * Runs the settlement for a period. Dry run unless `create_invoices` is set.
 */
export function useSettleUsageMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			input: SettleUsageInput
		): Promise<SettlementResult> => {
			const result = await withAuthQuery(
				authClient.usage.admin.settle({
					period: input.period,
					create_invoices: input.create_invoices ?? false,
				})
			);
			if (!result) {
				throw new Error("Settlement returned no data.");
			}
			return result;
		},
		onSuccess: (result) => {
			const invoiced = result.totals.invoices_created;
			toast.success(
				invoiced > 0
					? `Settled ${result.totals.tenants} tenants and issued ${invoiced} invoices.`
					: `Dry run finished for ${result.period}: ${result.totals.tenants} tenants.`
			);
			queryClient.invalidateQueries({
				queryKey: adminQueryKeys.usage.all,
			});
			queryClient.invalidateQueries({
				queryKey: adminQueryKeys.invoices.all,
			});
		},
		onError: (err) => {
			toast.danger(getErrorMessage(err, "Settlement failed."));
		},
	});
}
