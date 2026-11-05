"use client";

import { withAuthQuery } from "@/lib/api";
import { authClient } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";
import { toast } from "@heroui/react";
import type { FlushUsageResult } from "@itsrose/auth-usage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { adminQueryKeys } from "../query-keys";

export interface FlushUsageInput {
	/** Last N UTC days; ignored when `from`/`to` are set. */
	days?: number;
	/** `YYYY-MM-DD` */
	from?: string;
	/** `YYYY-MM-DD` */
	to?: string;
}

export interface TenantSyncResult {
	scanned: number;
	created: number;
}

/**
 * Projects the hot counters into the durable rollup ledger.
 */
export function useFlushUsageMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			input: FlushUsageInput
		): Promise<FlushUsageResult> => {
			const result = await withAuthQuery(
				authClient.usage.admin.flush({
					days: input.from || input.to ? undefined : input.days,
					from: input.from,
					to: input.to,
				})
			);
			if (!result) {
				throw new Error("Flush returned no data.");
			}
			return result;
		},
		onSuccess: (result) => {
			toast.success(
				`Flushed ${result.rows} rows for ${result.tenants} tenants.`
			);
			queryClient.invalidateQueries({
				queryKey: adminQueryKeys.usage.all,
			});
		},
		onError: (err) => {
			toast.danger(getErrorMessage(err, "Ledger flush failed."));
		},
	});
}

/**
 * Backfills personal tenant rows for users created before metering shipped.
 */
export function useSyncTenantsMutation() {
	return useMutation({
		mutationFn: async (): Promise<TenantSyncResult> => {
			const result = await withAuthQuery(
				authClient.usage.admin.tenants.sync()
			);
			if (!result) {
				throw new Error("Tenant sync returned no data.");
			}
			return result;
		},
		onSuccess: (result) => {
			toast.success(
				`Scanned ${result.scanned} users, created ${result.created} tenants.`
			);
		},
		onError: (err) => {
			toast.danger(getErrorMessage(err, "Tenant sync failed."));
		},
	});
}
